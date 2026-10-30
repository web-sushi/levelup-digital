import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POST } from "@/app/api/inquiries/route";
import { createBrevoInquiryDelivery } from "@/lib/inquiries/brevo-delivery";
import { createInquiryRuntime } from "@/lib/inquiries/config";
import { UnavailableInquiryDelivery } from "@/lib/inquiries/delivery";
import { fingerprintInquiry, hashIdempotencyKey, IDEMPOTENCY_LEASE_MS, IDEMPOTENCY_RETENTION_SECONDS, idempotencyRedisKey } from "@/lib/inquiries/idempotency";
import { handleInquiryPost } from "@/lib/inquiries/handler";
import { BEGIN_SCRIPT, FINALIZE_SCRIPT, RATE_LIMIT_SCRIPT } from "@/lib/inquiries/redis-scripts";
import {
  createMemoryInquiryInfrastructure,
  readUpstashConfig,
  UpstashInquiryIdempotency,
  UpstashInquiryRateLimiter,
  UpstashInquiryRedis,
} from "@/lib/inquiries/redis-store";
import type { InquiryDelivery, InquiryRuntime, ValidatedInquiry } from "@/lib/inquiries/types";

const RATE_SECRET = "test-rate-limit-secret";
const IDEMPOTENCY_SECRET = "test-idempotency-secret";
const KEY = "idempotency-key-01";
const ADDRESS = "203.0.113.44";
const API_KEY = "test-brevo-api-key-value";

function inquiry(overrides: Partial<ValidatedInquiry> = {}): ValidatedInquiry {
  return {
    projectType: "website",
    budget: "range-100",
    timeline: "month",
    name: "Ada Lovelace",
    email: "ada@example.com",
    business: "Level Studio",
    details: "A booking site.",
    references: [{ url: "https://example.com/guide", note: "Navigation" }],
    ...overrides,
  };
}

class RecordingDelivery implements InquiryDelivery {
  calls = 0;
  result: { status: "accepted" | "rejected" | "unknown"; confirmation?: "accepted" | "rejected" | "unknown" } = {
    status: "accepted",
    confirmation: "accepted",
  };
  async deliver() {
    this.calls += 1;
    return this.result;
  }
}

function guardedRuntime(
  infrastructure: ReturnType<typeof createMemoryInquiryInfrastructure>,
  delivery: InquiryDelivery,
): InquiryRuntime {
  return {
    submissionsEnabled: true,
    trustedOrigins: ["https://levelup-digital.dev"],
    allowDevelopmentOrigins: false,
    rateLimitKeySecret: RATE_SECRET,
    idempotencyKeySecret: IDEMPOTENCY_SECRET,
    rateLimiter: infrastructure.rateLimiter,
    idempotency: infrastructure.idempotency,
    delivery,
  };
}

function inquiryRequest(body: unknown, key: string | null = KEY, headers: Record<string, string> = {}) {
  const requestHeaders = new Headers({
    "content-type": "application/json",
    origin: "https://levelup-digital.dev",
    "x-vercel-forwarded-for": ADDRESS,
    ...headers,
  });
  if (key) {
    requestHeaders.set("idempotency-key", key);
  }
  return new Request(`https://levelup-digital.dev/api/inquiries?Idempotency-Key=${KEY}`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response) {
  return (await response.json()) as { ok: boolean; code?: string; confirmation?: string; message?: string };
}

describe("distributed rate limit", () => {
  it("allows the first five requests in a window and rejects the sixth", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    const limiter = infrastructure.rateLimiter;
    const results = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      results.push(await limiter.consume("client-hash"));
    }
    assert.equal(results.every((result) => result.status === "allowed"), true);
    const limited = await limiter.consume("client-hash");
    assert.equal(limited.status, "limited");
    if (limited.status === "limited") {
      assert.equal(limited.retryAfterSeconds > 0, true);
    }
  });

  it("starts a new window after the hour expires", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    let now = 1_700_000_000_000;
    infrastructure.redis.now = () => now;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal((await infrastructure.rateLimiter.consume("client-hash")).status, "allowed");
    }
    assert.equal((await infrastructure.rateLimiter.consume("client-hash")).status, "limited");
    now += 60 * 60 * 1000;
    assert.equal((await infrastructure.rateLimiter.consume("client-hash")).status, "allowed");
  });

  it("serializes concurrent consumption so only five requests are allowed", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => infrastructure.rateLimiter.consume("client-hash")),
    );
    assert.equal(results.filter((result) => result.status === "allowed").length, 5);
    assert.equal(results.filter((result) => result.status === "limited").length, 3);
  });

  it("fails closed when rate-limit storage is unavailable", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    infrastructure.redis.failRateLimit = true;
    assert.deepEqual(await infrastructure.rateLimiter.consume("client-hash"), { status: "unavailable" });
  });

  it("does not log a raw client address", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    const delivery = new RecordingDelivery();
    const runtime = guardedRuntime(infrastructure, delivery);
    const logs: unknown[][] = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args: unknown[]) => {
      logs.push(args);
    };
    console.error = (...args: unknown[]) => {
      logs.push(args);
    };
    try {
      const response = await handleInquiryPost(inquiryRequest(inquiry()), runtime);
      assert.equal(response.status, 200);
      assert.equal(JSON.stringify(logs).includes(ADDRESS), false);
      assert.equal(infrastructure.redis.keys().some((key) => key.includes(ADDRESS)), false);
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  });
});

