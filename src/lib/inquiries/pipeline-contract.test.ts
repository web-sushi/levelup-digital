import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInquiryDraft, type InquiryDraft } from "@/components/contact/inquiry-model";
import {
  interpretInquiryResponse,
  toInquiryRequest,
  validateInquiryDraft,
} from "@/lib/inquiries/client";
import { handleInquiryPost } from "@/lib/inquiries/handler";
import { createMemoryInquiryInfrastructure } from "@/lib/inquiries/redis-store";
import { INQUIRY_FIELDS } from "@/lib/inquiries/schema";
import type { DeliveryResult, InquiryDelivery, InquiryRuntime, ValidatedInquiry } from "@/lib/inquiries/types";

const KEY = "pipeline-contract-key";

class ScriptedDelivery implements InquiryDelivery {
  readonly inquiries: ValidatedInquiry[] = [];
  private readonly result: DeliveryResult;

  constructor(result: DeliveryResult) {
    this.result = result;
  }

  async deliver(inquiry: ValidatedInquiry) {
    this.inquiries.push(inquiry);
    return this.result;
  }
}

function draft(): InquiryDraft {
  const base = createInquiryDraft();
  return {
    ...base,
    projectType: "application",
    budget: "range-200",
    timeline: "quarter",
    name: "  Pipeline Test  ",
    email: " Pipeline-Test@Example.com ",
    business: " Example Studio ",
    details: " A synthetic description. ",
    references: [{ id: "local-id", url: " https://example.com/work ", note: " Layout " }],
  };
}

function runtime(delivery: InquiryDelivery): InquiryRuntime {
  const infrastructure = createMemoryInquiryInfrastructure();
  return {
    submissionsEnabled: true,
    trustedOrigins: ["https://levelup-digital.dev"],
    allowDevelopmentOrigins: false,
    rateLimitKeySecret: "test-rate-limit-secret",
    idempotencyKeySecret: "test-idempotency-secret",
    rateLimiter: infrastructure.rateLimiter,
    idempotency: infrastructure.idempotency,
    delivery,
  };
}

function requestFor(body: unknown) {
  return new Request("https://levelup-digital.dev/api/inquiries", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://levelup-digital.dev",
      "idempotency-key": KEY,
      "x-vercel-forwarded-for": "203.0.113.40",
    },
    body: JSON.stringify(body),
  });
}

describe("wizard and handler contract", () => {
  it("maps a complete draft onto the handler schema and a success response", async () => {
    const current = draft();
    assert.equal(validateInquiryDraft(current, false).status, "validation_error");
    assert.equal(validateInquiryDraft(current, true).status, "ready");
    const body = toInquiryRequest(current, "");
    assert.ok(body);
    assert.equal(Object.keys(body).every((key) => (INQUIRY_FIELDS as readonly string[]).includes(key)), true);
    assert.equal("privacy" in body, false);
    assert.equal("id" in body, false);
    assert.equal(body.companyWebsite, "");
    assert.equal(body.name, "Pipeline Test");
    assert.equal(body.references?.[0]?.url, "https://example.com/work");

    const delivery = new ScriptedDelivery({ status: "accepted", confirmation: "accepted" });
    const response = await handleInquiryPost(requestFor(body), runtime(delivery));
    assert.equal(response.headers.get("cache-control"), "no-store");
    const interpreted = await interpretInquiryResponse(response, current);
    assert.deepEqual(interpreted, { status: "success", confirmation: "accepted" });
    assert.equal(delivery.inquiries.length, 1);
    assert.equal(delivery.inquiries[0]?.projectType, "application");
    assert.equal(delivery.inquiries[0]?.budget, "range-200");
    assert.equal(delivery.inquiries[0]?.timeline, "quarter");
    assert.equal(delivery.inquiries[0]?.email, "Pipeline-Test@example.com");
    assert.equal(delivery.inquiries[0]?.business, "Example Studio");
    assert.equal(delivery.inquiries[0]?.details, "A synthetic description.");
    assert.deepEqual(delivery.inquiries[0]?.references, [{ url: "https://example.com/work", note: "Layout" }]);
  });

  it("maps a handler validation error back onto the email field", async () => {
    const current = draft();
    const body = toInquiryRequest(current, "");
    assert.ok(body);
    const delivery = new ScriptedDelivery({ status: "accepted", confirmation: "accepted" });
    const response = await handleInquiryPost(requestFor({ ...body, email: "not-an-email" }), runtime(delivery));
    const interpreted = await interpretInquiryResponse(response, current);
    assert.equal(interpreted.status, "validation_error");
    if (interpreted.status === "validation_error") {
      assert.equal(typeof interpreted.errors.email, "string");
      assert.equal(interpreted.step, 3);
    }
    assert.equal(delivery.inquiries.length, 0);
  });
});
