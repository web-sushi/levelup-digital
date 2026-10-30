import {
  hashClientKey,
  honeypotField,
  honeypotTriggered,
  isOriginAllowed,
  trustedClientAddress,
} from "@/lib/inquiries/abuse-protection";
import { createInquiryRuntime } from "@/lib/inquiries/config";
import { parseJsonObject, readLimitedBody } from "@/lib/inquiries/parse";
import { errorResponse, inquiryJson, messages } from "@/lib/inquiries/responses";
import { INQUIRY_FIELDS } from "@/lib/inquiries/schema";
import type { InquiryRuntime } from "@/lib/inquiries/types";
import { unexpectedReferenceKeys, validateInquiry } from "@/lib/inquiries/validation";

const allowedFields = new Set<string>(INQUIRY_FIELDS);

function acceptsJson(contentType: string | null) {
  if (!contentType) {
    return false;
  }
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

function unexpectedTopLevelFields(value: Record<string, unknown>) {
  return Object.keys(value).filter((key) => !allowedFields.has(key));
}

export async function handleInquiryPost(request: Request, runtime: InquiryRuntime = createInquiryRuntime()) {
  try {
    if (!acceptsJson(request.headers.get("content-type"))) {
      return errorResponse(415, "UNSUPPORTED_MEDIA_TYPE", messages.media);
    }

    const body = await readLimitedBody(request);
    if (!body.ok) {
      if (body.reason === "too-large") {
        return errorResponse(413, "PAYLOAD_TOO_LARGE", messages.invalid);
      }
      return errorResponse(400, "INVALID_REQUEST", messages.invalid);
    }

    const parsed = parseJsonObject(body.text);
    if (!parsed.ok) {
      return errorResponse(400, "INVALID_REQUEST", messages.invalid);
    }

    if (unexpectedTopLevelFields(parsed.value).length > 0 || unexpectedReferenceKeys(parsed.value.references)) {
      return errorResponse(400, "INVALID_REQUEST", messages.invalid);
    }

    const honeypot = parsed.value[honeypotField()];
    if (honeypot !== undefined && typeof honeypot !== "string") {
      return errorResponse(400, "INVALID_REQUEST", messages.invalid);
    }

    if (!isOriginAllowed(request.headers.get("origin"), runtime.trustedOrigins, runtime.allowDevelopmentOrigins)) {
      return errorResponse(403, "FORBIDDEN_ORIGIN", messages.invalid);
    }

    if (honeypotTriggered(honeypot)) {
      return errorResponse(400, "INVALID_REQUEST", messages.invalid);
    }

    const requiredText = ["projectType", "budget", "timeline", "name", "email"] as const;
    for (const field of requiredText) {
      if (parsed.value[field] !== undefined && typeof parsed.value[field] !== "string") {
        return errorResponse(400, "INVALID_REQUEST", messages.invalid);
      }
    }

    const validated = validateInquiry(parsed.value);
    if (!validated.ok) {
      return errorResponse(422, "VALIDATION_ERROR", messages.validation, validated.fieldErrors);
    }

    if (!runtime.submissionsEnabled) {
      return errorResponse(503, "SUBMISSIONS_UNAVAILABLE", messages.unavailable);
    }

    const address = trustedClientAddress(request.headers);
    if (!address || !runtime.rateLimitKeySecret) {
      return errorResponse(503, "RATE_LIMIT_UNAVAILABLE", messages.unavailable);
    }

    const limit = await runtime.rateLimiter.consume(hashClientKey(address, runtime.rateLimitKeySecret));
    if (limit.status === "unavailable") {
      return errorResponse(503, "RATE_LIMIT_UNAVAILABLE", messages.unavailable);
    }
    if (limit.status === "limited") {
      return errorResponse(429, "RATE_LIMITED", messages.rateLimited, undefined, {
        "retry-after": String(limit.retryAfterSeconds),
      });
    }

    const delivery = await runtime.delivery.deliver(validated.inquiry);
    if (delivery.status !== "accepted") {
      return errorResponse(503, "DELIVERY_UNAVAILABLE", messages.unavailable);
    }

    return inquiryJson(200, { ok: true });
  } catch {
    console.error("inquiry request failed");
    return errorResponse(500, "INTERNAL_ERROR", messages.invalid);
  }
}