describe("durable idempotency", () => {
  it("rejects a missing or invalid key and ignores a query parameter", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    const delivery = new RecordingDelivery();
    const runtime = guardedRuntime(infrastructure, delivery);
    const missing = await handleInquiryPost(inquiryRequest(inquiry(), null), runtime);
    assert.equal((await readJson(missing)).code, "INVALID_IDEMPOTENCY_KEY");
    const invalid = await handleInquiryPost(inquiryRequest(inquiry(), "too-short"), runtime);
    assert.equal(invalid.status, 400);
    assert.equal(delivery.calls, 0);
    assert.equal(infrastructure.redis.keys().some((key) => key.includes(KEY)), false);

    const limitedInfrastructure = createMemoryInquiryInfrastructure();
    const limitedDelivery = new RecordingDelivery();
    const limitedRuntime = guardedRuntime(limitedInfrastructure, limitedDelivery);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await handleInquiryPost(inquiryRequest(inquiry(), `bad ${attempt}`), limitedRuntime);
      assert.equal(response.status, 400);
    }
    const blocked = await handleInquiryPost(inquiryRequest(inquiry(), "still-not-valid"), limitedRuntime);
    assert.equal(blocked.status, 429);
    assert.equal(limitedDelivery.calls, 0);
  });

  it("claims the first request and lets only the owner finalize", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    const owner = "owner-token-aaaa";
    const other = "owner-token-bbbb";
    const hash = hashIdempotencyKey(KEY, IDEMPOTENCY_SECRET);
    const fingerprint = fingerprintInquiry(inquiry());
    const claimed = await infrastructure.idempotency.begin({
      clientHash: "client",
      idempotencyHash: hash,
      fingerprint,
      owner,
    });
    assert.deepEqual(claimed, { status: "claimed", owner });
    assert.equal(await infrastructure.idempotency.finalize({
      idempotencyHash: hash,
      owner: other,
      state: "accepted",
      confirmation: "accepted",
      category: "-",
    }), "not_owner");
    assert.equal(await infrastructure.idempotency.finalize({
      idempotencyHash: hash,
      owner,
      state: "accepted",
      confirmation: "accepted",
      category: "-",
    }), "finalized");
    const record = infrastructure.redis.read(idempotencyRedisKey(hash));
    assert.equal(record?.includes("ada@example.com"), false);
    assert.equal(record?.includes(KEY), false);
  });

  it("returns processing for a duplicate during the lease and unknown after it expires", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    let now = 1_700_000_000_000;
    infrastructure.redis.now = () => now;
    const input = {
      clientHash: "client",
      idempotencyHash: hashIdempotencyKey(KEY, IDEMPOTENCY_SECRET),
      fingerprint: fingerprintInquiry(inquiry()),
      owner: "owner-token-aaaa",
    };
    assert.equal((await infrastructure.idempotency.begin(input)).status, "claimed");
    now += IDEMPOTENCY_LEASE_MS - 1000;
    assert.equal((await infrastructure.idempotency.begin(input)).status, "processing");
    now += 2000;
    assert.equal((await infrastructure.idempotency.begin(input)).status, "replay_unknown");
    assert.equal((await infrastructure.idempotency.begin(input)).status, "replay_unknown");
  });

  it("keeps an unknown or rejected outcome from being claimed again", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    const hash = hashIdempotencyKey(KEY, IDEMPOTENCY_SECRET);
    const fingerprint = fingerprintInquiry(inquiry());
    const owner = "owner-token-aaaa";
    await infrastructure.idempotency.begin({ clientHash: "client", idempotencyHash: hash, fingerprint, owner });
    await infrastructure.idempotency.finalize({
      idempotencyHash: hash,
      owner,
      state: "unknown",
      confirmation: "-",
      category: "timeout",
    });
    assert.equal((await infrastructure.idempotency.begin({
      clientHash: "client",
      idempotencyHash: hash,
      fingerprint,
      owner: "other-owner-token",
    })).status, "replay_unknown");
  });

  it("conflicts when the same key is reused for a different payload", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    const hash = hashIdempotencyKey(KEY, IDEMPOTENCY_SECRET);
    await infrastructure.idempotency.begin({
      clientHash: "client",
      idempotencyHash: hash,
      fingerprint: fingerprintInquiry(inquiry()),
      owner: "owner-token-aaaa",
    });
    const conflict = await infrastructure.idempotency.begin({
      clientHash: "client",
      idempotencyHash: hash,
      fingerprint: fingerprintInquiry(inquiry({ details: "A different site." })),
      owner: "owner-token-bbbb",
    });
    assert.equal(conflict.status, "conflict");
  });

  it("drops the marker only after the retention window", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    let now = 1_700_000_000_000;
    infrastructure.redis.now = () => now;
    const input = {
      clientHash: "client",
      idempotencyHash: hashIdempotencyKey(KEY, IDEMPOTENCY_SECRET),
      fingerprint: fingerprintInquiry(inquiry()),
      owner: "owner-token-aaaa",
    };
    await infrastructure.idempotency.begin(input);
    await infrastructure.idempotency.finalize({
      idempotencyHash: input.idempotencyHash,
      owner: input.owner,
      state: "accepted",
      confirmation: "accepted",
      category: "-",
    });
    now += (IDEMPOTENCY_RETENTION_SECONDS - 1) * 1000;
    assert.equal((await infrastructure.idempotency.begin(input)).status, "replay_accepted");
    now += 2000;
    assert.equal((await infrastructure.idempotency.begin({ ...input, owner: "fresh-owner-token" })).status, "claimed");
  });

  it("gives only one concurrent claim the right to deliver", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    const input = {
      clientHash: "client",
      idempotencyHash: hashIdempotencyKey(KEY, IDEMPOTENCY_SECRET),
      fingerprint: fingerprintInquiry(inquiry()),
      owner: "owner-token-aaaa",
    };
    const [first, second] = await Promise.all([
      infrastructure.idempotency.begin(input),
      infrastructure.idempotency.begin({ ...input, owner: "owner-token-bbbb" }),
    ]);
    const statuses = [first.status, second.status].sort();
    assert.deepEqual(statuses, ["claimed", "processing"]);
  });

  it("fails closed when idempotency storage is unavailable", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    infrastructure.redis.failBegin = true;
    assert.equal((await infrastructure.idempotency.begin({
      clientHash: "client",
      idempotencyHash: "hash",
      fingerprint: "fingerprint",
      owner: "owner-token-aaaa",
    })).status, "unavailable");
  });
});

