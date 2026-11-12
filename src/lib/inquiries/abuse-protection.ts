import { createHmac } from "node:crypto";
import { DEVELOPMENT_ORIGINS, HONEYPOT_FIELD, SUGGESTED_RATE_LIMIT } from "@/lib/inquiries/schema";
import type { InquiryRateLimiter, RateLimitResult } from "@/lib/inquiries/types";

const MIN_RATE_LIMIT_SECRET_LENGTH = 16;

export function normalizeOrigin(value: string) {
  try {
    const url = new URL(value);
    if (url.origin === "null" || url.username || url.password) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

const LOCAL_ORIGIN_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Explicit HTTPS origins only. Localhost and wildcards are rejected.
 * Development localhost access stays on the separate development list.
 */
export function readTrustedHttpsOrigins(value: string | undefined) {
  const origins: string[] = [];
  let invalid = false;
  if (!value || value.trim().length === 0) {
    return { origins, invalid };
  }
  for (const item of value.split(",")) {
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed.includes("*")) {
      invalid = true;
      continue;
    }
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      invalid = true;
      continue;
    }
    if (url.protocol !== "https:" || url.username || url.password || LOCAL_ORIGIN_HOSTS.has(url.hostname)) {
      invalid = true;
      continue;
    }
    origins.push(url.origin);
  }
  return { origins, invalid };
}

export function isOriginAllowed(
  originHeader: string | null,
  trustedOrigins: readonly string[],
  allowDevelopmentOrigins: boolean,
) {
  if (originHeader === null || originHeader.trim() === "") {
    return allowDevelopmentOrigins;
  }
  const origin = normalizeOrigin(originHeader);
  if (!origin) {
    return false;
  }
  const trusted = new Set(trustedOrigins.map((item) => normalizeOrigin(item)).filter((item): item is string => item !== null));
  if (allowDevelopmentOrigins) {
    for (const developmentOrigin of DEVELOPMENT_ORIGINS) {
      trusted.add(developmentOrigin);
    }
  }
  return trusted.has(origin);
}

export function honeypotTriggered(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export function honeypotField() {
  return HONEYPOT_FIELD;
}

/**
 * Vercel overwrites `x-forwarded-for` and does not forward a caller-supplied
 * address. `x-vercel-forwarded-for` carries that same platform address and
 * remains usable if a proxy later rewrites `x-forwarded-for`.
 * `x-forwarded-for` and `x-real-ip` are ignored. A comma-separated list is
 * rejected so a caller cannot choose the rate-limit bucket by prefixing an
 * address. A missing or unusable address fails closed.
 */
export function trustedClientAddress(headers: Headers) {
  const header = headers.get("x-vercel-forwarded-for");
  if (!header || header.includes(",")) {
    return null;
  }
  const address = header.trim();
  if (!address || address.length > 128 || !/^[0-9a-fA-F:.]+$/.test(address)) {
    return null;
  }
  return address;
}

export function rateLimitSecret(value: string | null | undefined) {
  if (!value || value.trim().length < MIN_RATE_LIMIT_SECRET_LENGTH) {
    return null;
  }
  return value.trim();
}

export function hashClientKey(address: string, secret: string) {
  return createHmac("sha256", secret).update(address).digest("hex");
}

export class UnavailableRateLimiter implements InquiryRateLimiter {
  async consume(): Promise<RateLimitResult> {
    return { status: "unavailable" };
  }
}

export const recommendedRateLimit = SUGGESTED_RATE_LIMIT;
