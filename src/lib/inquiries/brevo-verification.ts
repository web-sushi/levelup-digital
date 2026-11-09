import { UnavailableRateLimiter } from "@/lib/inquiries/abuse-protection";
import {
  BREVO_TRANSACTIONAL_URL,
  readBrevoMailConfig,
  type BrevoFetch,
  type BrevoMailConfig,
} from "@/lib/inquiries/brevo-delivery";
import { createInquiryRuntime } from "@/lib/inquiries/config";
import { UnavailableInquiryDelivery } from "@/lib/inquiries/delivery";
import {
  EXPECTED_BREVO_NOTIFICATION_EMAIL,
  EXPECTED_BREVO_SENDER_EMAIL,
  EXPECTED_BREVO_SENDER_NAME,
  resolvePublicInquirySubmissionsAvailable,
} from "@/lib/inquiries/readiness";
import type { DeliveryFailureCategory } from "@/lib/inquiries/types";

export const BREVO_ACCOUNT_URL = "https://api.brevo.com/v3/account";
export const BREVO_SENDERS_URL = "https://api.brevo.com/v3/senders";
export const CONTROLLED_BREVO_CONFIRMATION = "SEND-ONE-LEVELUP-BREVO-VERIFICATION";
export const CONTROLLED_BREVO_SUBJECT = "LevelUp Digital — Transactional Email Verification";
export const CONTROLLED_BREVO_TEXT = "This is an authorized transactional email verification for the LevelUp Digital inquiry system. No customer inquiry was submitted.";

const TIMEOUT_MS = 10_000;
const MAX_BODY_CHARS = 65_536;

export type ControlledBrevoMode = "dry-run" | "send";

export type ControlledBrevoInput = {
  mode: ControlledBrevoMode;
  confirm?: string;
};

export type ControlledBrevoAccess = {
  authenticated: boolean;
  accountStatus: number | null;
  transactionalRelayEnabled: boolean | null;
  senderListed: boolean;
  senderActive: boolean | null;
  senderNameMatches: boolean | null;
  senderRecordCount: number;
  category: DeliveryFailureCategory | "ok";
};

export type ControlledBrevoReport = {
  ok: boolean;
  mode: ControlledBrevoMode | "refused";
  reason?: string;
  missing: string[];
  invalid: string[];
  sendingRequests: number;
  nonSendingRequests: number;
  submissionsEnabled: boolean;
  publicPageEnabled: false;
  publicRouteUsesLiveAdapters: false;
  inboxDeliveryVerified: false;
  transactionalSendVerified: false;
  access?: ControlledBrevoAccess;
  planned?: {
    recipient: typeof EXPECTED_BREVO_NOTIFICATION_EMAIL;
    senderEmail: typeof EXPECTED_BREVO_SENDER_EMAIL;
    senderName: typeof EXPECTED_BREVO_SENDER_NAME;
    subject: typeof CONTROLLED_BREVO_SUBJECT;
    text: typeof CONTROLLED_BREVO_TEXT;
  };
  send?: {
    outcome: "accepted" | "rejected" | "unknown" | "not_attempted";
    category?: DeliveryFailureCategory;
    httpStatus: number | null;
  };
};

type BrevoPayload = {
  sender: { email: string; name: string };
  to: [{ email: string }];
  replyTo: { email: string; name: string };
  subject: string;
  textContent: string;
  htmlContent: string;
};

export function parseControlledBrevoArgs(argv: readonly string[]) {
  let send = false;
  let confirm: string | undefined;
  for (const arg of argv) {
    if (arg === "--send") {
      send = true;
      continue;
    }
    if (arg.startsWith("--confirm=")) {
      confirm = arg.slice("--confirm=".length);
      continue;
    }
    return { ok: false as const, reason: "unsupported_argument" as const };
  }
  return {
    ok: true as const,
    mode: send ? "send" as const : "dry-run" as const,
    confirm,
  };
}

