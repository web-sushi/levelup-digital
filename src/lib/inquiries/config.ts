import { rateLimitSecret, readTrustedHttpsOrigins, UnavailableRateLimiter } from "@/lib/inquiries/abuse-protection";
import { createBrevoInquiryDelivery, type BrevoFetch } from "@/lib/inquiries/brevo-delivery";
import { UnavailableInquiryDelivery } from "@/lib/inquiries/delivery";
import { publicInquirySubmissionsAvailable } from "@/lib/inquiries/public-availability";
import { assessInquiryActivation, CANONICAL_SITE_ORIGIN } from "@/lib/inquiries/readiness";
import {
  readUpstashConfig,
  UpstashInquiryIdempotency,
  UpstashInquiryRateLimiter,
  UpstashInquiryRedis,
  type UpstashKeyScope,
} from "@/lib/inquiries/redis-store";
import type { InquiryDelivery, InquiryRuntime } from "@/lib/inquiries/types";

export type PreparedRuntimeOptions = {
  /** Test harnesses inject a mock. The public route cannot pass this. */
  delivery?: InquiryDelivery;
  /** Test harnesses pass a namespaced Redis client. Production keys stay the default. */
  redis?: UpstashInquiryRedis;
  fetchImpl?: BrevoFetch;
  keyScope?: UpstashKeyScope;
};

export type PublicRuntimeOptions = PreparedRuntimeOptions & {
  /** Test-only stand-in for the source activation constant. The public route does not pass this. */
  ownerActivation?: boolean;
};

function closedRuntime(env: NodeJS.ProcessEnv): InquiryRuntime {
  const trusted = readTrustedHttpsOrigins(env.INQUIRY_TRUSTED_ORIGINS);
  return {
    submissionsEnabled: env.INQUIRY_SUBMISSIONS_ENABLED === "true",
    trustedOrigins: trusted.invalid ? [] : trusted.origins,
    allowDevelopmentOrigins: env.NODE_ENV === "development",
    rateLimitKeySecret: rateLimitSecret(env.INQUIRY_RATE_LIMIT_KEY_SECRET),
    rateLimiter: new UnavailableRateLimiter(),
    idempotency: null,
    idempotencyKeySecret: null,
    delivery: new UnavailableInquiryDelivery(),
  };
}

function publicClosedRuntime(env: NodeJS.ProcessEnv): InquiryRuntime {
  return {
    ...closedRuntime(env),
    submissionsEnabled: false,
  };
}

function canonicalOriginListed(env: NodeJS.ProcessEnv) {
  const trusted = readTrustedHttpsOrigins(env.INQUIRY_TRUSTED_ORIGINS);
  return !trusted.invalid && trusted.origins.includes(CANONICAL_SITE_ORIGIN);
}

/**
 * Attaches the tested Redis and Brevo adapters. Construction does not call either service.
 * Returns the closed runtime when the configuration cannot support them.
 */
function attachLiveAdapters(env: NodeJS.ProcessEnv, options: PreparedRuntimeOptions): InquiryRuntime {
  const upstash = readUpstashConfig({
    UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
  });
  const trusted = readTrustedHttpsOrigins(env.INQUIRY_TRUSTED_ORIGINS);
  const rateSecret = rateLimitSecret(env.INQUIRY_RATE_LIMIT_KEY_SECRET);
  const idempotencySecret = rateLimitSecret(env.INQUIRY_IDEMPOTENCY_KEY_SECRET);
  if (!upstash || trusted.invalid || trusted.origins.length === 0 || !rateSecret || !idempotencySecret) {
    return closedRuntime(env);
  }
  const redis = options.redis ?? new UpstashInquiryRedis(
    upstash.url,
    upstash.token,
    fetch,
    options.keyScope ?? undefined,
  );
  return {
    submissionsEnabled: env.INQUIRY_SUBMISSIONS_ENABLED === "true",
    trustedOrigins: trusted.origins,
    allowDevelopmentOrigins: env.NODE_ENV === "development",
    rateLimitKeySecret: rateSecret,
    idempotencyKeySecret: idempotencySecret,
    rateLimiter: new UpstashInquiryRateLimiter(redis),
    idempotency: new UpstashInquiryIdempotency(redis),
    delivery: options.delivery ?? createBrevoInquiryDelivery({
      BREVO_API_KEY: env.BREVO_API_KEY,
      BREVO_SENDER_EMAIL: env.BREVO_SENDER_EMAIL,
      BREVO_SENDER_NAME: env.BREVO_SENDER_NAME,
      INQUIRY_NOTIFICATION_EMAIL: env.INQUIRY_NOTIFICATION_EMAIL,
    }, { fetchImpl: options.fetchImpl }),
  };
}

/**
 * Public route runtime.
 * Live adapters attach only when the source activation constant is true, the
 * launch gate and submission flag are set, and Redis, Brevo, secrets, and the
 * canonical origin are valid. Environment variables alone stay closed.
 * The default argument reads configuration per request. It does not run at import.
 */
export function createInquiryRuntime(
  env: NodeJS.ProcessEnv = process.env,
  options: PublicRuntimeOptions = {},
): InquiryRuntime {
  const ownerActivation = options.ownerActivation ?? publicInquirySubmissionsAvailable;
  if (!ownerActivation) {
    return publicClosedRuntime(env);
  }
  const assessment = assessInquiryActivation(env);
  if (assessment.state !== "ready_for_launch_review" || !canonicalOriginListed(env)) {
    return publicClosedRuntime(env);
  }
  const runtime = attachLiveAdapters(env, options);
  if (!runtime.submissionsEnabled || runtime.idempotency === null) {
    return publicClosedRuntime(env);
  }
  return runtime;
}

/**
 * Builds Redis and Brevo adapters only for an explicit testing or launch gate
 * with complete configuration. The public route does not call this function.
 */
export function createPreparedInquiryRuntime(
  env: NodeJS.ProcessEnv = process.env,
  options: PreparedRuntimeOptions = {},
): InquiryRuntime {
  const assessment = assessInquiryActivation(env);
  const gateOpen = assessment.state === "ready_for_controlled_testing" || assessment.state === "ready_for_launch_review";
  if (!gateOpen) {
    return closedRuntime(env);
  }
  return attachLiveAdapters(env, options);
}
