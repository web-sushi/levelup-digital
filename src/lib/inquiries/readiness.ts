import { normalizeOrigin, rateLimitSecret, UnavailableRateLimiter } from "@/lib/inquiries/abuse-protection";
import { readBrevoMailConfig } from "@/lib/inquiries/brevo-delivery";
import { createInquiryRuntime } from "@/lib/inquiries/config";
import { UnavailableInquiryDelivery } from "@/lib/inquiries/delivery";
import { publicInquirySubmissionsAvailable } from "@/lib/inquiries/public-availability";
import { readUpstashConfig } from "@/lib/inquiries/redis-store";

export const EXPECTED_BREVO_SENDER_EMAIL = "levelupdigital.support@gmail.com";
export const EXPECTED_BREVO_SENDER_NAME = "LevelUp Digital";
export const EXPECTED_BREVO_NOTIFICATION_EMAIL = "levelupdigital.support@gmail.com";

export type InquiryActivationBlocker =
  | "submissions_disabled"
  | "trusted_origins"
  | "rate_limit_secret"
  | "idempotency_secret"
  | "secrets_not_distinct"
  | "redis"
  | "brevo";

export type InquiryActivationAssessment = {
  /**
   * Every server prerequisite is present.
   * This does not attach adapters or authorize a public submission.
   */
  serverConfigured: boolean;
  missing: InquiryActivationBlocker[];
  publicPageEnabled: boolean;
  adaptersAttached: boolean;
};

function httpsOrigins(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => {
      const origin = normalizeOrigin(item);
      return origin !== null && origin.startsWith("https://");
    });
}

/**
 * Reports whether a future activation would have the required server configuration.
 * `createInquiryRuntime` remains fail-closed regardless of this result.
 */
export function assessInquiryActivation(env: NodeJS.ProcessEnv = process.env): InquiryActivationAssessment {
  const missing: InquiryActivationBlocker[] = [];
  if (env.INQUIRY_SUBMISSIONS_ENABLED !== "true") {
    missing.push("submissions_disabled");
  }
  if (httpsOrigins(env.INQUIRY_TRUSTED_ORIGINS).length === 0) {
    missing.push("trusted_origins");
  }
  const rateSecret = rateLimitSecret(env.INQUIRY_RATE_LIMIT_KEY_SECRET);
  const idempotencySecret = rateLimitSecret(env.INQUIRY_IDEMPOTENCY_KEY_SECRET);
  if (!rateSecret) {
    missing.push("rate_limit_secret");
  }
  if (!idempotencySecret) {
    missing.push("idempotency_secret");
  } else if (rateSecret && idempotencySecret === rateSecret) {
    missing.push("secrets_not_distinct");
  }
  if (!readUpstashConfig({
    UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
  })) {
    missing.push("redis");
  }
  if (!readBrevoMailConfig({
    BREVO_API_KEY: env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: env.BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME: env.BREVO_SENDER_NAME,
    INQUIRY_NOTIFICATION_EMAIL: env.INQUIRY_NOTIFICATION_EMAIL,
  }).ok) {
    missing.push("brevo");
  }

  const runtime = createInquiryRuntime(env);
  const adaptersAttached = !(
    runtime.rateLimiter instanceof UnavailableRateLimiter &&
    runtime.delivery instanceof UnavailableInquiryDelivery &&
    (runtime.idempotency === null || runtime.idempotency === undefined)
  );

  return {
    serverConfigured: missing.length === 0,
    missing,
    publicPageEnabled: publicInquirySubmissionsAvailable,
    adaptersAttached,
  };
}
