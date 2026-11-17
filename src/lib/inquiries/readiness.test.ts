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
import { handleInquiryPost } from "@/lib/inquiries/handler";
import { UpstashInquiryIdempotency, UpstashInquiryRateLimiter, UpstashInquiryRedis } from "@/lib/inquiries/redis-store";

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
    assert.equal(publicInquirySubmissionsAvailable, true);
    assert.equal(resolvePublicInquirySubmissionsAvailable(env()), false);

    const runtime = createInquiryRuntime(env());
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

  it("opens the public page and public runtime for a complete launch configuration", () => {
    const launchEnv = env({
      INQUIRY_ACTIVATION_GATE: "launch",
      INQUIRY_SUBMISSIONS_ENABLED: "true",
    });
    const assessment = assessInquiryActivation(launchEnv);
    assert.equal(assessment.state, "ready_for_launch_review");
    assert.equal(assessment.brevoAuthenticationVerified, false);
    assert.equal(resolvePublicInquirySubmissionsAvailable(launchEnv), true);
    const prepared = createPreparedInquiryRuntime(launchEnv, {
      fetchImpl: async () => {
        throw new Error("Brevo must not be called");
      },
    });
    assert.equal(prepared.delivery instanceof BrevoInquiryDelivery, true);
    const opened = createInquiryRuntime(launchEnv);
    assert.equal(opened.delivery instanceof BrevoInquiryDelivery, true);
    assert.equal(opened.submissionsEnabled, true);
    const held = createInquiryRuntime(launchEnv, { ownerActivation: false });
    assert.equal(held.delivery instanceof UnavailableInquiryDelivery, true);
    assert.equal(held.submissionsEnabled, false);
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

class ScriptedRedis extends UpstashInquiryRedis {
  calls = 0;
  private readonly results: unknown[];

  constructor(results: unknown[]) {
    super("https://example.upstash.io", "example-token", async () => {
      throw new Error("redis network disabled");
    });
    this.results = results;
  }

  async evaluate() {
    this.calls += 1;
    return this.results.shift() ?? null;
  }
}

function launchRequest(body: Record<string, string> = {}) {
  return new Request("https://levelup-digital.dev/api/inquiries", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: CANONICAL_SITE_ORIGIN,
      "idempotency-key": "activation-key-0001",
      "x-vercel-forwarded-for": "203.0.113.10",
    },
    body: JSON.stringify({
      projectType: "website",
      budget: "range-100",
      timeline: "month",
      name: "Ada Lovelace",
      email: "ada@example.com",
      companyWebsite: "",
      ...body,
    }),
  });
}

