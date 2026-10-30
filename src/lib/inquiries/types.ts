import type { BudgetRange, ProjectType, TimelineChoice } from "@/components/contact/inquiry-model";

export type InquiryReferenceInput = {
  url: string;
  note?: string;
};

/** Normalized inquiry accepted by the delivery boundary. */
export type ValidatedInquiry = {
  projectType: ProjectType;
  budget: BudgetRange;
  timeline: TimelineChoice;
  name: string;
  email: string;
  business?: string;
  details?: string;
  references: InquiryReferenceInput[];
};

export type FieldErrors = Record<string, string>;

export type InquiryErrorCode =
  | "INVALID_REQUEST"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "VALIDATION_ERROR"
  | "FORBIDDEN_ORIGIN"
  | "RATE_LIMITED"
  | "RATE_LIMIT_UNAVAILABLE"
  | "DELIVERY_UNAVAILABLE"
  | "DELIVERY_OUTCOME_UNKNOWN"
  | "IDEMPOTENCY_PERSISTENCE_FAILED"
  | "INVALID_IDEMPOTENCY_KEY"
  | "IDEMPOTENCY_CONFLICT"
  | "INQUIRY_PROCESSING"
  | "INQUIRY_STORAGE_UNAVAILABLE"
  | "SUBMISSIONS_UNAVAILABLE"
  | "METHOD_NOT_ALLOWED"
  | "INTERNAL_ERROR";

export type InquiryErrorBody = {
  ok: false;
  code: InquiryErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
};

export type InquirySuccessBody = {
  ok: true;
  /**
   * Present when the delivery adapter reports the customer confirmation separately.
   * `accepted` means Brevo accepted the confirmation request. It does not prove inbox delivery.
   */
  confirmation?: "accepted" | "rejected" | "unknown";
};

export type DeliveryFailureCategory =
  | "configuration"
  | "authentication"
  | "invalid_sender"
  | "rejected"
  | "rate_limited"
  | "provider_error"
  | "network"
  | "timeout"
  | "malformed_response";

export type DeliveryResult =
  | {
      status: "accepted";
      confirmation?: "accepted" | "rejected" | "unknown";
      /** Internal only. The public response must not include this category. */
      confirmationCategory?: DeliveryFailureCategory;
    }
  | { status: "unavailable"; category?: DeliveryFailureCategory }
  | { status: "rejected"; category?: DeliveryFailureCategory }
  | { status: "unknown"; category?: DeliveryFailureCategory };

export interface InquiryDelivery {
  deliver(inquiry: ValidatedInquiry): Promise<DeliveryResult>;
}

export type RateLimitResult =
  | { status: "allowed" }
  | { status: "limited"; retryAfterSeconds: number }
  | { status: "unavailable" };

export interface InquiryRateLimiter {
  consume(clientKey: string): Promise<RateLimitResult>;
}

export type IdempotencyBeginResult =
  | { status: "claimed"; owner: string }
  | { status: "processing" }
  | { status: "replay_accepted"; confirmation?: "accepted" | "rejected" | "unknown" }
  | { status: "replay_rejected" }
  | { status: "replay_unknown" }
  | { status: "conflict" }
  | { status: "limited"; retryAfterSeconds: number }
  | { status: "unavailable" };

export type IdempotencyFinalizeResult = "finalized" | "not_owner" | "unavailable";

export interface InquiryIdempotency {
  begin(input: {
    clientHash: string;
    idempotencyHash: string;
    fingerprint: string;
    owner: string;
  }): Promise<IdempotencyBeginResult>;
  finalize(input: {
    idempotencyHash: string;
    owner: string;
    state: "accepted" | "rejected" | "unknown";
    confirmation: "accepted" | "rejected" | "unknown" | "-";
    category: string;
  }): Promise<IdempotencyFinalizeResult>;
}

export type InquiryRuntime = {
  submissionsEnabled: boolean;
  trustedOrigins: readonly string[];
  allowDevelopmentOrigins: boolean;
  rateLimitKeySecret: string | null;
  rateLimiter: InquiryRateLimiter;
  delivery: InquiryDelivery;
  /** Present only in tests or a future activation phase. The public runtime leaves this unset. */
  idempotency?: InquiryIdempotency | null;
  idempotencyKeySecret?: string | null;
};
