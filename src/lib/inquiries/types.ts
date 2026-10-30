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
};

export type DeliveryResult =
  | { status: "accepted" }
  | { status: "unavailable" }
  | { status: "rejected" };

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

export type InquiryRuntime = {
  submissionsEnabled: boolean;
  trustedOrigins: readonly string[];
  allowDevelopmentOrigins: boolean;
  rateLimitKeySecret: string | null;
  rateLimiter: InquiryRateLimiter;
  delivery: InquiryDelivery;
};
