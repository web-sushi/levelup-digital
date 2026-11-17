import {
  filledReferences,
  firstInvalidId,
  hasInquiryErrors,
  validateStep,
  type InquiryDraft,
  type InquiryErrors,
} from "@/components/contact/inquiry-model";
import { IDEMPOTENCY_KEY_PATTERN } from "@/lib/inquiries/idempotency";
import type { InquiryErrorCode, InquirySuccessBody } from "@/lib/inquiries/types";

export const INQUIRY_ENDPOINT = "/api/inquiries";
/**
 * The server allows up to 10 seconds for the business notification and 10 more
 * for the acknowledgement. This is longer than both, and shorter than the
 * two-minute wait that left the review step spinning. Ending the wait does not
 * prove the server never received the request.
 */
export const INQUIRY_SUBMISSION_DEADLINE_MS = 35_000;
const PRIVACY_FIELD_ID = "inquiry-privacy";

const KNOWN_FIELDS = [
  "projectType",
  "budget",
  "timeline",
  "name",
  "email",
  "business",
  "details",
  "references",
] as const;

type KnownField = (typeof KNOWN_FIELDS)[number];

const FIELD_STEP: Record<KnownField, number> = {
  projectType: 0,
  budget: 1,
  timeline: 2,
  name: 3,
  email: 3,
  business: 3,
  details: 4,
  references: 4,
};

export type InquiryRequestBody = {
  projectType: InquiryDraft["projectType"];
  budget: InquiryDraft["budget"];
  timeline: InquiryDraft["timeline"];
  name: string;
  email: string;
  business?: string;
  details?: string;
  references?: { url: string; note?: string }[];
  companyWebsite: string;
};

export type InquirySubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "aborted" }
  | { status: "success"; confirmation: "accepted" | "rejected" | "unknown" | "omitted" }
  | {
      status: "validation_error";
      errors: InquiryErrors;
      privacy?: string;
      step: number;
      focusId: string;
    }
  | { status: "rate_limited"; retryAfterSeconds?: number }
  | { status: "unavailable" }
  | { status: "persistence_uncertain" }
  | { status: "unknown_outcome" }
  | { status: "processing" }
  | { status: "conflict" }
  | { status: "error"; reason: "invalid_key" | "unexpected" };

type KeyLedger = {
  fingerprint: string;
  key: string;
  locked: boolean;
};

export type InquiryFetch = (input: string, init: RequestInit) => Promise<Response>;

export type InquiryClient = {
  submit(draft: InquiryDraft, companyWebsite: string, signal?: AbortSignal): Promise<InquirySubmissionState>;
};

const CONFIRMATIONS = new Set(["accepted", "rejected", "unknown"]);

const BEFORE_DELIVERY = new Set<InquiryErrorCode>([
  "SUBMISSIONS_UNAVAILABLE",
  "RATE_LIMIT_UNAVAILABLE",
  "INQUIRY_STORAGE_UNAVAILABLE",
  "DELIVERY_UNAVAILABLE",
]);

function platformRandomUUID() {
  return crypto.randomUUID();
}

export function createIdempotencyKey(randomUUID: () => string = platformRandomUUID) {
  return randomUUID();
}

export function toInquiryRequest(draft: InquiryDraft, companyWebsite: string): InquiryRequestBody | null {
  if (!draft.projectType || !draft.budget || !draft.timeline) {
    return null;
  }
  const references = filledReferences(draft.references)
    .map((item) => {
      const url = item.url.trim();
      const note = item.note.trim();
      if (!url) {
        return null;
      }
      return note ? { url, note } : { url };
    })
    .filter((item): item is { url: string; note?: string } => item !== null);

  const business = draft.business.trim();
  const details = draft.details.trim();
  return {
    projectType: draft.projectType,
    budget: draft.budget,
    timeline: draft.timeline,
    name: draft.name.trim(),
    email: draft.email.trim(),
    ...(business ? { business } : {}),
    ...(details ? { details } : {}),
    ...(references.length > 0 ? { references } : {}),
    companyWebsite: typeof companyWebsite === "string" ? companyWebsite : "",
  };
}

