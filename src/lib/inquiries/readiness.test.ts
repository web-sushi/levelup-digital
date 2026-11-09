import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readBrevoMailConfig } from "@/lib/inquiries/brevo-delivery";
import { createInquiryRuntime, createPreparedInquiryRuntime } from "@/lib/inquiries/config";
import { UnavailableInquiryDelivery } from "@/lib/inquiries/delivery";
import { publicInquirySubmissionsAvailable } from "@/lib/inquiries/public-availability";
import {
  assessInquiryActivation,
  CANONICAL_SITE_ORIGIN,
  EXPECTED_BREVO_NOTIFICATION_EMAIL,
  EXPECTED_BREVO_SENDER_EMAIL,
  EXPECTED_BREVO_SENDER_NAME,
  resolvePublicInquirySubmissionsAvailable,
} from "@/lib/inquiries/readiness";
import { BrevoInquiryDelivery } from "@/lib/inquiries/brevo-delivery";
import { UnavailableRateLimiter } from "@/lib/inquiries/abuse-protection";
import { UpstashInquiryIdempotency, UpstashInquiryRateLimiter } from "@/lib/inquiries/redis-store";

const SECRETS = {
  INQUIRY_RATE_LIMIT_KEY_SECRET: "rate-limit-secret-value",
  INQUIRY_IDEMPOTENCY_KEY_SECRET: "idempotency-secret-value",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "example-token",
  BREVO_API_KEY: "synthetic-brevo-key-value",
  BREVO_SENDER_EMAIL: EXPECTED_BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME: EXPECTED_BREVO_SENDER_NAME,
  INQUIRY_NOTIFICATION_EMAIL: EXPECTED_BREVO_NOTIFICATION_EMAIL,
  INQUIRY_TRUSTED_ORIGINS: CANONICAL_SITE_ORIGIN,
} as const;

function env(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "production" as const,
    INQUIRY_SUBMISSIONS_ENABLED: "false",
    INQUIRY_ACTIVATION_GATE: "disabled",
    ...SECRETS,
    ...overrides,
  };
}

