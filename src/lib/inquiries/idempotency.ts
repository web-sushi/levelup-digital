import { createHash, createHmac } from "node:crypto";
import type { ValidatedInquiry } from "@/lib/inquiries/types";

export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
export const IDEMPOTENCY_LEASE_MS = 120_000;
export const IDEMPOTENCY_RETENTION_SECONDS = 7 * 24 * 60 * 60;
export const RATE_LIMIT_PREFIX = "inquiry:ratelimit:v1";
export const IDEMPOTENCY_PREFIX = "inquiry:idempotency:v1";

export function parseIdempotencyKey(header: string | null) {
  if (header === null || !IDEMPOTENCY_KEY_PATTERN.test(header)) {
    return null;
  }
  return header;
}

export function fingerprintInquiry(inquiry: ValidatedInquiry) {
  const canonical = JSON.stringify([
    inquiry.projectType,
    inquiry.budget,
    inquiry.timeline,
    inquiry.name,
    inquiry.email,
    inquiry.business ?? "",
    inquiry.details ?? "",
    inquiry.references.map((reference) => [reference.url, reference.note ?? ""]),
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}

export function hashIdempotencyKey(key: string, secret: string) {
  return createHmac("sha256", secret).update(key).digest("hex");
}

export function rateLimitPrefix(clientHash: string) {
  return `${RATE_LIMIT_PREFIX}:${clientHash}`;
}

export function rateWindowKey(clientHash: string, now: number, windowSeconds: number) {
  const windowId = Math.floor(now / 1000 / windowSeconds);
  return `${rateLimitPrefix(clientHash)}:${windowId}`;
}

export function idempotencyRedisKey(idempotencyHash: string) {
  return `${IDEMPOTENCY_PREFIX}:${idempotencyHash}`;
}