describe("public inquiry runtime selection", () => {
  const launchEnv = env({
    INQUIRY_ACTIVATION_GATE: "launch",
    INQUIRY_SUBMISSIONS_ENABLED: "true",
  });

  it("keeps a complete launch configuration closed when activation is held off", () => {
    let fetches = 0;
    const runtime = createInquiryRuntime(launchEnv, {
      ownerActivation: false,
      fetchImpl: async () => {
        fetches += 1;
        throw new Error("Brevo must not be called");
      },
    });
    assert.equal(publicInquirySubmissionsAvailable, true);
    assert.equal(runtime.submissionsEnabled, false);
    assert.equal(runtime.delivery instanceof UnavailableInquiryDelivery, true);
    assert.equal(runtime.idempotency ?? null, null);
    assert.equal(runtime.rateLimiter instanceof UnavailableRateLimiter, true);
    assert.equal(fetches, 0);
  });

  it("attaches the tested adapters only for an explicit owner launch review", () => {
    let fetches = 0;
    const runtime = createInquiryRuntime(launchEnv, {
      ownerActivation: true,
      fetchImpl: async () => {
        fetches += 1;
        return new Response(JSON.stringify({ messageId: "<synthetic@example.com>" }), { status: 201 });
      },
    });
    assert.equal(fetches, 0);
    assert.equal(runtime.submissionsEnabled, true);
    assert.equal(runtime.delivery instanceof BrevoInquiryDelivery, true);
    assert.equal(runtime.idempotency instanceof UpstashInquiryIdempotency, true);
    assert.equal(runtime.rateLimiter instanceof UpstashInquiryRateLimiter, true);
    assert.deepEqual([...runtime.trustedOrigins], [CANONICAL_SITE_ORIGIN]);
  });

  it("fails closed for the testing gate, a missing canonical origin, and a disabled submission flag", () => {
    const testing = createInquiryRuntime(env({
      INQUIRY_ACTIVATION_GATE: "testing",
      INQUIRY_SUBMISSIONS_ENABLED: "true",
    }), { ownerActivation: true });
    assert.equal(testing.delivery instanceof UnavailableInquiryDelivery, true);
    assert.equal(testing.submissionsEnabled, false);

    const previewOrigin = createInquiryRuntime(env({
      INQUIRY_ACTIVATION_GATE: "launch",
      INQUIRY_SUBMISSIONS_ENABLED: "true",
      INQUIRY_TRUSTED_ORIGINS: "https://preview.example",
    }), { ownerActivation: true });
    assert.equal(previewOrigin.delivery instanceof UnavailableInquiryDelivery, true);

    const disabled = createInquiryRuntime(env({
      INQUIRY_ACTIVATION_GATE: "launch",
      INQUIRY_SUBMISSIONS_ENABLED: "false",
    }), { ownerActivation: true });
    assert.equal(disabled.submissionsEnabled, false);
    assert.equal(disabled.delivery instanceof UnavailableInquiryDelivery, true);

    const wrongSender = createInquiryRuntime(env({
      INQUIRY_ACTIVATION_GATE: "launch",
      INQUIRY_SUBMISSIONS_ENABLED: "true",
      BREVO_SENDER_EMAIL: "other@example.com",
    }), { ownerActivation: true });
    assert.equal(wrongSender.delivery instanceof UnavailableInquiryDelivery, true);
  });

  it("does not deliver when Redis cannot reserve the request", async () => {
    let deliveries = 0;
    const redis = new ScriptedRedis([]);
    const runtime = createInquiryRuntime(launchEnv, {
      ownerActivation: true,
      redis,
      delivery: {
        async deliver() {
          deliveries += 1;
          return { status: "accepted" as const, confirmation: "accepted" as const };
        },
      },
    });
    const response = await handleInquiryPost(launchRequest(), runtime);
    const body = await response.json() as { ok: boolean; code?: string };
    assert.equal(response.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.code, "INQUIRY_STORAGE_UNAVAILABLE");
    assert.equal(deliveries, 0);
    assert.equal(redis.calls, 1);
  });

  it("does not report success when the business notification outcome is unknown", async () => {
    let deliveries = 0;
    const redis = new ScriptedRedis([["claimed"], ["finalized"]]);
    const runtime = createInquiryRuntime(launchEnv, {
      ownerActivation: true,
      redis,
      delivery: {
        async deliver() {
          deliveries += 1;
          return { status: "unknown" as const, category: "timeout" as const };
        },
      },
    });
    const response = await handleInquiryPost(launchRequest(), runtime);
    const body = await response.json() as { ok: boolean; code?: string };
    assert.equal(response.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.code, "DELIVERY_OUTCOME_UNKNOWN");
    assert.equal(deliveries, 1);
    assert.equal(redis.calls, 2);

    const replay = await handleInquiryPost(launchRequest(), createInquiryRuntime(launchEnv, {
      ownerActivation: true,
      redis: new ScriptedRedis([["unknown"]]),
      delivery: {
        async deliver() {
          deliveries += 1;
          return { status: "accepted" as const };
        },
      },
    }));
    const replayBody = await replay.json() as { ok: boolean; code?: string };
    assert.equal(replay.status, 503);
    assert.equal(replayBody.code, "DELIVERY_OUTCOME_UNKNOWN");
    assert.equal(deliveries, 1);
  });
});
