import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readBrevoMailConfig } from "@/lib/inquiries/brevo-delivery";
import { createInquiryRuntime } from "@/lib/inquiries/config";
import { UnavailableInquiryDelivery } from "@/lib/inquiries/delivery";
import { publicInquirySubmissionsAvailable } from "@/lib/inquiries/public-availability";
import {
  assessInquiryActivation,
  EXPECTED_BREVO_NOTIFICATION_EMAIL,
  EXPECTED_BREVO_SENDER_EMAIL,
  EXPECTED_BREVO_SENDER_NAME,
} from "@/lib/inquiries/readiness";

const COMPLETE = {
  NODE_ENV: "production",
  INQUIRY_SUBMISSIONS_ENABLED: "true",
  INQUIRY_TRUSTED_ORIGINS: "https://levelup-digital.dev",
  INQUIRY_RATE_LIMIT_KEY_SECRET: "rate-limit-secret-value",
  INQUIRY_IDEMPOTENCY_KEY_SECRET: "idempotency-secret-value",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "example-token",
  BREVO_API_KEY: "synthetic-brevo-key-value",
  BREVO_SENDER_EMAIL: EXPECTED_BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME: EXPECTED_BREVO_SENDER_NAME,
  INQUIRY_NOTIFICATION_EMAIL: EXPECTED_BREVO_NOTIFICATION_EMAIL,
} as const;

describe("inquiry activation readiness", () => {
  it("keeps a fully configured environment from attaching public adapters", () => {
    const assessment = assessInquiryActivation(COMPLETE);
    assert.equal(assessment.serverConfigured, true);
    assert.deepEqual(assessment.missing, []);
    assert.equal(assessment.publicPageEnabled, false);
    assert.equal(assessment.adaptersAttached, false);
    assert.equal(publicInquirySubmissionsAvailable, false);

    const runtime = createInquiryRuntime({
      ...COMPLETE,
      INQUIRY_DELIVERY: "mock",
      INQUIRY_USE_REDIS: "true",
    });
    assert.equal(runtime.submissionsEnabled, true);
    assert.equal(runtime.idempotency ?? null, null);
    assert.equal(runtime.delivery instanceof UnavailableInquiryDelivery, true);
  });

  it("fails closed when only Brevo or only Redis is configured", () => {
    const brevoOnly = assessInquiryActivation({
      NODE_ENV: "production",
      BREVO_API_KEY: COMPLETE.BREVO_API_KEY,
      BREVO_SENDER_EMAIL: COMPLETE.BREVO_SENDER_EMAIL,
      BREVO_SENDER_NAME: COMPLETE.BREVO_SENDER_NAME,
      INQUIRY_NOTIFICATION_EMAIL: COMPLETE.INQUIRY_NOTIFICATION_EMAIL,
    });
    assert.equal(brevoOnly.serverConfigured, false);
    assert.equal(brevoOnly.missing.includes("redis"), true);
    assert.equal(brevoOnly.missing.includes("brevo"), false);
    assert.equal(brevoOnly.adaptersAttached, false);

    const redisOnly = assessInquiryActivation({
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: COMPLETE.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: COMPLETE.UPSTASH_REDIS_REST_TOKEN,
    });
    assert.equal(redisOnly.serverConfigured, false);
    assert.equal(redisOnly.missing.includes("brevo"), true);
    assert.equal(redisOnly.missing.includes("redis"), false);
    assert.equal(redisOnly.adaptersAttached, false);
  });

  it("rejects reused secrets and a non-HTTPS origin", () => {
    const reused = assessInquiryActivation({
      ...COMPLETE,
      INQUIRY_IDEMPOTENCY_KEY_SECRET: COMPLETE.INQUIRY_RATE_LIMIT_KEY_SECRET,
    });
    assert.equal(reused.missing.includes("secrets_not_distinct"), true);

    const httpOrigin = assessInquiryActivation({
      ...COMPLETE,
      INQUIRY_TRUSTED_ORIGINS: "http://levelup-digital.dev",
    });
    assert.equal(httpOrigin.missing.includes("trusted_origins"), true);
  });

  it("accepts the business sender identity with a synthetic API key", () => {
    const config = readBrevoMailConfig({
      BREVO_API_KEY: COMPLETE.BREVO_API_KEY,
      BREVO_SENDER_EMAIL: EXPECTED_BREVO_SENDER_EMAIL,
      BREVO_SENDER_NAME: EXPECTED_BREVO_SENDER_NAME,
      INQUIRY_NOTIFICATION_EMAIL: EXPECTED_BREVO_NOTIFICATION_EMAIL,
    });
    assert.equal(config.ok, true);
    if (config.ok) {
      assert.equal(config.config.senderEmail, EXPECTED_BREVO_SENDER_EMAIL);
      assert.equal(config.config.senderName, EXPECTED_BREVO_SENDER_NAME);
      assert.equal(config.config.notificationEmail, EXPECTED_BREVO_NOTIFICATION_EMAIL);
    }
    assert.equal(readBrevoMailConfig({ BREVO_SENDER_EMAIL: EXPECTED_BREVO_SENDER_EMAIL }).ok, false);
  });
});