describe("idempotent inquiry submission", () => {
  it("sends one delivery for concurrent identical requests and replays the accepted result", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let fetches = 0;
    const fetchImpl = async () => {
      fetches += 1;
      if (fetches === 1) {
        await gate;
      }
      return new Response(JSON.stringify({ messageId: "<accepted@example>" }), { status: 201 });
    };
    const delivery = createBrevoInquiryDelivery(
      {
        BREVO_API_KEY: API_KEY,
        BREVO_SENDER_EMAIL: "levelupdigital.support@gmail.com",
        BREVO_SENDER_NAME: "LevelUp Digital",
        INQUIRY_NOTIFICATION_EMAIL: "levelupdigital.support@gmail.com",
      },
      { fetchImpl },
    );
    const runtime = guardedRuntime(infrastructure, delivery);
    const first = handleInquiryPost(inquiryRequest(inquiry()), runtime);
    const second = handleInquiryPost(inquiryRequest(inquiry()), runtime);
    const secondResponse = await second;
    assert.equal(secondResponse.status, 409);
    assert.equal((await readJson(secondResponse)).code, "INQUIRY_PROCESSING");
    assert.equal(fetches, 1);
    release();
    const firstResponse = await first;
    assert.equal(firstResponse.status, 200);
    assert.deepEqual(await readJson(firstResponse), { ok: true, confirmation: "accepted" });
    assert.equal(fetches, 2);
    const replay = await handleInquiryPost(inquiryRequest(inquiry()), runtime);
    assert.equal(replay.status, 200);
    assert.equal(fetches, 2);
  });

  it("does not charge a rate-limit slot for an accepted replay", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    const delivery = new RecordingDelivery();
    const runtime = guardedRuntime(infrastructure, delivery);
    assert.equal((await handleInquiryPost(inquiryRequest(inquiry(), KEY), runtime)).status, 200);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      assert.equal((await handleInquiryPost(inquiryRequest(inquiry(), KEY), runtime)).status, 200);
    }
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const key = `another-valid-key-${attempt}`;
      assert.equal((await handleInquiryPost(inquiryRequest(inquiry(), key), runtime)).status, 200);
    }
    const limited = await handleInquiryPost(inquiryRequest(inquiry(), "another-valid-key-x"), runtime);
    assert.equal(limited.status, 429);
    assert.equal(delivery.calls, 5);
    const replay = await handleInquiryPost(inquiryRequest(inquiry(), KEY), runtime);
    assert.equal(replay.status, 200);
    assert.equal(delivery.calls, 5);
  });

  it("rejects a conflicting payload without a second delivery", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    const delivery = new RecordingDelivery();
    const runtime = guardedRuntime(infrastructure, delivery);
    await handleInquiryPost(inquiryRequest(inquiry()), runtime);
    const conflict = await handleInquiryPost(inquiryRequest(inquiry({ name: "Grace Hopper" })), runtime);
    const body = await readJson(conflict);
    assert.equal(conflict.status, 409);
    assert.equal(body.code, "IDEMPOTENCY_CONFLICT");
    assert.equal(delivery.calls, 1);
    assert.equal(JSON.stringify(body).includes("Grace Hopper"), false);
  });

  it("blocks automatic retry after an unknown or rejected delivery", async () => {
    const unknownInfrastructure = createMemoryInquiryInfrastructure();
    const unknownDelivery = new RecordingDelivery();
    unknownDelivery.result = { status: "unknown" };
    const unknownRuntime = guardedRuntime(unknownInfrastructure, unknownDelivery);
    const unknown = await handleInquiryPost(inquiryRequest(inquiry()), unknownRuntime);
    assert.equal((await readJson(unknown)).code, "DELIVERY_OUTCOME_UNKNOWN");
    const unknownReplay = await handleInquiryPost(inquiryRequest(inquiry()), unknownRuntime);
    assert.equal((await readJson(unknownReplay)).code, "DELIVERY_OUTCOME_UNKNOWN");
    assert.equal(unknownDelivery.calls, 1);

    const rejectedInfrastructure = createMemoryInquiryInfrastructure();
    const rejectedDelivery = new RecordingDelivery();
    rejectedDelivery.result = { status: "rejected" };
    const rejectedRuntime = guardedRuntime(rejectedInfrastructure, rejectedDelivery);
    await handleInquiryPost(inquiryRequest(inquiry(), "rejected-key-00001"), rejectedRuntime);
    await handleInquiryPost(inquiryRequest(inquiry(), "rejected-key-00001"), rejectedRuntime);
    assert.equal(rejectedDelivery.calls, 1);
  });

  it("does not deliver when storage fails before or after the provider call", async () => {
    const before = createMemoryInquiryInfrastructure();
    before.redis.failBegin = true;
    const beforeDelivery = new RecordingDelivery();
    const beforeResponse = await handleInquiryPost(
      inquiryRequest(inquiry()),
      guardedRuntime(before, beforeDelivery),
    );
    assert.equal((await readJson(beforeResponse)).code, "INQUIRY_STORAGE_UNAVAILABLE");
    assert.equal(beforeDelivery.calls, 0);

    const after = createMemoryInquiryInfrastructure();
    after.redis.failFinalize = true;
    const afterDelivery = new RecordingDelivery();
    const afterResponse = await handleInquiryPost(inquiryRequest(inquiry()), guardedRuntime(after, afterDelivery));
    assert.equal((await readJson(afterResponse)).code, "IDEMPOTENCY_PERSISTENCE_FAILED");
    assert.equal(afterDelivery.calls, 1);
    const duplicate = await handleInquiryPost(inquiryRequest(inquiry()), guardedRuntime(after, afterDelivery));
    assert.equal(duplicate.status, 409);
    assert.equal(afterDelivery.calls, 1);
  });

  it("keeps a disabled submission flag ahead of storage and delivery", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    const delivery = new RecordingDelivery();
    const runtime = guardedRuntime(infrastructure, delivery);
    runtime.submissionsEnabled = false;
    const response = await handleInquiryPost(inquiryRequest(inquiry()), runtime);
    assert.equal((await readJson(response)).code, "SUBMISSIONS_UNAVAILABLE");
    assert.equal(delivery.calls, 0);
    assert.equal(infrastructure.redis.keys().length, 0);
  });

  it("rejects a request without a trustworthy client address", async () => {
    const infrastructure = createMemoryInquiryInfrastructure();
    const delivery = new RecordingDelivery();
    const response = await handleInquiryPost(
      inquiryRequest(inquiry(), KEY, { "x-vercel-forwarded-for": "" }),
      guardedRuntime(infrastructure, delivery),
    );
    assert.equal((await readJson(response)).code, "RATE_LIMIT_UNAVAILABLE");
    assert.equal(delivery.calls, 0);
  });

  it("keeps the public route fail-closed when Redis and Brevo credentials exist", async () => {
    const created = createInquiryRuntime({
      NODE_ENV: "production",
      INQUIRY_SUBMISSIONS_ENABLED: "true",
      INQUIRY_TRUSTED_ORIGINS: "https://levelup-digital.dev",
      INQUIRY_RATE_LIMIT_KEY_SECRET: RATE_SECRET,
      INQUIRY_IDEMPOTENCY_KEY_SECRET: IDEMPOTENCY_SECRET,
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "example-token",
      BREVO_API_KEY: API_KEY,
    });
    assert.equal(created.idempotency, null);
    assert.equal(created.delivery instanceof UnavailableInquiryDelivery, true);
    const original = globalThis.fetch;
    let fetches = 0;
    globalThis.fetch = (() => {
      fetches += 1;
      throw new Error("live network disabled");
    }) as typeof fetch;
    try {
      const response = await POST(inquiryRequest(inquiry()));
      assert.equal((await readJson(response)).ok, false);
      assert.notEqual(response.status, 200);
      assert.equal(fetches, 0);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("Upstash adapter contract", () => {
  it("sends one atomic EVAL for a claim and does not call the network from tests", async () => {
    assert.equal(BEGIN_SCRIPT.includes('redis.call("GET"'), true);
    assert.equal(BEGIN_SCRIPT.includes('redis.call("SET"'), true);
    assert.equal(BEGIN_SCRIPT.includes('redis.call("INCR"'), true);
    assert.equal(FINALIZE_SCRIPT.includes('owner ~= ARGV[1]'), true);
    assert.equal(RATE_LIMIT_SCRIPT.includes('redis.call("INCR"'), true);
    assert.equal(BEGIN_SCRIPT.includes("math.random"), false);
    const calls: Array<{ url: string; body: string }> = [];
    const fetchImpl = async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(JSON.stringify({ result: ["claimed"] }), { status: 200 });
    };
    const redis = new UpstashInquiryRedis("https://example.upstash.io", "example-token", fetchImpl);
    const idempotency = new UpstashInquiryIdempotency(redis);
    const claimed = await idempotency.begin({
      clientHash: "client-hash",
      idempotencyHash: "a".repeat(64),
      fingerprint: "b".repeat(64),
      owner: "c".repeat(32),
    });
    assert.equal(claimed.status, "claimed");
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url.startsWith("https://"), true);
    const command = JSON.parse(calls[0]?.body ?? "[]") as string[];
    assert.equal(command[0], "EVAL");
    assert.equal(command[2], "2");
    assert.equal(calls[0]?.body.includes("example-token"), false);
  });

  it("fails closed for an HTTP Redis URL and reports unavailable storage", async () => {
    assert.equal(readUpstashConfig({ UPSTASH_REDIS_REST_URL: "http://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "token" }), null);
    assert.equal(readUpstashConfig({}), null);
    const redis = new UpstashInquiryRedis("http://example.upstash.io", "example-token", async () => {
      throw new Error("should not fetch");
    });
    const limiter = new UpstashInquiryRateLimiter(redis);
    assert.equal((await limiter.consume("client-hash")).status, "unavailable");
  });

  it("treats a stable payload as the same fingerprint and a reordered reference list as different", () => {
    const references = [
      { url: "https://example.com/guide", note: "Navigation" },
      { url: "https://example.com/other" },
    ];
    const first = fingerprintInquiry(inquiry({ references }));
    const second = fingerprintInquiry(inquiry({ references }));
    assert.equal(first, second);
    const reordered = fingerprintInquiry(inquiry({
      references: [references[1], references[0]],
    }));
    assert.notEqual(first, reordered);
  });
});
