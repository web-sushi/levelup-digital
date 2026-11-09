import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";
import { IDEMPOTENCY_RETENTION_SECONDS } from "@/lib/inquiries/idempotency";
import { BEGIN_SCRIPT, FINALIZE_SCRIPT, RATE_LIMIT_SCRIPT } from "@/lib/inquiries/redis-scripts";
import {
  idempotencyResultFromEval,
  rateLimitResultFromEval,
  UpstashInquiryRedis,
} from "@/lib/inquiries/redis-store";
import { SUGGESTED_RATE_LIMIT } from "@/lib/inquiries/schema";

const NAMESPACE = `levelup:test:ls08d2a:${randomBytes(4).toString("hex")}:`;

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

function redact(value: string) {
  return value.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/https?:\/\/\S+/gi, "https://[redacted-host]");
}

const env = loadEnvFile();
const rawUrl = env.UPSTASH_REDIS_REST_URL ?? "";
const token = env.UPSTASH_REDIS_REST_TOKEN ?? "";
const endpoint = (() => {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "https:") {
    throw new Error("Redis REST URL must use HTTPS.");
  }
  return parsed.origin + parsed.pathname;
})();

async function command(args: string[]) {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Redis request failed";
    throw new Error(redact(message));
  }
  const body = (await response.json()) as { result?: unknown; error?: unknown };
  if (!response.ok || body.error !== undefined) {
    const message = typeof body.error === "string" ? body.error : `Redis HTTP ${response.status}`;
    throw new Error(redact(message));
  }
  return body.result;
}

async function listedKeys() {
  const keys: string[] = [];
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
          keys.push(key);
        }
      }
    }
  } while (cursor !== "0");
  return keys;
}

async function cleanup() {
  const keys = await listedKeys();
  for (const key of keys) {
    if (key.startsWith(NAMESPACE)) {
      await command(["DEL", key]);
    }
  }
}

const redis = new UpstashInquiryRedis(rawUrl, token);

function ratePrefix(name: string) {
  return `${NAMESPACE}rl:${name}`;
}

function recordKey(name: string) {
  return `${NAMESPACE}idem:${name}`;
}

async function begin(name: string, fingerprint: string, owner: string, leaseMs: number, retentionSeconds: number) {
  const result = await redis.evaluate(BEGIN_SCRIPT, [recordKey(name), ratePrefix(`with-${name}`)], [
    fingerprint,
    owner,
    "0",
    String(leaseMs),
    String(retentionSeconds),
    String(SUGGESTED_RATE_LIMIT.limit),
    String(SUGGESTED_RATE_LIMIT.windowSeconds),
  ]);
  return idempotencyResultFromEval(result, owner);
}

