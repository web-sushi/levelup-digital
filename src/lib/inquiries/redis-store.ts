import { SUGGESTED_RATE_LIMIT } from "@/lib/inquiries/schema";
import {
  IDEMPOTENCY_LEASE_MS,
  IDEMPOTENCY_PREFIX,
  IDEMPOTENCY_RETENTION_SECONDS,
  RATE_LIMIT_PREFIX,
  idempotencyRedisKey,
  rateWindowKey,
} from "@/lib/inquiries/idempotency";
import { BEGIN_SCRIPT, FINALIZE_SCRIPT, RATE_LIMIT_SCRIPT } from "@/lib/inquiries/redis-scripts";
import type {
  IdempotencyBeginResult,
  IdempotencyFinalizeResult,
  InquiryIdempotency,
  InquiryRateLimiter,
  RateLimitResult,
} from "@/lib/inquiries/types";

type StoredValue = {
  value: string;
  expiresAt: number;
};

type RecordState = "processing" | "accepted" | "rejected" | "unknown";

type InquiryRecord = {
  state: RecordState;
  fingerprint: string;
  owner: string;
  leaseUntil: number;
  confirmation: string;
  category: string;
};

const CONFIRMATIONS = new Set(["accepted", "rejected", "unknown", "-"]);
const STATES = new Set<RecordState>(["processing", "accepted", "rejected", "unknown"]);

function encodeRecord(record: InquiryRecord) {
  return [
    "v1",
    record.state,
    record.fingerprint,
    record.owner,
    String(record.leaseUntil),
    record.confirmation,
    record.category,
  ].join("|");
}

function decodeRecord(raw: string): InquiryRecord | null {
  const parts = raw.split("|");
  if (parts.length !== 7 || parts[0] !== "v1") {
    return null;
  }
  const state = parts[1];
  if (!STATES.has(state as RecordState)) {
    return null;
  }
  const leaseUntil = Number(parts[4]);
  if (!Number.isFinite(leaseUntil)) {
    return null;
  }
  return {
    state: state as RecordState,
    fingerprint: parts[2] ?? "",
    owner: parts[3] ?? "",
    leaseUntil,
    confirmation: parts[5] ?? "-",
    category: parts[6] ?? "-",
  };
}

function safeToken(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    return "-";
  }
  return value;
}

function retryAfter(ttlSeconds: number, windowSeconds: number) {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds < 1) {
    return windowSeconds;
  }
  return Math.ceil(ttlSeconds);
}

/**
 * In-memory Redis substitute for tests. It is not a production limiter.
 * Mutations for one command finish before the function yields.
 */
export class MemoryInquiryRedis {
  private readonly values = new Map<string, StoredValue>();
  now: () => number = () => Date.now();
  failRateLimit = false;
  failBegin = false;
  failFinalize = false;

  keys() {
    return [...this.values.keys()];
  }

  read(key: string) {
    const current = this.values.get(key);
    if (!current) {
      return null;
    }
    if (current.expiresAt <= this.now()) {
      this.values.delete(key);
      return null;
    }
    return current.value;
  }

  write(key: string, value: string, retentionSeconds: number) {
    this.values.set(key, {
      value,
      expiresAt: this.now() + retentionSeconds * 1000,
    });
  }

  increment(key: string, windowSeconds: number) {
    const existing = this.read(key);
    const count = existing === null ? 1 : Number(existing) + 1;
    if (existing === null) {
      this.write(key, "1", windowSeconds);
    } else {
      const current = this.values.get(key);
      if (!current) {
        this.write(key, String(count), windowSeconds);
      } else {
        current.value = String(count);
      }
    }
    const stored = this.values.get(key);
    const ttlSeconds = stored ? Math.ceil((stored.expiresAt - this.now()) / 1000) : windowSeconds;
    return { count, ttlSeconds: retryAfter(ttlSeconds, windowSeconds) };
  }
}

function confirmationFrom(value: string | undefined): "accepted" | "rejected" | "unknown" | undefined {
  if (value === "accepted" || value === "rejected" || value === "unknown") {
    return value;
  }
  return undefined;
}

export class MemoryInquiryRateLimiter implements InquiryRateLimiter {
  private readonly redis: MemoryInquiryRedis;

  constructor(redis: MemoryInquiryRedis) {
    this.redis = redis;
  }

  async consume(clientKey: string): Promise<RateLimitResult> {
    if (this.redis.failRateLimit) {
      return { status: "unavailable" };
    }
    const key = rateWindowKey(clientKey, this.redis.now(), SUGGESTED_RATE_LIMIT.windowSeconds);
    const slot = this.redis.increment(key, SUGGESTED_RATE_LIMIT.windowSeconds);
    if (slot.count > SUGGESTED_RATE_LIMIT.limit) {
      return { status: "limited", retryAfterSeconds: slot.ttlSeconds };
    }
    return { status: "allowed" };
  }
}

export class MemoryInquiryIdempotency implements InquiryIdempotency {
  private readonly redis: MemoryInquiryRedis;

  constructor(redis: MemoryInquiryRedis) {
    this.redis = redis;
  }

