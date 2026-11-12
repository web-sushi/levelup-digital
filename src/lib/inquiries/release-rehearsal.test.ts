import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { InquiryDraft } from "@/components/contact/inquiry-model";
import { hashClientKey, trustedClientAddress } from "@/lib/inquiries/abuse-protection";
import {
  createInquiryClient,
  submissionCopy,
  validateInquiryDraft,
} from "@/lib/inquiries/client";
import { createInquiryRuntime } from "@/lib/inquiries/config";
import { handleInquiryPost } from "@/lib/inquiries/handler";
import { publicInquirySubmissionsAvailable } from "@/lib/inquiries/public-availability";
import {
  CANONICAL_SITE_ORIGIN,
  EXPECTED_BREVO_NOTIFICATION_EMAIL,
  EXPECTED_BREVO_SENDER_EMAIL,
  EXPECTED_BREVO_SENDER_NAME,
} from "@/lib/inquiries/readiness";
import { UpstashInquiryRedis } from "@/lib/inquiries/redis-store";
import type { DeliveryResult } from "@/lib/inquiries/types";

const IDEMPOTENCY_KEY = "11111111-1111-4111-8111-111111111111";
const ADDRESS = "203.0.113.44";
const IPV6 = "2001:db8::44";

const LAUNCH_ENV = {
  NODE_ENV: "production" as const,
  INQUIRY_SUBMISSIONS_ENABLED: "true",
  INQUIRY_ACTIVATION_GATE: "launch",
  INQUIRY_TRUSTED_ORIGINS: CANONICAL_SITE_ORIGIN,
  INQUIRY_RATE_LIMIT_KEY_SECRET: "rate-limit-secret-value",
  INQUIRY_IDEMPOTENCY_KEY_SECRET: "idempotency-secret-value",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "example-token",
  BREVO_API_KEY: "synthetic-brevo-key-value",
  BREVO_SENDER_EMAIL: EXPECTED_BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME: EXPECTED_BREVO_SENDER_NAME,
  INQUIRY_NOTIFICATION_EMAIL: EXPECTED_BREVO_NOTIFICATION_EMAIL,
};

class ScriptedRedis extends UpstashInquiryRedis {
  private readonly results: unknown[];

  constructor(results: unknown[]) {
    super("https://example.upstash.io", "example-token", async () => {
      throw new Error("redis network disabled");
    });
    this.results = results;
  }

  async evaluate() {
    return this.results.shift() ?? null;
  }
}

function draft(): InquiryDraft {
  return {
    projectType: "website",
    budget: "unsure",
    timeline: "exploring",
    name: "Ada Lovelace",
    email: "ada@example.com",
    business: "",
    details: "A small brochure site.",
    references: [],
  };
}

function inquiryRequest(origin: string | null, address?: string) {
  const headers = new Headers({ "content-type": "application/json" });
  if (origin !== null) {
    headers.set("origin", origin);
  }
  if (address) {
    headers.set("x-vercel-forwarded-for", address);
  }
  return new Request(`${CANONICAL_SITE_ORIGIN}/api/inquiries`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      projectType: "website",
      budget: "unsure",
      timeline: "exploring",
      name: "Ada Lovelace",
      email: "ada@example.com",
      companyWebsite: "",
    }),
  });
}

function browserBackedClient(runtime: ReturnType<typeof createInquiryRuntime>) {
  let posts = 0;
  const client = createInquiryClient({
    randomUUID: () => IDEMPOTENCY_KEY,
    fetchImpl: async (_input, init) => {
      posts += 1;
      const headers = new Headers(init?.headers);
      headers.set("origin", CANONICAL_SITE_ORIGIN);
      headers.set("x-vercel-forwarded-for", ADDRESS);
      return handleInquiryPost(new Request(`${CANONICAL_SITE_ORIGIN}/api/inquiries`, {
        method: "POST",
        headers,
        body: init?.body,
      }), runtime);
    },
  });
    return {
    client,
    posts: () => posts,
  };
}

describe("release safeguard configuration", () => {
  it("keeps Git deployments disabled in the feature-branch Vercel config", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      git?: { deploymentEnabled?: boolean };
    };
    assert.equal(config.git?.deploymentEnabled, false);
    assert.equal(publicInquirySubmissionsAvailable, false);
  });
});

describe("canonical origin on a disabled deployment", () => {
  it("rejects the production origin when no trusted origin is configured", async () => {
    const runtime = createInquiryRuntime({ NODE_ENV: "production" });
    assert.equal(runtime.trustedOrigins.length, 0);
    assert.equal(runtime.submissionsEnabled, false);
    const response = await handleInquiryPost(inquiryRequest(CANONICAL_SITE_ORIGIN, ADDRESS), runtime);
    const body = await response.json() as { ok: boolean; code: string };
    assert.equal(response.status, 403);
    assert.equal(body.code, "FORBIDDEN_ORIGIN");
  });

  it("accepts the production origin and then stays unavailable while the source gate is false", async () => {
    const runtime = createInquiryRuntime({
      ...LAUNCH_ENV,
      INQUIRY_SUBMISSIONS_ENABLED: "false",
      INQUIRY_ACTIVATION_GATE: "disabled",
    });
    assert.deepEqual([...runtime.trustedOrigins], [CANONICAL_SITE_ORIGIN]);
    const response = await handleInquiryPost(inquiryRequest(CANONICAL_SITE_ORIGIN, ADDRESS), runtime);
    const body = await response.json() as { code: string };
    assert.equal(response.status, 503);
    assert.equal(body.code, "SUBMISSIONS_UNAVAILABLE");
  });
});