export function requestFingerprint(body: InquiryRequestBody) {
  return JSON.stringify([
    body.projectType,
    body.budget,
    body.timeline,
    body.name,
    body.email,
    body.business ?? "",
    body.details ?? "",
    (body.references ?? []).map((item) => [item.url, item.note ?? ""]),
    body.companyWebsite,
  ]);
}

export function validateInquiryDraft(draft: InquiryDraft, privacyAccepted: boolean): InquirySubmissionState | { status: "ready" } {
  for (let step = 0; step <= 4; step += 1) {
    const errors = validateStep(step, draft);
    if (hasInquiryErrors(errors)) {
      return {
        status: "validation_error",
        errors,
        step,
        focusId: firstInvalidId(step, errors, draft),
      };
    }
  }
  if (!privacyAccepted) {
    return {
      status: "validation_error",
      errors: {},
      privacy: "Confirm that LevelUp Digital may use these details to respond to your inquiry.",
      step: 5,
      focusId: PRIVACY_FIELD_ID,
    };
  }
  if (!toInquiryRequest(draft, "")) {
    return {
      status: "validation_error",
      errors: { projectType: "Choose a project type to continue." },
      step: 0,
      focusId: "inquiry-project-type",
    };
  }
  return { status: "ready" };
}

export function allowsManualSubmit(state: InquirySubmissionState) {
  return (
    state.status === "idle" ||
    state.status === "validation_error" ||
    state.status === "rate_limited" ||
    state.status === "unavailable" ||
    state.status === "error"
  );
}

export function submissionCopy(state: InquirySubmissionState) {
  switch (state.status) {
    case "submitting":
      return { title: "Sending your inquiry", message: "Sending your inquiry." };
    case "success":
      return {
        title: "Your project is on its way.",
        message:
          "Thanks for reaching out! Your inquiry has been accepted for review. We'll be in touch after we've had a chance to look through your details.",
        confirmation:
          state.confirmation === "accepted" ? "A confirmation email has been queued for delivery." : undefined,
      };
    case "rate_limited":
      return {
        title: "Too many attempts",
        message:
          state.retryAfterSeconds
            ? `We've received several requests from this connection. Please wait ${state.retryAfterSeconds} seconds and try again later, or contact us directly by email.`
            : "We've received several requests from this connection. Please try again later, or contact us directly by email.",
      };
    case "unavailable":
      return {
        title: "Online inquiries are temporarily unavailable",
        message: "Please contact us directly by email while the inquiry system is being finalized.",
      };
    case "persistence_uncertain":
      return {
        title: "We couldn't confirm the final status",
        message:
          "Your inquiry may have been received. Please avoid submitting it again immediately. You can contact us directly if you’d like to confirm.",
      };
    case "unknown_outcome":
      return {
        title: "We couldn't confirm your submission",
        message:
          "Your inquiry may have reached us, but we couldn't confirm the result. Please avoid submitting it again immediately. You can contact us directly to check.",
      };
    case "processing":
      return {
        title: "This inquiry is already being submitted",
        message: "Wait for it to finish instead of sending it again.",
      };
    case "conflict":
      return {
        title: "This inquiry could not be sent again",
        message: "Please contact us by email instead of sending another copy.",
      };
    case "error":
      return {
        title: "The inquiry could not be sent",
        message: "Please contact us directly by email.",
      };
    default:
      return null;
  }
}

function safeFieldMessage(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.replace(/[\u0000-\u001F]/g, "").trim();
  if (!text || text.length > 300) {
    return null;
  }
  return text;
}

function isKnownField(value: string): value is KnownField {
  return (KNOWN_FIELDS as readonly string[]).includes(value);
}