export function controlledBrevoSendAuthorized(input: ControlledBrevoInput) {
  return input.mode === "send" && input.confirm === CONTROLLED_BREVO_CONFIRMATION;
}

export function buildControlledBrevoMessage(config: BrevoMailConfig):
  | { ok: true; payload: BrevoPayload }
  | { ok: false; reason: "recipient_restricted" | "sender_mismatch" } {
  if (config.notificationEmail !== EXPECTED_BREVO_NOTIFICATION_EMAIL) {
    return { ok: false, reason: "recipient_restricted" };
  }
  if (config.senderEmail !== EXPECTED_BREVO_SENDER_EMAIL || config.senderName !== EXPECTED_BREVO_SENDER_NAME) {
    return { ok: false, reason: "sender_mismatch" };
  }
  const text = CONTROLLED_BREVO_TEXT;
  return {
    ok: true,
    payload: {
      sender: { email: EXPECTED_BREVO_SENDER_EMAIL, name: EXPECTED_BREVO_SENDER_NAME },
      to: [{ email: EXPECTED_BREVO_NOTIFICATION_EMAIL }],
      replyTo: { email: EXPECTED_BREVO_NOTIFICATION_EMAIL, name: EXPECTED_BREVO_SENDER_NAME },
      subject: CONTROLLED_BREVO_SUBJECT,
      textContent: text,
      htmlContent: `<p>${escapeHtml(text)}</p>`,
    },
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function categoryForStatus(status: number): DeliveryFailureCategory {
  if (status === 401 || status === 403) {
    return "authentication";
  }
  if (status === 400 || status === 422) {
    return "invalid_sender";
  }
  if (status === 429) {
    return "rate_limited";
  }
  if (status >= 500 && status <= 599) {
    return "provider_error";
  }
  return "rejected";
}

function failureName(error: unknown) {
  if (typeof error === "object" && error !== null && "name" in error && typeof error.name === "string") {
    return error.name;
  }
  return "";
}

function plannedMessage() {
  return {
    recipient: EXPECTED_BREVO_NOTIFICATION_EMAIL,
    senderEmail: EXPECTED_BREVO_SENDER_EMAIL,
    senderName: EXPECTED_BREVO_SENDER_NAME,
    subject: CONTROLLED_BREVO_SUBJECT,
    text: CONTROLLED_BREVO_TEXT,
  } as const;
}

function baseReport(env: NodeJS.ProcessEnv, mode: ControlledBrevoReport["mode"]): ControlledBrevoReport {
  return {
    ok: false,
    mode,
    missing: [],
    invalid: [],
    sendingRequests: 0,
    nonSendingRequests: 0,
    submissionsEnabled: env.INQUIRY_SUBMISSIONS_ENABLED === "true",
    publicPageEnabled: false,
    publicRouteUsesLiveAdapters: false,
    inboxDeliveryVerified: false,
    transactionalSendVerified: false,
    planned: plannedMessage(),
  };
}

function configProblems(env: NodeJS.ProcessEnv) {
  const read = readBrevoMailConfig({
    BREVO_API_KEY: env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: env.BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME: env.BREVO_SENDER_NAME,
    INQUIRY_NOTIFICATION_EMAIL: env.INQUIRY_NOTIFICATION_EMAIL,
  });
  if (read.ok) {
    return { config: read.config, missing: [] as string[], invalid: [] as string[] };
  }
  const names = {
    apiKey: "BREVO_API_KEY",
    senderEmail: "BREVO_SENDER_EMAIL",
    senderName: "BREVO_SENDER_NAME",
    notificationEmail: "INQUIRY_NOTIFICATION_EMAIL",
  } as const;
  const missing: string[] = [];
  const invalid: string[] = [];
  for (const issue of read.issues) {
    const name = names[issue.field];
    if (issue.problem === "missing") {
      missing.push(name);
    } else {
      invalid.push(name);
    }
  }
  return { config: null, missing, invalid };
}

function publicRouteClosed(env: NodeJS.ProcessEnv) {
  const runtime = createInquiryRuntime(env);
  return runtime.delivery instanceof UnavailableInquiryDelivery
    && runtime.rateLimiter instanceof UnavailableRateLimiter
    && runtime.idempotency == null
    && resolvePublicInquirySubmissionsAvailable(env) === false;
}

async function readBody(response: Response) {
  try {
    const text = await response.text();
    if (text.length > MAX_BODY_CHARS) {
      return "";
    }
    return text;
  } catch {
    return "";
  }
}

async function brevoCall(fetchImpl: BrevoFetch, url: string, apiKey: string, init: RequestInit) {
  try {
    const response = await fetchImpl(url, {
      ...init,
      redirect: "error",
      cache: "no-store",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await readBody(response);
    return { ok: true as const, status: response.status, text };
  } catch (error) {
    const name = failureName(error);
    if (name === "TimeoutError" || name === "AbortError") {
      return { ok: false as const, category: "timeout" as const };
    }
    return { ok: false as const, category: "network" as const };
  }
}

function readRelayEnabled(text: string) {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || !("relay" in parsed)) {
      return null;
    }
    const relay = (parsed as { relay?: unknown }).relay;
    if (!relay || typeof relay !== "object" || !("enabled" in relay)) {
      return null;
    }
    const enabled = (relay as { enabled?: unknown }).enabled;
    return typeof enabled === "boolean" ? enabled : null;
  } catch {
    return null;
  }
}

function readSender(text: string) {
  const empty = { listed: false, active: null, nameMatches: null, recordCount: 0 };
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || !("senders" in parsed)) {
      return empty;
    }
    const senders = (parsed as { senders?: unknown }).senders;
    if (!Array.isArray(senders)) {
      return empty;
    }
    const match = senders.find((sender) => {
      if (!sender || typeof sender !== "object" || !("email" in sender)) {
        return false;
      }
      const email = (sender as { email?: unknown }).email;
      return typeof email === "string" && email.toLowerCase() === EXPECTED_BREVO_SENDER_EMAIL;
    });
    if (!match || typeof match !== "object") {
      return { listed: false, active: null, nameMatches: null, recordCount: senders.length };
    }
    const active = "active" in match && typeof match.active === "boolean" ? match.active : null;
    const nameMatches = "name" in match && typeof match.name === "string"
      ? match.name.trim() === EXPECTED_BREVO_SENDER_NAME
      : null;
    return { listed: true, active, nameMatches, recordCount: senders.length };
  } catch {
    return empty;
  }
}

