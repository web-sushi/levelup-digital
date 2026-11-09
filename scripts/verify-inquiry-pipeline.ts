import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";
import { createInquiryDraft, type InquiryDraft } from "@/components/contact/inquiry-model";
import { UnavailableRateLimiter } from "@/lib/inquiries/abuse-protection";
import { interpretInquiryResponse, toInquiryRequest, validateInquiryDraft } from "@/lib/inquiries/client";
import { createInquiryRuntime, createPreparedInquiryRuntime } from "@/lib/inquiries/config";
import { UnavailableInquiryDelivery } from "@/lib/inquiries/delivery";
import { handleInquiryPost } from "@/lib/inquiries/handler";
import { publicInquirySubmissionsAvailable } from "@/lib/inquiries/public-availability";
import { assessInquiryActivation } from "@/lib/inquiries/readiness";
import { FINALIZE_SCRIPT } from "@/lib/inquiries/redis-scripts";
import {
  upstashKeyScope,
  UpstashInquiryRedis,
} from "@/lib/inquiries/redis-store";
import type { DeliveryResult, InquiryDelivery, InquiryRuntime, ValidatedInquiry } from "@/lib/inquiries/types";

const NAMESPACE = `levelup:test:ls08d2b:${randomBytes(4).toString("hex")}:`;
const ORIGIN = "https://levelup-digital.dev";