describe("live Upstash inquiry infrastructure", () => {
  after(async () => {
    await cleanup();
  });

  it("connects and runs Lua EVAL", async () => {
    assert.equal(await command(["PING"]), "PONG");
    const time = await command(["TIME"]);
    assert.equal(Array.isArray(time), true);
    const result = await redis.evaluate(RATE_LIMIT_SCRIPT, [ratePrefix("connect")], ["5", "3600"]);
    assert.equal(rateLimitResultFromEval(result).status, "allowed");
  });

  it("allows five rate-limit attempts and rejects the sixth", async () => {
    const prefix = ratePrefix("serial");
    const statuses: string[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const result = await redis.evaluate(RATE_LIMIT_SCRIPT, [prefix], ["5", "3600"]);
      statuses.push(rateLimitResultFromEval(result).status);
    }
    assert.deepEqual(statuses, ["allowed", "allowed", "allowed", "allowed", "allowed", "limited"]);
    const time = await command(["TIME"]);
    const seconds = Number(Array.isArray(time) ? time[0] : 0);
    const window = Math.floor(seconds / 3600);
    const keys = (await listedKeys()).filter((key) => key.startsWith(`${prefix}:`));
    assert.deepEqual(keys, [`${prefix}:${window}`]);
    const ttl = Number(await command(["TTL", keys[0] ?? ""]));
    assert.equal(ttl > 0 && ttl <= 3600, true);
  });

  it("consumes concurrent attempts atomically", async () => {
    const prefix = ratePrefix("concurrent");
    const results = await Promise.all(
      Array.from({ length: 8 }, () => redis.evaluate(RATE_LIMIT_SCRIPT, [prefix], ["5", "3600"])),
    );
    const statuses = results.map((result) => rateLimitResultFromEval(result).status);
    assert.equal(statuses.filter((status) => status === "allowed").length, 5);
    assert.equal(statuses.filter((status) => status === "limited").length, 3);
    const keys = (await listedKeys()).filter((key) => key.startsWith(`${prefix}:`));
    assert.equal(keys.length, 1);
  });

  it("claims once, rejects a concurrent duplicate, and keeps a payload conflict from overwriting", async () => {
    const first = begin("race", "fingerprint-a", "owner-a", 120_000, 180);
    const second = begin("race", "fingerprint-a", "owner-b", 120_000, 180);
    const results = await Promise.all([first, second]);
    assert.equal(results.filter((result) => result.status === "claimed").length, 1);
    assert.equal(results.filter((result) => result.status === "processing").length, 1);
    const conflict = await begin("race", "fingerprint-b", "owner-c", 120_000, 180);
    assert.equal(conflict.status, "conflict");
    const stored = String(await command(["GET", recordKey("race")]));
    assert.equal(stored.includes("fingerprint-a"), true);
    assert.equal(stored.includes("fingerprint-b"), false);
  });

  it("finalizes accepted, rejected, and unknown outcomes and blocks another owner", async () => {
    assert.equal((await begin("owned", "fingerprint-owned", "owner-real", 120_000, 180)).status, "claimed");
    const wrong = await redis.evaluate(FINALIZE_SCRIPT, [recordKey("owned")], [
      "owner-wrong",
      "accepted",
      "accepted",
      "test",
      "180",
    ]);
    assert.deepEqual(wrong, ["not_owner"]);
    assert.equal(String(await command(["GET", recordKey("owned")])).includes("owner-real"), true);

    const accepted = await redis.evaluate(FINALIZE_SCRIPT, [recordKey("owned")], [
      "owner-real",
      "accepted",
      "accepted",
      "test",
      "180",
    ]);
    assert.deepEqual(accepted, ["finalized"]);
    assert.equal((await begin("owned", "fingerprint-owned", "owner-later", 120_000, 180)).status, "replay_accepted");

    assert.equal((await begin("rejected", "fingerprint-rejected", "owner-real", 120_000, 180)).status, "claimed");
    assert.deepEqual(await redis.evaluate(FINALIZE_SCRIPT, [recordKey("rejected")], ["owner-real", "rejected", "-", "rejected", "180"]), ["finalized"]);
    assert.equal((await begin("rejected", "fingerprint-rejected", "owner-later", 120_000, 180)).status, "replay_rejected");

    assert.equal((await begin("unknown", "fingerprint-unknown", "owner-real", 120_000, 180)).status, "claimed");
    assert.deepEqual(await redis.evaluate(FINALIZE_SCRIPT, [recordKey("unknown")], ["owner-real", "unknown", "-", "network", "180"]), ["finalized"]);
    assert.equal((await begin("unknown", "fingerprint-unknown", "owner-later", 120_000, 180)).status, "replay_unknown");
  });

  it("turns an expired processing lease into unknown and honors seven-day retention", async () => {
    assert.equal((await begin("lease", "fingerprint-lease", "owner-real", 4_000, 180)).status, "claimed");
    assert.equal((await begin("lease", "fingerprint-lease", "owner-other", 4_000, 180)).status, "processing");
    await new Promise((resolve) => setTimeout(resolve, 4_500));
    assert.equal((await begin("lease", "fingerprint-lease", "owner-other", 2_000, 180)).status, "replay_unknown");
    assert.equal((await begin("lease", "fingerprint-lease", "owner-other", 2_000, 180)).status, "replay_unknown");

    assert.equal((await begin("retention", "fingerprint-retention", "owner-real", 120_000, IDEMPOTENCY_RETENTION_SECONDS)).status, "claimed");
    const ttl = Number(await command(["TTL", recordKey("retention")]));
    assert.equal(ttl > IDEMPOTENCY_RETENTION_SECONDS - 30 && ttl <= IDEMPOTENCY_RETENTION_SECONDS, true);
  });

  it("treats a malformed Redis result and a network failure as unavailable", async () => {
    const malformed = await redis.evaluate("return 'bad'", [recordKey("malformed")], []);
    assert.equal(rateLimitResultFromEval(malformed).status, "unavailable");
    assert.equal(idempotencyResultFromEval(malformed, "owner-real").status, "unavailable");
    assert.equal(await redis.evaluate("this is not lua", [recordKey("syntax")], []), null);

    const offline = new UpstashInquiryRedis("https://127.0.0.1:9", "local-dummy-token");
    assert.equal((await offline.consume("synthetic-client")).status, "unavailable");
  });
});