  async begin(input: {
    clientHash: string;
    idempotencyHash: string;
    fingerprint: string;
    owner: string;
  }): Promise<IdempotencyBeginResult> {
    if (this.redis.failBegin) {
      return { status: "unavailable" };
    }
    const now = this.redis.now();
    const recordKey = idempotencyRedisKey(input.idempotencyHash);
    const windowKey = rateWindowKey(input.clientHash, now, SUGGESTED_RATE_LIMIT.windowSeconds);
    const raw = this.redis.read(recordKey);
    if (raw) {
      const record = decodeRecord(raw);
      if (!record) {
        return { status: "unavailable" };
      }
      if (record.fingerprint !== input.fingerprint) {
        const slot = this.redis.increment(windowKey, SUGGESTED_RATE_LIMIT.windowSeconds);
        if (slot.count > SUGGESTED_RATE_LIMIT.limit) {
          return { status: "limited", retryAfterSeconds: slot.ttlSeconds };
        }
        return { status: "conflict" };
      }
      if (record.state === "accepted") {
        return { status: "replay_accepted", confirmation: confirmationFrom(record.confirmation) };
      }
      if (record.state === "rejected") {
        return { status: "replay_rejected" };
      }
      if (record.state === "unknown") {
        return { status: "replay_unknown" };
      }
      if (now >= record.leaseUntil) {
        this.redis.write(
          recordKey,
          encodeRecord({
            state: "unknown",
            fingerprint: record.fingerprint,
            owner: "-",
            leaseUntil: 0,
            confirmation: "-",
            category: "lease_expired",
          }),
          IDEMPOTENCY_RETENTION_SECONDS,
        );
        return { status: "replay_unknown" };
      }
      const slot = this.redis.increment(windowKey, SUGGESTED_RATE_LIMIT.windowSeconds);
      if (slot.count > SUGGESTED_RATE_LIMIT.limit) {
        return { status: "limited", retryAfterSeconds: slot.ttlSeconds };
      }
      return { status: "processing" };
    }

    const slot = this.redis.increment(windowKey, SUGGESTED_RATE_LIMIT.windowSeconds);
    if (slot.count > SUGGESTED_RATE_LIMIT.limit) {
      return { status: "limited", retryAfterSeconds: slot.ttlSeconds };
    }
    this.redis.write(
      recordKey,
      encodeRecord({
        state: "processing",
        fingerprint: input.fingerprint,
        owner: input.owner,
        leaseUntil: now + IDEMPOTENCY_LEASE_MS,
        confirmation: "-",
        category: "-",
      }),
      IDEMPOTENCY_RETENTION_SECONDS,
    );
    return { status: "claimed", owner: input.owner };
  }

  async finalize(input: {
    idempotencyHash: string;
    owner: string;
    state: "accepted" | "rejected" | "unknown";
    confirmation: "accepted" | "rejected" | "unknown" | "-";
    category: string;
  }): Promise<IdempotencyFinalizeResult> {
    if (this.redis.failFinalize) {
      return "unavailable";
    }
    const recordKey = idempotencyRedisKey(input.idempotencyHash);
    const raw = this.redis.read(recordKey);
    if (!raw) {
      return "unavailable";
    }
    const record = decodeRecord(raw);
    if (!record || record.owner !== input.owner || record.state !== "processing") {
      return "not_owner";
    }
    this.redis.write(
      recordKey,
      encodeRecord({
        state: input.state,
        fingerprint: record.fingerprint,
        owner: "-",
        leaseUntil: 0,
        confirmation: CONFIRMATIONS.has(input.confirmation) ? input.confirmation : "-",
        category: safeToken(input.category),
      }),
      IDEMPOTENCY_RETENTION_SECONDS,
    );
    return "finalized";
  }
}

