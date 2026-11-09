import { rateLimitSecret, readTrustedHttpsOrigins } from "@/lib/inquiries/abuse-protection";
import { readBrevoMailConfig } from "@/lib/inquiries/brevo-delivery";
import { publicInquirySubmissionsAvailable } from "@/lib/inquiries/public-availability";
import { readUpstashConfig } from "@/lib/inquiries/redis-store";

export const EXPECTED_BREVO_SENDER_EMAIL = "levelupdigital.support@gmail.com";
export const EXPECTED_BREVO_SENDER_NAME = "LevelUp Digital";
export const EXPECTED_BREVO_NOTIFICATION_EMAIL = "levelupdigital.support@gmail.com";
export const CANONICAL_SITE_ORIGIN = "https://levelup-digital.dev";

export const ACTIVATION_GATE_VALUES = ["disabled", "testing", "launch"] as const;

export type InquiryActivationGate = (typeof ACTIVATION_GATE_VALUES)[number] | "missing" | "invalid";

export type InquiryReadinessState =
  | "misconfigured"
  | "disabled"
  | "configured"
  | "ready_for_controlled_testing"
  | "ready_for_launch_review";

export type InquiryReadiness = {
  state: InquiryReadinessState;
  /** Present, valid configuration. This does not mean Redis or Brevo was contacted. */
  configurationComplete: boolean;
  missing: string[];
  invalid: string[];
  submissionsEnabled: boolean;
  activationGate: InquiryActivationGate;
  publicPageEnabled: boolean;
  /** The public route factory does not attach live adapters in this phase. */
  publicRouteUsesLiveAdapters: false;
  brevoAuthenticationVerified: false;
  inboxDeliveryVerified: false;
};

function submissionsFlag(value: string | undefined) {
  if (value === undefined || value.trim().length === 0) {
    return "missing" as const;
  }
  if (value === "true") {
    return "enabled" as const;
  }
  if (value === "false") {
    return "disabled" as const;
  }
  return "invalid" as const;
}

export function readActivationGate(value: string | undefined): InquiryActivationGate {
  if (value === undefined || value.trim().length === 0) {
    return "missing";
  }
  const token = value.trim();
  if (token === "disabled" || token === "testing" || token === "launch") {
    return token;
  }
  return "invalid";
}

function pushUnique(list: string[], name: string) {
  if (!list.includes(name)) {
    list.push(name);
  }
}

/**
 * Classifies local configuration. It does not open Redis or Brevo.
 * An API key does not prove sender authentication or inbox delivery.
 */
