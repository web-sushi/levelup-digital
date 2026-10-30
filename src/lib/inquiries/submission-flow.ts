import { randomBytes } from "node:crypto";
import { hashClientKey, trustedClientAddress } from "@/lib/inquiries/abuse-protection";
import { fingerprintInquiry, hashIdempotencyKey, parseIdempotencyKey } from "@/lib/inquiries/idempotency";
import { errorResponse, inquiryJson, messages } from "@/lib/inquiries/responses";
import type { DeliveryResult, InquiryRuntime, ValidatedInquiry } from "@/lib/inquiries/types";

function acceptedResponse(confirmation: "accepted" | "rejected" | "unknown" | undefined) {
  if (confirmation) {
    return inquiryJson(200, { ok: true, confirmation });
  }
  return inquiryJson(200, { ok: true });
}

function fromDelivery(delivery: DeliveryResult) {
  if (delivery.status === "accepted") {
    return {
      state: "accepted" as const,
      confirmation: delivery.confirmation ?? ("-" as const),
      category: delivery.confirmationCategory ?? "-",
      response: acceptedResponse(delivery.confirmation),
    };
  }
  if (delivery.status === "unknown") {
    return {
      state: "unknown" as const,
      confirmation: "-" as const,
      category: delivery.category ?? "unknown",
      response: errorResponse(503, "DELIVERY_OUTCOME_UNKNOWN", messages.outcomeUnknown),
    };
  }
  return {
    state: "rejected" as const,
    confirmation: "-" as const,
    category: delivery.category ?? delivery.status,
    response: errorResponse(503, "DELIVERY_UNAVAILABLE", messages.unavailable),
  };
}

export async function submitWithIdempotency(request: Request, runtime: InquiryRuntime, inquiry: ValidatedInquiry) {
  const idempotency = runtime.idempotency;
  if (!idempotency) {
    return errorResponse(503, "INQUIRY_STORAGE_UNAVAILABLE", messages.unavailable);
  }

  const address = trustedClientAddress(request.headers);
  if (!address || !runtime.rateLimitKeySecret) {
    return errorResponse(503, "RATE_LIMIT_UNAVAILABLE", messages.unavailable);
  }
  if (!runtime.idempotencyKeySecret) {
    return errorResponse(503, "INQUIRY_STORAGE_UNAVAILABLE", messages.unavailable);
  }

  const clientHash = hashClientKey(address, runtime.rateLimitKeySecret);
  const idempotencyKey = parseIdempotencyKey(request.headers.get("idempotency-key"));
  if (!idempotencyKey) {
    const limit = await runtime.rateLimiter.consume(clientHash);
    if (limit.status === "unavailable") {
      return errorResponse(503, "INQUIRY_STORAGE_UNAVAILABLE", messages.unavailable);
    }
    if (limit.status === "limited") {
      return errorResponse(429, "RATE_LIMITED", messages.rateLimited, undefined, {
        "retry-after": String(limit.retryAfterSeconds),
      });
    }
    return errorResponse(400, "INVALID_IDEMPOTENCY_KEY", messages.idempotencyKey);
  }

  const owner = randomBytes(16).toString("hex");
  const claimed = await idempotency.begin({
    clientHash,
    idempotencyHash: hashIdempotencyKey(idempotencyKey, runtime.idempotencyKeySecret),
    fingerprint: fingerprintInquiry(inquiry),
    owner,
  });

  if (claimed.status === "unavailable") {
    return errorResponse(503, "INQUIRY_STORAGE_UNAVAILABLE", messages.unavailable);
  }
  if (claimed.status === "limited") {
    return errorResponse(429, "RATE_LIMITED", messages.rateLimited, undefined, {
      "retry-after": String(claimed.retryAfterSeconds),
    });
  }
  if (claimed.status === "conflict") {
    return errorResponse(409, "IDEMPOTENCY_CONFLICT", messages.idempotencyConflict);
  }
  if (claimed.status === "processing") {
    return errorResponse(409, "INQUIRY_PROCESSING", messages.processing);
  }
  if (claimed.status === "replay_accepted") {
    return acceptedResponse(claimed.confirmation);
  }
  if (claimed.status === "replay_rejected") {
    return errorResponse(503, "DELIVERY_UNAVAILABLE", messages.unavailable);
  }
  if (claimed.status === "replay_unknown") {
    return errorResponse(503, "DELIVERY_OUTCOME_UNKNOWN", messages.outcomeUnknown);
  }

  let delivery: DeliveryResult;
  try {
    delivery = await runtime.delivery.deliver(inquiry);
  } catch {
    delivery = { status: "unknown", category: "network" };
  }

  const mapped = fromDelivery(delivery);
  const finalized = await idempotency.finalize({
    idempotencyHash: hashIdempotencyKey(idempotencyKey, runtime.idempotencyKeySecret),
    owner,
    state: mapped.state,
    confirmation: mapped.confirmation,
    category: mapped.category,
  });
  if (finalized !== "finalized") {
    return errorResponse(503, "IDEMPOTENCY_PERSISTENCE_FAILED", messages.persistenceFailed);
  }
  return mapped.response;
}