export function mapServerFieldErrors(fieldErrors: unknown, draft: InquiryDraft) {
  const errors: InquiryErrors = {};
  if (!fieldErrors || typeof fieldErrors !== "object" || Array.isArray(fieldErrors)) {
    return {
      status: "validation_error" as const,
      errors,
      step: 5,
      focusId: "",
    };
  }
  for (const [key, value] of Object.entries(fieldErrors)) {
    const message = safeFieldMessage(value);
    if (!message || !isKnownField(key)) {
      continue;
    }
    if (key === "references") {
      const target = draft.references.find((item) => item.url.trim() || item.note.trim()) ?? draft.references[0];
      if (target) {
        errors.references = { [target.id]: { url: message } };
      }
      continue;
    }
    errors[key] = message;
  }
  if (!hasInquiryErrors(errors)) {
    return {
      status: "validation_error" as const,
      errors,
      step: 5,
      focusId: "",
    };
  }
  const step = Math.min(
    ...Object.keys(errors)
      .filter(isKnownField)
      .map((key) => FIELD_STEP[key]),
  );
  return {
    status: "validation_error" as const,
    errors,
    step,
    focusId: firstInvalidId(step, errors, draft),
  };
}

function retryAfterSeconds(header: string | null) {
  if (!header || !/^\d{1,5}$/.test(header)) {
    return undefined;
  }
  const seconds = Number(header);
  if (!Number.isInteger(seconds) || seconds <= 0 || seconds > 86_400) {
    return undefined;
  }
  return seconds;
}

function isSuccessBody(value: unknown): value is InquirySuccessBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const body = value as Record<string, unknown>;
  if (body.ok !== true) {
    return false;
  }
  return body.confirmation === undefined || (typeof body.confirmation === "string" && CONFIRMATIONS.has(body.confirmation));
}

function errorCode(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const code = (value as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export async function interpretInquiryResponse(response: Response, draft: InquiryDraft): Promise<InquirySubmissionState> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (response.status === 200 && isSuccessBody(payload)) {
    return {
      status: "success",
      confirmation: payload.confirmation ?? "omitted",
    };
  }
  const code = errorCode(payload);
  if (response.status === 422 && code === "VALIDATION_ERROR") {
    const fieldErrors = payload && typeof payload === "object" ? (payload as { fieldErrors?: unknown }).fieldErrors : undefined;
    return mapServerFieldErrors(fieldErrors, draft);
  }
  if (response.status === 429 && code === "RATE_LIMITED") {
    const retry = retryAfterSeconds(response.headers.get("retry-after"));
    return retry ? { status: "rate_limited", retryAfterSeconds: retry } : { status: "rate_limited" };
  }
  if (response.status === 503 && code === "IDEMPOTENCY_PERSISTENCE_FAILED") {
    return { status: "persistence_uncertain" };
  }
  if (response.status === 503 && code === "DELIVERY_OUTCOME_UNKNOWN") {
    return { status: "unknown_outcome" };
  }
  if (response.status === 503 && code && BEFORE_DELIVERY.has(code as InquiryErrorCode)) {
    return { status: "unavailable" };
  }
  if (response.status === 409 && code === "INQUIRY_PROCESSING") {
    return { status: "processing" };
  }
  if (response.status === 409 && code === "IDEMPOTENCY_CONFLICT") {
    return { status: "conflict" };
  }
  if (response.status === 400 && code === "INVALID_IDEMPOTENCY_KEY") {
    return { status: "error", reason: "invalid_key" };
  }
  return { status: "error", reason: "unexpected" };
}

function shouldLock(state: InquirySubmissionState) {
  return (
    state.status === "unknown_outcome" ||
    state.status === "persistence_uncertain" ||
    state.status === "processing" ||
    state.status === "conflict" ||
    state.status === "aborted" ||
    state.status === "success"
  );
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function combineSignals(primary: AbortSignal, secondary: AbortSignal) {
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([primary, secondary]);
  }
  const controller = new AbortController();
  const forward = (signal: AbortSignal) => {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return;
    }
    signal.addEventListener("abort", () => {
      if (!controller.signal.aborted) {
        controller.abort(signal.reason);
      }
    }, { once: true });
  };
  forward(primary);
  forward(secondary);
  return controller.signal;
}