export function assessInquiryActivation(env: NodeJS.ProcessEnv = process.env): InquiryReadiness {
  const missing: string[] = [];
  const invalid: string[] = [];
  const flag = submissionsFlag(env.INQUIRY_SUBMISSIONS_ENABLED);
  if (flag === "missing") {
    pushUnique(missing, "INQUIRY_SUBMISSIONS_ENABLED");
  } else if (flag === "invalid") {
    pushUnique(invalid, "INQUIRY_SUBMISSIONS_ENABLED");
  }

  const gate = readActivationGate(env.INQUIRY_ACTIVATION_GATE);
  if (gate === "missing") {
    pushUnique(missing, "INQUIRY_ACTIVATION_GATE");
  } else if (gate === "invalid") {
    pushUnique(invalid, "INQUIRY_ACTIVATION_GATE");
  }

  if (env.INQUIRY_TRUSTED_ORIGINS === undefined || env.INQUIRY_TRUSTED_ORIGINS.trim().length === 0) {
    pushUnique(missing, "INQUIRY_TRUSTED_ORIGINS");
  } else {
    const trusted = readTrustedHttpsOrigins(env.INQUIRY_TRUSTED_ORIGINS);
    if (trusted.invalid || trusted.origins.length === 0) {
      pushUnique(invalid, "INQUIRY_TRUSTED_ORIGINS");
    }
  }

  const rateSecret = rateLimitSecret(env.INQUIRY_RATE_LIMIT_KEY_SECRET);
  const idempotencySecret = rateLimitSecret(env.INQUIRY_IDEMPOTENCY_KEY_SECRET);
  if (env.INQUIRY_RATE_LIMIT_KEY_SECRET === undefined || env.INQUIRY_RATE_LIMIT_KEY_SECRET.trim().length === 0) {
    pushUnique(missing, "INQUIRY_RATE_LIMIT_KEY_SECRET");
  } else if (!rateSecret) {
    pushUnique(invalid, "INQUIRY_RATE_LIMIT_KEY_SECRET");
  }
  if (env.INQUIRY_IDEMPOTENCY_KEY_SECRET === undefined || env.INQUIRY_IDEMPOTENCY_KEY_SECRET.trim().length === 0) {
    pushUnique(missing, "INQUIRY_IDEMPOTENCY_KEY_SECRET");
  } else if (!idempotencySecret) {
    pushUnique(invalid, "INQUIRY_IDEMPOTENCY_KEY_SECRET");
  } else if (rateSecret && idempotencySecret === rateSecret) {
    pushUnique(invalid, "INQUIRY_IDEMPOTENCY_KEY_SECRET");
  }

  const redisUrl = env.UPSTASH_REDIS_REST_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl === undefined || redisUrl.trim().length === 0) {
    pushUnique(missing, "UPSTASH_REDIS_REST_URL");
  }
  if (redisToken === undefined || redisToken.trim().length === 0) {
    pushUnique(missing, "UPSTASH_REDIS_REST_TOKEN");
  }
  if (redisUrl && redisUrl.trim() && redisToken && redisToken.trim() && !readUpstashConfig({
    UPSTASH_REDIS_REST_URL: redisUrl,
    UPSTASH_REDIS_REST_TOKEN: redisToken,
  })) {
    pushUnique(invalid, "UPSTASH_REDIS_REST_URL");
  }

  const brevo = readBrevoMailConfig({
    BREVO_API_KEY: env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: env.BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME: env.BREVO_SENDER_NAME,
    INQUIRY_NOTIFICATION_EMAIL: env.INQUIRY_NOTIFICATION_EMAIL,
  });
  if (!brevo.ok) {
    const names = {
      apiKey: "BREVO_API_KEY",
      senderEmail: "BREVO_SENDER_EMAIL",
      senderName: "BREVO_SENDER_NAME",
      notificationEmail: "INQUIRY_NOTIFICATION_EMAIL",
    } as const;
    for (const issue of brevo.issues) {
      pushUnique(issue.problem === "missing" ? missing : invalid, names[issue.field]);
    }
  } else {
    if (brevo.config.senderEmail !== EXPECTED_BREVO_SENDER_EMAIL) {
      pushUnique(invalid, "BREVO_SENDER_EMAIL");
    }
    if (brevo.config.senderName !== EXPECTED_BREVO_SENDER_NAME) {
      pushUnique(invalid, "BREVO_SENDER_NAME");
    }
    if (brevo.config.notificationEmail !== EXPECTED_BREVO_NOTIFICATION_EMAIL) {
      pushUnique(invalid, "INQUIRY_NOTIFICATION_EMAIL");
    }
  }

  const configurationComplete = missing.length === 0 && invalid.length === 0;
  let state: InquiryReadinessState = "disabled";
  if (invalid.length > 0) {
    state = "misconfigured";
  } else if (configurationComplete && gate === "launch" && flag === "enabled") {
    state = "ready_for_launch_review";
  } else if (configurationComplete && gate === "testing") {
    state = "ready_for_controlled_testing";
  } else if (configurationComplete && gate === "disabled" && flag === "disabled") {
    state = "configured";
  }

  return {
    state,
    configurationComplete,
    missing,
    invalid,
    submissionsEnabled: flag === "enabled",
    activationGate: gate,
    publicPageEnabled: resolvePublicInquirySubmissionsAvailable(env),
    publicRouteUsesLiveAdapters: false,
    brevoAuthenticationVerified: false,
    inboxDeliveryVerified: false,
  };
}

/**
 * The contact page uses this value. The hardcoded flag stays false, so the
 * Send button cannot appear in this phase even if the launch gate is set.
 */
export function resolvePublicInquirySubmissionsAvailable(env: NodeJS.ProcessEnv = process.env) {
  if (!publicInquirySubmissionsAvailable) {
    return false;
  }
  const gate = readActivationGate(env.INQUIRY_ACTIVATION_GATE);
  return gate === "launch" && env.INQUIRY_SUBMISSIONS_ENABLED === "true";
}