export function createMemoryInquiryInfrastructure() {
  const redis = new MemoryInquiryRedis();
  return {
    redis,
    rateLimiter: new MemoryInquiryRateLimiter(redis),
    idempotency: new MemoryInquiryIdempotency(redis),
  };
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export type UpstashKeyScope = {
  ratePrefix: string;
  idempotencyPrefix: string;
};

/** Production key names. A test harness must pass a `levelup:test:` scope instead. */
export function upstashKeyScope(namespace?: string): UpstashKeyScope {
  if (namespace === undefined) {
    return { ratePrefix: RATE_LIMIT_PREFIX, idempotencyPrefix: IDEMPOTENCY_PREFIX };
  }
  const root = namespace.endsWith(":") ? namespace.slice(0, -1) : namespace;
  if (!root.startsWith("levelup:test:")) {
    throw new Error("A Redis test scope must start with levelup:test:");
  }
  return {
    ratePrefix: `${root}:ratelimit`,
    idempotencyPrefix: `${root}:idempotency`,
  };
}

export class UpstashInquiryRedis {
  private readonly url: string;
  private readonly token: string;
  private readonly fetchImpl: FetchLike;
  readonly scope: UpstashKeyScope;

  constructor(url: string, token: string, fetchImpl: FetchLike = fetch, scope: UpstashKeyScope = upstashKeyScope()) {
    this.url = url;
    this.token = token;
    this.fetchImpl = fetchImpl;
    this.scope = scope ?? upstashKeyScope();
  }

  async evaluate(script: string, keys: string[], args: string[]) {
    try {
      const parsed = new URL(this.url);
      if (parsed.protocol !== "https:") {
        return null;
      }
      const response = await this.fetchImpl(parsed.origin + parsed.pathname, {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(["EVAL", script, String(keys.length), ...keys, ...args]),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        return null;
      }
      const body = (await response.json()) as { result?: unknown; error?: unknown };
      if (body.error !== undefined) {
        return null;
      }
      return body.result ?? null;
    } catch {
      return null;
    }
  }

  async consume(clientKey: string): Promise<RateLimitResult> {
    const result = await this.evaluate(RATE_LIMIT_SCRIPT, [`${this.scope.ratePrefix}:${clientKey}`], [
      String(SUGGESTED_RATE_LIMIT.limit),
      String(SUGGESTED_RATE_LIMIT.windowSeconds),
    ]);
    return rateLimitResultFromEval(result);
  }
}

export function rateLimitResultFromEval(result: unknown): RateLimitResult {
  if (!Array.isArray(result) || result.length < 2) {
    return { status: "unavailable" };
  }
  const allowed = Number(result[0]) === 1;
  const ttl = Number(result[1]);
  if (!allowed) {
    return { status: "limited", retryAfterSeconds: retryAfter(ttl, SUGGESTED_RATE_LIMIT.windowSeconds) };
  }
  return { status: "allowed" };
}

export function idempotencyResultFromEval(result: unknown, owner: string): IdempotencyBeginResult {
  if (!Array.isArray(result) || typeof result[0] !== "string") {
    return { status: "unavailable" };
  }
  const [kind, extra] = result;
  if (kind === "claimed") {
    return { status: "claimed", owner };
  }
  if (kind === "processing") {
    return { status: "processing" };
  }
  if (kind === "accepted") {
    return { status: "replay_accepted", confirmation: confirmationFrom(typeof extra === "string" ? extra : undefined) };
  }
  if (kind === "rejected") {
    return { status: "replay_rejected" };
  }
  if (kind === "unknown") {
    return { status: "replay_unknown" };
  }
  if (kind === "conflict") {
    return { status: "conflict" };
  }
  if (kind === "limited") {
    return { status: "limited", retryAfterSeconds: retryAfter(Number(extra), SUGGESTED_RATE_LIMIT.windowSeconds) };
  }
  return { status: "unavailable" };
}

export class UpstashInquiryIdempotency implements InquiryIdempotency {
  private readonly redis: UpstashInquiryRedis;

  constructor(redis: UpstashInquiryRedis) {
    this.redis = redis;
  }

  async begin(input: {
    clientHash: string;
    idempotencyHash: string;
    fingerprint: string;
    owner: string;
  }): Promise<IdempotencyBeginResult> {
    const now = Date.now();
    const result = await this.redis.evaluate(BEGIN_SCRIPT, [
      `${this.redis.scope.idempotencyPrefix}:${input.idempotencyHash}`,
      `${this.redis.scope.ratePrefix}:${input.clientHash}`,
    ], [
      input.fingerprint,
      input.owner,
      String(now),
      String(IDEMPOTENCY_LEASE_MS),
      String(IDEMPOTENCY_RETENTION_SECONDS),
      String(SUGGESTED_RATE_LIMIT.limit),
      String(SUGGESTED_RATE_LIMIT.windowSeconds),
    ]);
    return idempotencyResultFromEval(result, input.owner);
  }

  async finalize(input: {
    idempotencyHash: string;
    owner: string;
    state: "accepted" | "rejected" | "unknown";
    confirmation: "accepted" | "rejected" | "unknown" | "-";
    category: string;
  }): Promise<IdempotencyFinalizeResult> {
    const result = await this.redis.evaluate(FINALIZE_SCRIPT, [`${this.redis.scope.idempotencyPrefix}:${input.idempotencyHash}`], [
      input.owner,
      input.state,
      CONFIRMATIONS.has(input.confirmation) ? input.confirmation : "-",
      safeToken(input.category),
      String(IDEMPOTENCY_RETENTION_SECONDS),
    ]);
    if (!Array.isArray(result) || result[0] !== "finalized") {
      if (Array.isArray(result) && result[0] === "not_owner") {
        return "not_owner";
      }
      return "unavailable";
    }
    return "finalized";
  }
}

export function readUpstashConfig(env: { UPSTASH_REDIS_REST_URL?: string; UPSTASH_REDIS_REST_TOKEN?: string }) {
  const url = env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
  if (!url || !token) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return null;
    }
  } catch {
    return null;
  }
  return { url, token };
}

export class UpstashInquiryRateLimiter implements InquiryRateLimiter {
  private readonly redis: UpstashInquiryRedis;

  constructor(redis: UpstashInquiryRedis) {
    this.redis = redis;
  }

  async consume(clientKey: string): Promise<RateLimitResult> {
    return this.redis.consume(clientKey);
  }
}