function acceptedMessage(status: number, text: string) {
  if (status !== 201) {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || !("messageId" in parsed)) {
      return false;
    }
    const messageId = (parsed as { messageId?: unknown }).messageId;
    return typeof messageId === "string" && messageId.length > 0 && messageId.length <= 998;
  } catch {
    return false;
  }
}

/**
 * Checks Brevo with account and sender reads. Sends one verification message
 * only when the caller passes send mode and the exact confirmation string.
 * The public route does not call this function.
 */
export async function runControlledBrevoVerification(
  env: NodeJS.ProcessEnv,
  input: ControlledBrevoInput,
  fetchImpl: BrevoFetch,
): Promise<ControlledBrevoReport> {
  const report = baseReport(env, input.mode);
  const problems = configProblems(env);
  report.missing = problems.missing;
  report.invalid = problems.invalid;
  if (!problems.config) {
    report.mode = "refused";
    report.reason = "configuration";
    return report;
  }
  const message = buildControlledBrevoMessage(problems.config);
  if (!message.ok) {
    report.mode = "refused";
    report.reason = message.reason;
    return report;
  }
  if (!publicRouteClosed(env)) {
    report.mode = "refused";
    report.reason = "public_route_open";
    return report;
  }
  if (input.mode === "send" && !controlledBrevoSendAuthorized(input)) {
    report.mode = "refused";
    report.reason = "authorization_required";
    return report;
  }
  if (input.mode === "send" && env.INQUIRY_SUBMISSIONS_ENABLED !== "false") {
    report.mode = "refused";
    report.reason = "submissions_enabled";
    return report;
  }

  const account = await brevoCall(fetchImpl, BREVO_ACCOUNT_URL, problems.config.apiKey, { method: "GET" });
  report.nonSendingRequests += 1;
  if (!account.ok) {
    report.access = {
      authenticated: false,
      accountStatus: null,
      transactionalRelayEnabled: null,
      senderListed: false,
      senderActive: null,
      senderNameMatches: null,
      senderRecordCount: 0,
      category: account.category,
    };
    report.reason = account.category;
    return report;
  }
  const authenticated = account.status === 200;
  const access: ControlledBrevoAccess = {
    authenticated,
    accountStatus: account.status,
    transactionalRelayEnabled: authenticated ? readRelayEnabled(account.text) : null,
    senderListed: false,
    senderActive: null,
    senderNameMatches: null,
    senderRecordCount: 0,
    category: authenticated ? "ok" : categoryForStatus(account.status),
  };
  if (!authenticated) {
    report.access = access;
    report.reason = access.category === "ok" ? "authentication" : access.category;
    return report;
  }

  const senders = await brevoCall(fetchImpl, BREVO_SENDERS_URL, problems.config.apiKey, { method: "GET" });
  report.nonSendingRequests += 1;
  if (!senders.ok) {
    access.category = senders.category;
    report.access = access;
    report.reason = senders.category;
    return report;
  }
  if (senders.status !== 200) {
    access.category = categoryForStatus(senders.status);
    report.access = access;
    report.reason = access.category;
    return report;
  }
  const sender = readSender(senders.text);
  access.senderListed = sender.listed;
  access.senderActive = sender.active;
  access.senderNameMatches = sender.nameMatches;
  access.senderRecordCount = sender.recordCount;
  report.access = access;
  const nameMismatch = sender.listed && sender.active === true && sender.nameMatches === false;

  if (input.mode === "dry-run") {
    report.ok = access.transactionalRelayEnabled !== false
      && sender.listed
      && sender.active === true
      && sender.nameMatches === true
      && env.INQUIRY_SUBMISSIONS_ENABLED === "false";
    if (!report.ok && nameMismatch && access.transactionalRelayEnabled !== false && env.INQUIRY_SUBMISSIONS_ENABLED === "false") {
      report.reason = "sender_name_mismatch";
    }
    report.sendingRequests = 0;
    return report;
  }

  if (access.transactionalRelayEnabled === false || !sender.listed || sender.active !== true || sender.nameMatches !== true) {
    report.reason = nameMismatch ? "sender_name_mismatch" : "sender_not_ready";
    report.send = { outcome: "not_attempted", httpStatus: null };
    return report;
  }

  report.sendingRequests = 1;
  const sent = await brevoCall(fetchImpl, BREVO_TRANSACTIONAL_URL, problems.config.apiKey, {
    method: "POST",
    body: JSON.stringify(message.payload),
  });
  if (!sent.ok) {
    report.send = { outcome: "unknown", category: sent.category, httpStatus: null };
    report.reason = sent.category;
    return report;
  }
  if (sent.status === 201 && acceptedMessage(sent.status, sent.text)) {
    report.ok = true;
    report.send = { outcome: "accepted", httpStatus: sent.status };
    return report;
  }
  if (sent.status >= 200 && sent.status < 300) {
    report.send = { outcome: "unknown", category: "malformed_response", httpStatus: sent.status };
    report.reason = "malformed_response";
    return report;
  }
  const category = categoryForStatus(sent.status);
  report.send = { outcome: "rejected", category, httpStatus: sent.status };
  report.reason = category;
  return report;
}