describe("trusted client identity", () => {
  it("accepts one platform address and rejects missing, listed, malformed, and forged headers", () => {
    assert.equal(trustedClientAddress(new Headers({ "x-vercel-forwarded-for": ADDRESS })), ADDRESS);
    assert.equal(trustedClientAddress(new Headers({ "x-vercel-forwarded-for": IPV6 })), IPV6);
    assert.equal(trustedClientAddress(new Headers()), null);
    assert.equal(trustedClientAddress(new Headers({ "x-vercel-forwarded-for": `${ADDRESS}, ${IPV6}` })), null);
    assert.equal(trustedClientAddress(new Headers({ "x-vercel-forwarded-for": "203.0.113.10%eth0" })), null);
    assert.equal(trustedClientAddress(new Headers({ "x-vercel-forwarded-for": "not an address" })), null);
    assert.equal(trustedClientAddress(new Headers({
      "x-forwarded-for": ADDRESS,
      "x-real-ip": ADDRESS,
    })), null);

    const ipv4 = hashClientKey(ADDRESS, LAUNCH_ENV.INQUIRY_RATE_LIMIT_KEY_SECRET);
    const ipv6 = hashClientKey(IPV6, LAUNCH_ENV.INQUIRY_RATE_LIMIT_KEY_SECRET);
    assert.match(ipv4, /^[a-f0-9]{64}$/);
    assert.notEqual(ipv4, ipv6);
    assert.equal(ipv4.includes(ADDRESS), false);
    assert.equal(ipv6.includes(IPV6), false);
    assert.equal(ipv6.includes(":"), false);
  });
});

describe("enabled inquiry rehearsal", () => {
  it("completes one privacy-acknowledged submission through mocked Redis and delivery", async () => {
    assert.equal(validateInquiryDraft(draft(), false).status, "validation_error");
    assert.equal(validateInquiryDraft(draft(), true).status, "ready");
    const deliveries: DeliveryResult[] = [];
    const runtime = createInquiryRuntime(LAUNCH_ENV, {
      ownerActivation: true,
      redis: new ScriptedRedis([["claimed"], ["finalized"]]),
      delivery: {
        async deliver() {
          deliveries.push({ status: "accepted", confirmation: "accepted" });
          return { status: "accepted", confirmation: "accepted" };
        },
      },
    });
    const harness = browserBackedClient(runtime);
    const result = await harness.client.submit(draft(), "");
    assert.deepEqual(result, { status: "success", confirmation: "accepted" });
    assert.equal(submissionCopy(result)?.confirmation, "A confirmation email has been queued for delivery.");
    assert.equal(harness.posts(), 1);
    assert.equal(deliveries.length, 1);
    assert.equal(publicInquirySubmissionsAvailable, false);
  });

  it("does not claim delivery when Redis, the business notification, or the acknowledgement fails", async () => {
    const stored = createInquiryRuntime(LAUNCH_ENV, {
      ownerActivation: true,
      redis: new ScriptedRedis([]),
      delivery: {
        async deliver() {
          throw new Error("delivery must not run");
        },
      },
    });
    const storedResult = await browserBackedClient(stored).client.submit(draft(), "");
    assert.equal(storedResult.status, "unavailable");
    assert.equal(submissionCopy(storedResult)?.title.includes("on its way"), false);

    const unknown = createInquiryRuntime(LAUNCH_ENV, {
      ownerActivation: true,
      redis: new ScriptedRedis([["claimed"], ["finalized"]]),
      delivery: {
        async deliver() {
          return { status: "unknown", category: "timeout" };
        },
      },
    });
    const unknownResult = await browserBackedClient(unknown).client.submit(draft(), "");
    assert.equal(unknownResult.status, "unknown_outcome");
    assert.equal(submissionCopy(unknownResult)?.confirmation, undefined);

    const acknowledgementFailed = createInquiryRuntime(LAUNCH_ENV, {
      ownerActivation: true,
      redis: new ScriptedRedis([["claimed"], ["finalized"]]),
      delivery: {
        async deliver() {
          return { status: "accepted", confirmation: "rejected" };
        },
      },
    });
    const partial = await browserBackedClient(acknowledgementFailed).client.submit(draft(), "");
    assert.deepEqual(partial, { status: "success", confirmation: "rejected" });
    assert.equal(submissionCopy(partial)?.confirmation, undefined);
  });
});