function loadEnvFile() {
  const text = readFileSync(".env.local", "utf8");
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq < 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function required(env: Record<string, string>, name: string) {
  const value = env[name]?.trim() ?? "";
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function redact(value: string) {
  return value.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/https?:\/\/\S+/gi, "https://[redacted-host]");
}

const env = loadEnvFile();
const redisUrl = required(env, "UPSTASH_REDIS_REST_URL");
const redisToken = required(env, "UPSTASH_REDIS_REST_TOKEN");
const rateSecret = required(env, "INQUIRY_RATE_LIMIT_KEY_SECRET");
const idempotencySecret = required(env, "INQUIRY_IDEMPOTENCY_KEY_SECRET");
if (rateSecret.length < 16 || idempotencySecret.length < 16 || rateSecret === idempotencySecret) {
  throw new Error("HMAC secrets must be distinct and at least 16 characters.");
}
if (new URL(redisUrl).protocol !== "https:") {
  throw new Error("Redis REST URL must use HTTPS.");
}

let brevoCalls = 0;

function redisFetch(failFinalize = false) {
  return async (url: string, init: RequestInit) => {
    if (String(url).includes("api.brevo.com")) {
      brevoCalls += 1;
      throw new Error("Brevo must not be called");
    }
    const body = typeof init.body === "string" ? init.body : "";
    if (failFinalize && body.includes("not_owner")) {
      return new Response(JSON.stringify({ error: "simulated finalize loss" }), { status: 500 });
    }
    try {
      return await fetch(url, init);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Redis request failed";
      throw new Error(redact(message));
    }
  };
}

async function command(args: string[]) {
  const parsed = new URL(redisUrl);
  const response = await fetch(parsed.origin + parsed.pathname, {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    headers: {
      authorization: `Bearer ${redisToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(8_000),
  });
  const body = (await response.json()) as { result?: unknown; error?: unknown };
  if (!response.ok || body.error !== undefined) {
    throw new Error("Redis command failed");
  }
  return body.result;
}

async function cleanup() {
  let cursor = "0";
  do {
    const result = await command(["SCAN", cursor, "MATCH", `${NAMESPACE}*`, "COUNT", "100"]);
    if (!Array.isArray(result) || result.length < 2) {
      break;
    }
    cursor = String(result[0]);
    const batch = result[1];
    if (Array.isArray(batch)) {
      for (const key of batch) {
        if (typeof key === "string" && key.startsWith(NAMESPACE)) {
          await command(["DEL", key]);
        }
      }
    }
  } while (cursor !== "0");
}

class MockDelivery implements InquiryDelivery {
  readonly inquiries: ValidatedInquiry[] = [];
  private readonly results: DeliveryResult[];

  constructor(results: DeliveryResult[]) {
    this.results = results;
  }

  async deliver(inquiry: ValidatedInquiry) {
    this.inquiries.push(structuredClone(inquiry));
    const next = this.results.shift();
    if (!next) {
      throw new Error("Unexpected delivery call");
    }
    return next;
  }
}

function redisClient(failFinalize = false) {
  return new UpstashInquiryRedis(redisUrl, redisToken, redisFetch(failFinalize), upstashKeyScope(NAMESPACE));
}

function preparedEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    INQUIRY_SUBMISSIONS_ENABLED: "true",
    INQUIRY_ACTIVATION_GATE: "testing",
    INQUIRY_TRUSTED_ORIGINS: ORIGIN,
    INQUIRY_RATE_LIMIT_KEY_SECRET: rateSecret,
    INQUIRY_IDEMPOTENCY_KEY_SECRET: idempotencySecret,
    UPSTASH_REDIS_REST_URL: redisUrl,
    UPSTASH_REDIS_REST_TOKEN: redisToken,
    BREVO_API_KEY: "synthetic-brevo-key-value",
    BREVO_SENDER_EMAIL: "levelupdigital.support@gmail.com",
    BREVO_SENDER_NAME: "LevelUp Digital",
    INQUIRY_NOTIFICATION_EMAIL: "levelupdigital.support@gmail.com",
  };
}

function runtimeFor(redis: UpstashInquiryRedis, delivery: InquiryDelivery): InquiryRuntime {
  return createPreparedInquiryRuntime(preparedEnv(), { redis, delivery });
}

function key() {
  return `ls08d2b-${randomBytes(8).toString("hex")}`;
}

function inquiry(overrides: Record<string, unknown> = {}) {
  return {
    projectType: "website",
    budget: "range-100",
    timeline: "month",
    name: "Pipeline Test",
    email: "pipeline-test@example.com",
    business: "Example Studio",
    details: "A synthetic inquiry used to verify the handler.",
    references: [{ url: "https://example.com/work", note: "Layout reference" }],
    companyWebsite: "",
    ...overrides,
  };
}

function wizardDraft(): InquiryDraft {
  return {
    ...createInquiryDraft(),
    projectType: "website",
    budget: "range-100",
    timeline: "month",
    name: "Pipeline Test",
    email: "pipeline-test@example.com",
    business: "Example Studio",
    details: "A synthetic inquiry used to verify the handler.",
    references: [{ id: "local-only", url: "https://example.com/work", note: "Layout reference" }],
  };
}

function post(
  body: unknown,
  options: { address?: string | null; origin?: string | null; idempotencyKey?: string | null } = {},
) {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.origin !== null) {
    headers.set("origin", options.origin ?? ORIGIN);
  }
  if (options.address !== null) {
    headers.set("x-vercel-forwarded-for", options.address ?? "203.0.113.10");
  }
  if (options.idempotencyKey !== null) {
    headers.set("idempotency-key", options.idempotencyKey ?? key());
  }
  return new Request(`${ORIGIN}/api/inquiries`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function read(response: Response) {
  assert.equal(response.headers.get("cache-control"), "no-store");
  return (await response.json()) as {
    ok: boolean;
    code?: string;
    confirmation?: string;
    fieldErrors?: Record<string, string>;
    message?: string;
  };
}

const sharedRedis = redisClient();

describe("live inquiry handler pipeline", { concurrency: 1 }, () => {
  after(async () => {
    await cleanup();
    const leftover = await command(["SCAN", "0", "MATCH", `${NAMESPACE}*`, "COUNT", "100"]);
    const batch = Array.isArray(leftover) ? leftover[1] : [];
    assert.equal(Array.isArray(batch) ? batch.length : 0, 0);
    assert.equal(brevoCalls, 0);
  });

  it("accepts a wizard-mapped submission once and replays the stored result", async () => {
    const current = wizardDraft();
    assert.equal(validateInquiryDraft(current, false).status, "validation_error");
    assert.equal(validateInquiryDraft(current, true).status, "ready");
    const body = toInquiryRequest(current, "");
    assert.ok(body);
    assert.equal("privacy" in body, false);
    const delivery = new MockDelivery([{ status: "accepted", confirmation: "accepted" }]);
    const submissionKey = key();
    const response = await handleInquiryPost(
      post(body, { address: "203.0.113.10", idempotencyKey: submissionKey }),
      runtimeFor(sharedRedis, delivery),
    );
    const payload = await read(response.clone());
    assert.equal(response.status, 200);
    assert.deepEqual(payload, { ok: true, confirmation: "accepted" });
    assert.deepEqual(await interpretInquiryResponse(response, current), { status: "success", confirmation: "accepted" });
    assert.equal(delivery.inquiries.length, 1);
    assert.equal(delivery.inquiries[0]?.projectType, "website");
    assert.equal(delivery.inquiries[0]?.budget, "range-100");
    assert.equal(delivery.inquiries[0]?.timeline, "month");
    assert.equal(delivery.inquiries[0]?.name, "Pipeline Test");
    assert.equal(delivery.inquiries[0]?.email, "pipeline-test@example.com");
    assert.equal(delivery.inquiries[0]?.details, "A synthetic inquiry used to verify the handler.");
    assert.deepEqual(delivery.inquiries[0]?.references, [{ url: "https://example.com/work", note: "Layout reference" }]);

    const replay = await handleInquiryPost(
      post(body, { address: "203.0.113.10", idempotencyKey: submissionKey }),
      runtimeFor(sharedRedis, delivery),
    );
    assert.equal(replay.status, 200);
    assert.deepEqual(await read(replay), { ok: true, confirmation: "accepted" });
    assert.equal(delivery.inquiries.length, 1);
  });

  it("enforces origin, honeypot, payload, idempotency key, and client address rules", async () => {
    const delivery = new MockDelivery([{ status: "accepted", confirmation: "accepted" }]);
    const runtime = runtimeFor(sharedRedis, delivery);
    const untrusted = await handleInquiryPost(post(inquiry(), { origin: "https://evil.example", address: "203.0.113.11" }), runtime);
    assert.equal(untrusted.status, 403);
    assert.equal((await read(untrusted)).code, "FORBIDDEN_ORIGIN");

    const missingOrigin = await handleInquiryPost(post(inquiry(), { origin: null, address: "203.0.113.11" }), runtime);
    assert.equal(missingOrigin.status, 403);
    assert.equal((await read(missingOrigin)).code, "FORBIDDEN_ORIGIN");

    const honeypot = await handleInquiryPost(
      post(inquiry({ companyWebsite: "https://spam.example" }), { address: "203.0.113.12" }),
      runtime,
    );
    const honeypotBody = await read(honeypot);
    assert.equal(honeypot.status, 400);
    assert.equal(honeypotBody.code, "INVALID_REQUEST");
    assert.equal(JSON.stringify(honeypotBody).includes("spam.example"), false);

    const invalid = await handleInquiryPost(post(inquiry({ email: "not-an-email" }), { address: "203.0.113.23" }), runtime);
    const invalidBody = await read(invalid.clone());
    assert.equal(invalid.status, 422);
    assert.equal(invalidBody.code, "VALIDATION_ERROR");
    assert.equal(typeof invalidBody.fieldErrors?.email, "string");
    const invalidState = await interpretInquiryResponse(invalid, wizardDraft());
    assert.equal(invalidState.status, "validation_error");

    const invalidKey = await handleInquiryPost(post(inquiry(), { address: "203.0.113.14", idempotencyKey: "short" }), runtime);
    const invalidKeyBody = await read(invalidKey.clone());
    assert.equal(invalidKey.status, 400);
    assert.equal(invalidKeyBody.code, "INVALID_IDEMPOTENCY_KEY");
    assert.deepEqual(await interpretInquiryResponse(invalidKey, wizardDraft()), { status: "error", reason: "invalid_key" });

    const missingAddress = await handleInquiryPost(post(inquiry(), { address: null, idempotencyKey: key() }), runtime);
    const missingAddressBody = await read(missingAddress.clone());
    assert.equal(missingAddress.status, 503);
    assert.equal(missingAddressBody.code, "RATE_LIMIT_UNAVAILABLE");
    assert.equal((await interpretInquiryResponse(missingAddress, wizardDraft())).status, "unavailable");
    assert.equal(delivery.inquiries.length, 0);
  });

  it("allows five new submissions, rejects the sixth, and does not charge an accepted replay", async () => {
    const delivery = new MockDelivery(Array.from({ length: 5 }, () => ({ status: "accepted" as const, confirmation: "accepted" as const })));
    const runtime = runtimeFor(sharedRedis, delivery);
    const keys: string[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const submissionKey = key();
      keys.push(submissionKey);
      const response = await handleInquiryPost(
        post(inquiry({ email: `pipeline-${attempt}@example.com` }), { address: "203.0.113.13", idempotencyKey: submissionKey }),
        runtime,
      );
      assert.equal(response.status, 200);
      await read(response);
    }
    const replay = await handleInquiryPost(
      post(inquiry({ email: "pipeline-0@example.com" }), { address: "203.0.113.13", idempotencyKey: keys[0] }),
      runtime,
    );
    assert.equal(replay.status, 200);
    assert.equal((await read(replay)).confirmation, "accepted");
    const limited = await handleInquiryPost(
      post(inquiry({ email: "pipeline-6@example.com" }), { address: "203.0.113.13", idempotencyKey: key() }),
      runtime,
    );
    const limitedBody = await read(limited.clone());
    assert.equal(limited.status, 429);
    assert.equal(limitedBody.code, "RATE_LIMITED");
    assert.equal((await interpretInquiryResponse(limited, wizardDraft())).status, "rate_limited");
    assert.equal(delivery.inquiries.length, 5);
  });

  it("delivers one concurrent claim, then conflicts when the payload changes", async () => {
    const delivery = new MockDelivery([{ status: "accepted", confirmation: "accepted" }]);
    const original = delivery.deliver.bind(delivery);
    delivery.deliver = async (inquiry) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return original(inquiry);
    };
    const runtime = runtimeFor(sharedRedis, delivery);
    const submissionKey = key();
    const body = inquiry();
    const [first, second] = await Promise.all([
      handleInquiryPost(post(body, { address: "203.0.113.15", idempotencyKey: submissionKey }), runtime),
      handleInquiryPost(post(body, { address: "203.0.113.15", idempotencyKey: submissionKey }), runtime),
    ]);
    const statuses = [first.status, second.status].sort();
    assert.deepEqual(statuses, [200, 409]);
    const bodies = await Promise.all([read(first), read(second)]);
    assert.equal(bodies.filter((item) => item.ok).length, 1);
    assert.equal(bodies.filter((item) => item.code === "INQUIRY_PROCESSING").length, 1);
    assert.equal(delivery.inquiries.length, 1);

    const replay = await handleInquiryPost(post(body, { address: "203.0.113.15", idempotencyKey: submissionKey }), runtime);
    assert.equal(replay.status, 200);
    await read(replay);
    const conflict = await handleInquiryPost(
      post(inquiry({ details: "A different synthetic payload." }), { address: "203.0.113.15", idempotencyKey: submissionKey }),
      runtime,
    );
    const conflictBody = await read(conflict.clone());
    assert.equal(conflict.status, 409);
    assert.equal(conflictBody.code, "IDEMPOTENCY_CONFLICT");
    assert.equal((await interpretInquiryResponse(conflict, wizardDraft())).status, "conflict");
    assert.equal(delivery.inquiries.length, 1);
  });

  it("preserves each confirmation outcome without another delivery", async () => {
    const cases: Array<{ confirmation: "accepted" | "rejected" | "unknown"; address: string }> = [
      { confirmation: "accepted", address: "203.0.113.16" },
      { confirmation: "rejected", address: "203.0.113.17" },
      { confirmation: "unknown", address: "203.0.113.18" },
    ];
    for (const item of cases) {
      const delivery = new MockDelivery([{ status: "accepted", confirmation: item.confirmation }]);
      const submissionKey = key();
      const response = await handleInquiryPost(
        post(inquiry(), { address: item.address, idempotencyKey: submissionKey }),
        runtimeFor(sharedRedis, delivery),
      );
      assert.equal(response.status, 200);
      assert.equal((await read(response)).confirmation, item.confirmation);
      const replay = await handleInquiryPost(
        post(inquiry(), { address: item.address, idempotencyKey: submissionKey }),
        runtimeFor(sharedRedis, delivery),
      );
      assert.equal(replay.status, 200);
      assert.equal((await read(replay)).confirmation, item.confirmation);
      assert.equal(delivery.inquiries.length, 1);
    }
  });

  it("does not retry a rejected or unknown business outcome", async () => {
    const rejected = new MockDelivery([{ status: "rejected", category: "rejected" }]);
    const rejectedKey = key();
    const rejectedResponse = await handleInquiryPost(
      post(inquiry(), { address: "203.0.113.19", idempotencyKey: rejectedKey }),
      runtimeFor(sharedRedis, rejected),
    );
    const rejectedBody = await read(rejectedResponse.clone());
    assert.equal(rejectedResponse.status, 503);
    assert.equal(rejectedBody.code, "DELIVERY_UNAVAILABLE");
    assert.equal((await interpretInquiryResponse(rejectedResponse, wizardDraft())).status, "unavailable");
    const rejectedReplay = await handleInquiryPost(
      post(inquiry(), { address: "203.0.113.19", idempotencyKey: rejectedKey }),
      runtimeFor(sharedRedis, rejected),
    );
    assert.equal(rejectedReplay.status, 503);
    assert.equal((await read(rejectedReplay)).code, "DELIVERY_UNAVAILABLE");
    assert.equal(rejected.inquiries.length, 1);

    const unknown = new MockDelivery([{ status: "unknown", category: "timeout" }]);
    const unknownKey = key();
    const unknownResponse = await handleInquiryPost(
      post(inquiry(), { address: "203.0.113.20", idempotencyKey: unknownKey }),
      runtimeFor(sharedRedis, unknown),
    );
    const unknownBody = await read(unknownResponse.clone());
    assert.equal(unknownResponse.status, 503);
    assert.equal(unknownBody.code, "DELIVERY_OUTCOME_UNKNOWN");
    assert.equal((await interpretInquiryResponse(unknownResponse, wizardDraft())).status, "unknown_outcome");
    const unknownReplay = await handleInquiryPost(
      post(inquiry(), { address: "203.0.113.20", idempotencyKey: unknownKey }),
      runtimeFor(sharedRedis, unknown),
    );
    assert.equal(unknownReplay.status, 503);
    assert.equal((await read(unknownReplay)).code, "DELIVERY_OUTCOME_UNKNOWN");
    assert.equal(unknown.inquiries.length, 1);
  });

  it("fails closed before delivery when Redis is unavailable and after delivery when finalization is lost", async () => {
    const offlineDelivery = new MockDelivery([{ status: "accepted", confirmation: "accepted" }]);
    const offline = new UpstashInquiryRedis("https://127.0.0.1:9", "local-dummy-token", redisFetch(), upstashKeyScope(NAMESPACE));
    const unavailable = await handleInquiryPost(
      post(inquiry(), { address: "203.0.113.21", idempotencyKey: key() }),
      runtimeFor(offline, offlineDelivery),
    );
    assert.equal(unavailable.status, 503);
    assert.equal((await read(unavailable)).code, "INQUIRY_STORAGE_UNAVAILABLE");
    assert.equal(offlineDelivery.inquiries.length, 0);

    const lostDelivery = new MockDelivery([{ status: "accepted", confirmation: "accepted" }]);
    const lostRedis = redisClient(true);
    const submissionKey = key();
    const lost = await handleInquiryPost(
      post(inquiry(), { address: "203.0.113.22", idempotencyKey: submissionKey }),
      runtimeFor(lostRedis, lostDelivery),
    );
    const lostBody = await read(lost.clone());
    assert.equal(lost.status, 503);
    assert.equal(lostBody.code, "IDEMPOTENCY_PERSISTENCE_FAILED");
    assert.equal((await interpretInquiryResponse(lost, wizardDraft())).status, "persistence_uncertain");
    const repeat = await handleInquiryPost(
      post(inquiry(), { address: "203.0.113.22", idempotencyKey: submissionKey }),
      runtimeFor(sharedRedis, lostDelivery),
    );
    const repeatBody = await read(repeat.clone());
    assert.equal(repeat.status, 409);
    assert.equal(repeatBody.code, "INQUIRY_PROCESSING");
    assert.equal((await interpretInquiryResponse(repeat, wizardDraft())).status, "processing");
    assert.equal(lostDelivery.inquiries.length, 1);
    assert.equal(FINALIZE_SCRIPT.includes("not_owner"), true);
  });

  it("keeps the public route closed when Redis and Brevo configuration are present", () => {
    const local = assessInquiryActivation({
      NODE_ENV: "production",
      INQUIRY_SUBMISSIONS_ENABLED: env.INQUIRY_SUBMISSIONS_ENABLED,
      INQUIRY_ACTIVATION_GATE: env.INQUIRY_ACTIVATION_GATE,
      INQUIRY_TRUSTED_ORIGINS: env.INQUIRY_TRUSTED_ORIGINS,
      INQUIRY_RATE_LIMIT_KEY_SECRET: env.INQUIRY_RATE_LIMIT_KEY_SECRET,
      INQUIRY_IDEMPOTENCY_KEY_SECRET: env.INQUIRY_IDEMPOTENCY_KEY_SECRET,
      UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
      BREVO_API_KEY: env.BREVO_API_KEY,
      BREVO_SENDER_EMAIL: env.BREVO_SENDER_EMAIL,
      BREVO_SENDER_NAME: env.BREVO_SENDER_NAME,
      INQUIRY_NOTIFICATION_EMAIL: env.INQUIRY_NOTIFICATION_EMAIL,
    });
    assert.equal(local.state, "disabled");
    assert.equal(local.publicPageEnabled, false);
    assert.equal(local.publicRouteUsesLiveAdapters, false);
    assert.equal(local.brevoAuthenticationVerified, false);
    assert.equal(local.inboxDeliveryVerified, false);
    assert.equal(local.missing.includes("INQUIRY_TRUSTED_ORIGINS"), true);
    assert.equal(local.missing.includes("INQUIRY_ACTIVATION_GATE"), true);
    assert.equal(local.missing.includes("BREVO_API_KEY"), false);
    assert.equal(publicInquirySubmissionsAvailable, false);

    const runtime = createInquiryRuntime(preparedEnv());
    assert.equal(runtime.idempotency ?? null, null);
    assert.equal(runtime.delivery instanceof UnavailableInquiryDelivery, true);
    assert.equal(runtime.rateLimiter instanceof UnavailableRateLimiter, true);
    const prepared = createPreparedInquiryRuntime({
      ...preparedEnv(),
      INQUIRY_ACTIVATION_GATE: "disabled",
    });
    assert.equal(prepared.delivery instanceof UnavailableInquiryDelivery, true);
    assert.equal(brevoCalls, 0);
  });
});