function requestInquiry(fetchImpl: InquiryFetch, body: string, key: string, signal: AbortSignal) {
  return new Promise<Response>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new DOMException("The inquiry request was aborted.", "AbortError"));
      return;
    }
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      signal.removeEventListener("abort", onAbort);
      callback();
    };
    const onAbort = () => {
      finish(() => {
        reject(signal.reason ?? new DOMException("The inquiry request was aborted.", "AbortError"));
      });
    };
    signal.addEventListener("abort", onAbort, { once: true });
    fetchImpl(INQUIRY_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": key,
      },
      body,
      cache: "no-store",
      redirect: "error",
      signal,
    }).then(
      (response) => finish(() => resolve(response)),
      (error: unknown) => finish(() => reject(error)),
    );
  });
}

/**
 * The in-flight result belongs to the request that is already running.
 * An abort is ambiguous: the request may already have reached the server.
 */
export function presentedSubmissionState(result: InquirySubmissionState): InquirySubmissionState | "pending" {
  if (result.status === "submitting") {
    return "pending";
  }
  if (result.status === "aborted") {
    return { status: "unknown_outcome" };
  }
  return result;
}

export function createInquiryClient(options: {
  fetchImpl?: InquiryFetch;
  randomUUID?: () => string;
  deadlineMs?: number;
} = {}): InquiryClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const randomUUID = options.randomUUID ?? platformRandomUUID;
  const deadlineMs = typeof options.deadlineMs === "number" && Number.isFinite(options.deadlineMs) && options.deadlineMs > 0
    ? options.deadlineMs
    : INQUIRY_SUBMISSION_DEADLINE_MS;
  let ledger: KeyLedger | null = null;
  let inFlight = false;

  return {
    async submit(draft, companyWebsite, signal) {
      const body = toInquiryRequest(draft, companyWebsite);
      if (!body) {
        return validateInquiryDraft(draft, true).status === "ready"
          ? { status: "error", reason: "unexpected" }
          : (validateInquiryDraft(draft, true) as InquirySubmissionState);
      }
      const fingerprint = requestFingerprint(body);
      if (!ledger || (!ledger.locked && ledger.fingerprint !== fingerprint)) {
        const key = createIdempotencyKey(randomUUID);
        if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
          return { status: "error", reason: "invalid_key" };
        }
        ledger = { fingerprint, key, locked: false };
      }
      if (inFlight) {
        return { status: "submitting" };
      }
      const active = ledger;
      if (!active) {
        return { status: "error", reason: "unexpected" };
      }
      inFlight = true;
      const timeoutController = new AbortController();
      const timeout = setTimeout(() => {
        timeoutController.abort(new DOMException("The inquiry request timed out.", "TimeoutError"));
      }, deadlineMs);
      const requestSignal = signal ? combineSignals(signal, timeoutController.signal) : timeoutController.signal;
      try {
        const response = await requestInquiry(fetchImpl, JSON.stringify(body), active.key, requestSignal);
        const result = await interpretInquiryResponse(response, draft);
        if (shouldLock(result)) {
          ledger = { ...active, locked: true };
        }
        if (result.status === "error" && result.reason === "invalid_key") {
          ledger = null;
        }
        if (result.status === "error" && result.reason === "unexpected") {
          ledger = { ...active, locked: true };
        }
        return result;
      } catch (error) {
        ledger = { ...active, locked: true };
        if (isAbortError(error)) {
          return { status: "aborted" };
        }
        return { status: "unknown_outcome" };
      } finally {
        clearTimeout(timeout);
        inFlight = false;
      }
    },
  };
}