describe("inquiry activation readiness", () => {
  it("classifies a complete disabled configuration without attaching adapters", () => {
    const assessment = assessInquiryActivation(env());
    assert.equal(assessment.state, "configured");
    assert.equal(assessment.configurationComplete, true);
    assert.deepEqual(assessment.missing, []);
    assert.deepEqual(assessment.invalid, []);
    assert.equal(assessment.submissionsEnabled, false);
    assert.equal(assessment.activationGate, "disabled");
    assert.equal(assessment.publicPageEnabled, false);
    assert.equal(assessment.publicRouteUsesLiveAdapters, false);
    assert.equal(assessment.brevoAuthenticationVerified, false);
    assert.equal(assessment.inboxDeliveryVerified, false);
    assert.equal(publicInquirySubmissionsAvailable, false);
    assert.equal(resolvePublicInquirySubmissionsAvailable(env()), false);

    const runtime = createInquiryRuntime({
      ...env({ INQUIRY_SUBMISSIONS_ENABLED: "true", INQUIRY_ACTIVATION_GATE: "launch" }),
      INQUIRY_DELIVERY: "mock",
      INQUIRY_USE_REDIS: "true",
    });
    assert.equal(runtime.idempotency ?? null, null);
    assert.equal(runtime.delivery instanceof UnavailableInquiryDelivery, true);
    assert.equal(runtime.rateLimiter instanceof UnavailableRateLimiter, true);
  });

  it("fails closed when only Brevo or only Redis is configured", () => {
    const brevoOnly = assessInquiryActivation({
      NODE_ENV: "production",
      INQUIRY_SUBMISSIONS_ENABLED: "false",
      INQUIRY_ACTIVATION_GATE: "disabled",
      BREVO_API_KEY: SECRETS.BREVO_API_KEY,
      BREVO_SENDER_EMAIL: SECRETS.BREVO_SENDER_EMAIL,
      BREVO_SENDER_NAME: SECRETS.BREVO_SENDER_NAME,
      INQUIRY_NOTIFICATION_EMAIL: SECRETS.INQUIRY_NOTIFICATION_EMAIL,
    });
    assert.equal(brevoOnly.state, "disabled");
    assert.equal(brevoOnly.missing.includes("UPSTASH_REDIS_REST_URL"), true);
    assert.equal(brevoOnly.missing.includes("BREVO_API_KEY"), false);

    const redisOnly = assessInquiryActivation({
      NODE_ENV: "production",
      INQUIRY_SUBMISSIONS_ENABLED: "false",
      INQUIRY_ACTIVATION_GATE: "disabled",
      UPSTASH_REDIS_REST_URL: SECRETS.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: SECRETS.UPSTASH_REDIS_REST_TOKEN,
    });
    assert.equal(redisOnly.state, "disabled");
    assert.equal(redisOnly.missing.includes("BREVO_API_KEY"), true);
    assert.equal(redisOnly.missing.includes("UPSTASH_REDIS_REST_URL"), false);
  });

  it("rejects reused secrets, non-HTTPS origins, wildcards, and localhost", () => {
    const reused = assessInquiryActivation(env({
      INQUIRY_IDEMPOTENCY_KEY_SECRET: SECRETS.INQUIRY_RATE_LIMIT_KEY_SECRET,
    }));
    assert.equal(reused.state, "misconfigured");
    assert.equal(reused.invalid.includes("INQUIRY_IDEMPOTENCY_KEY_SECRET"), true);

    const httpOrigin = assessInquiryActivation(env({
      INQUIRY_TRUSTED_ORIGINS: "http://levelup-digital.dev",
    }));
    assert.equal(httpOrigin.invalid.includes("INQUIRY_TRUSTED_ORIGINS"), true);

    const wildcard = assessInquiryActivation(env({
      INQUIRY_TRUSTED_ORIGINS: "https://*.vercel.app",
    }));
    assert.equal(wildcard.invalid.includes("INQUIRY_TRUSTED_ORIGINS"), true);

    const localhost = assessInquiryActivation(env({
      INQUIRY_TRUSTED_ORIGINS: "https://localhost:3000",
    }));
    assert.equal(localhost.invalid.includes("INQUIRY_TRUSTED_ORIGINS"), true);
  });

  it("keeps an unknown activation gate from opening the prepared runtime", () => {
    const assessment = assessInquiryActivation(env({ INQUIRY_ACTIVATION_GATE: "yes" }));
    assert.equal(assessment.state, "misconfigured");
    assert.equal(assessment.activationGate, "invalid");
    const runtime = createPreparedInquiryRuntime(env({ INQUIRY_ACTIVATION_GATE: "yes" }));
    assert.equal(runtime.delivery instanceof UnavailableInquiryDelivery, true);
    assert.equal(runtime.idempotency ?? null, null);
  });

  it("accepts the business sender identity with a synthetic API key", () => {
    const config = readBrevoMailConfig({
      BREVO_API_KEY: SECRETS.BREVO_API_KEY,
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

describe("prepared inquiry runtime", () => {
  it("builds Redis and Brevo only for an explicit testing gate and does not call them", async () => {
    let fetches = 0;
    const fetchImpl = async (url: string) => {
      fetches += 1;
      assert.equal(url, "https://api.brevo.com/v3/smtp/email");
      return new Response(JSON.stringify({ messageId: "<synthetic@example.com>" }), { status: 201 });
    };
    const testing = assessInquiryActivation(env({ INQUIRY_ACTIVATION_GATE: "testing" }));
    assert.equal(testing.state, "ready_for_controlled_testing");
    const runtime = createPreparedInquiryRuntime(env({ INQUIRY_ACTIVATION_GATE: "testing" }), { fetchImpl });
    assert.equal(fetches, 0);
    assert.equal(runtime.submissionsEnabled, false);
    assert.equal(runtime.rateLimiter instanceof UpstashInquiryRateLimiter, true);
    assert.equal(runtime.idempotency instanceof UpstashInquiryIdempotency, true);
    assert.equal(runtime.delivery instanceof BrevoInquiryDelivery, true);
    assert.deepEqual([...runtime.trustedOrigins], [CANONICAL_SITE_ORIGIN]);
    assert.equal(runtime.allowDevelopmentOrigins, false);

    const closed = createInquiryRuntime(env({ INQUIRY_ACTIVATION_GATE: "testing", INQUIRY_SUBMISSIONS_ENABLED: "true" }));
    assert.equal(closed.delivery instanceof UnavailableInquiryDelivery, true);
    assert.equal(fetches, 0);
  });

  it("keeps the launch gate off the public page and the public runtime", () => {
    const launchEnv = env({
      INQUIRY_ACTIVATION_GATE: "launch",
      INQUIRY_SUBMISSIONS_ENABLED: "true",
    });
    const assessment = assessInquiryActivation(launchEnv);
    assert.equal(assessment.state, "ready_for_launch_review");
    assert.equal(assessment.brevoAuthenticationVerified, false);
    assert.equal(resolvePublicInquirySubmissionsAvailable(launchEnv), false);
    const prepared = createPreparedInquiryRuntime(launchEnv, {
      fetchImpl: async () => {
        throw new Error("Brevo must not be called");
      },
    });
    assert.equal(prepared.delivery instanceof BrevoInquiryDelivery, true);
    assert.equal(createInquiryRuntime(launchEnv).delivery instanceof UnavailableInquiryDelivery, true);
  });

  it("does not trust a Vercel preview origin unless it is listed exactly", () => {
    const runtime = createPreparedInquiryRuntime(env({ INQUIRY_ACTIVATION_GATE: "testing" }), {
      fetchImpl: async () => {
        throw new Error("Brevo must not be called");
      },
    });
    assert.equal(runtime.trustedOrigins.includes("https://preview.vercel.app"), false);
    assert.equal(runtime.trustedOrigins.includes(CANONICAL_SITE_ORIGIN), true);
  });

  it("ignores an injected delivery when the activation gate is disabled", () => {
    let delivered = 0;
    const runtime = createPreparedInquiryRuntime(env(), {
      delivery: {
        async deliver() {
          delivered += 1;
          return { status: "accepted" as const };
        },
      },
    });
    assert.equal(runtime.delivery instanceof UnavailableInquiryDelivery, true);
    assert.equal(delivered, 0);
    assert.equal(runtime.idempotency ?? null, null);
  });
});
