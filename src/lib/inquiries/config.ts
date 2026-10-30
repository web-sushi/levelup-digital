import { UnavailableRateLimiter, rateLimitSecret } from "@/lib/inquiries/abuse-protection";
import { UnavailableInquiryDelivery } from "@/lib/inquiries/delivery";
import type { InquiryRuntime } from "@/lib/inquiries/types";

function trustedOriginsFromEnv(value: string | undefined) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function createInquiryRuntime(env: NodeJS.ProcessEnv = process.env): InquiryRuntime {
  return {
    submissionsEnabled: env.INQUIRY_SUBMISSIONS_ENABLED === "true",
    trustedOrigins: trustedOriginsFromEnv(env.INQUIRY_TRUSTED_ORIGINS),
    allowDevelopmentOrigins: env.NODE_ENV === "development",
    rateLimitKeySecret: rateLimitSecret(env.INQUIRY_RATE_LIMIT_KEY_SECRET),
    rateLimiter: new UnavailableRateLimiter(),
    idempotency: null,
    idempotencyKeySecret: null,
    // Redis credentials and Brevo credentials must not select a live adapter.
    delivery: new UnavailableInquiryDelivery(),
  };
}
