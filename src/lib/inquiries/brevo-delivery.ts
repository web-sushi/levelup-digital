import { isValidEmail } from "@/components/contact/inquiry-model";
import {
  businessNotificationEmail,
  customerConfirmationEmail,
  type InquiryEmail,
} from "@/lib/inquiries/email-templates";
import type { DeliveryFailureCategory, DeliveryResult, InquiryDelivery, ValidatedInquiry } from "@/lib/inquiries/types";

export const BREVO_TRANSACTIONAL_URL = "https://api.brevo.com/v3/smtp/email";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_PROVIDER_BODY_BYTES = 65_536;
const MIN_API_KEY_LENGTH = 20;
const MAX_API_KEY_LENGTH = 512;
const MAX_SENDER_NAME_LENGTH = 80;

export type BrevoMailConfig = {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  notificationEmail: string;
};

export type BrevoConfigField = "apiKey" | "senderEmail" | "senderName" | "notificationEmail";

export type BrevoConfigIssue = {
  field: BrevoConfigField;
  problem: "missing" | "invalid";
};

export type BrevoFetch = (url: string, init: RequestInit) => Promise<Response>;

export type BrevoDeliveryOptions = {
  config: BrevoMailConfig | null;
  fetchImpl?: BrevoFetch;
  timeoutMs?: number;
};

type MailAddress = {
  email: string;
  name?: string;
};

type SendOutcome =
  | { outcome: "accepted" }
  | { outcome: "rejected"; category: DeliveryFailureCategory }
  | { outcome: "unknown"; category: DeliveryFailureCategory };

function cleanEmail(value: string | undefined) {
  if (value === undefined || value.trim().length === 0) {
    return { problem: "missing" as const };
  }
  const email = value.trim();
  if (!isValidEmail(email)) {
    return { problem: "invalid" as const };
  }
  return { value: email };
}

function hasControlCharacter(value: string) {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 31 || code === 127) {
      return true;
    }
  }
  return false;
}

function cleanSenderName(value: string | undefined) {
  if (value === undefined || value.trim().length === 0) {
    return { problem: "missing" as const };
  }
  const name = value.trim();
  if (name.length > MAX_SENDER_NAME_LENGTH || hasControlCharacter(name)) {
    return { problem: "invalid" as const };
  }
  return { value: name };
}

function cleanApiKey(value: string | undefined) {
  if (value === undefined || value.trim().length === 0) {
    return { problem: "missing" as const };
  }
  const apiKey = value.trim();
  if (apiKey.length < MIN_API_KEY_LENGTH || apiKey.length > MAX_API_KEY_LENGTH || /\s/.test(apiKey)) {
    return { problem: "invalid" as const };
  }
  return { value: apiKey };
}

export type BrevoProcessEnv = {
  BREVO_API_KEY?: string;
  BREVO_SENDER_EMAIL?: string;
  BREVO_SENDER_NAME?: string;
  INQUIRY_NOTIFICATION_EMAIL?: string;
};

export function readBrevoMailConfig(env: BrevoProcessEnv):
  | { ok: true; config: BrevoMailConfig }
  | { ok: false; issues: BrevoConfigIssue[] } {
  const issues: BrevoConfigIssue[] = [];
  const apiKeyResult = cleanApiKey(env.BREVO_API_KEY);
  const senderEmailResult = cleanEmail(env.BREVO_SENDER_EMAIL);
  const senderNameResult = cleanSenderName(env.BREVO_SENDER_NAME);
  const notificationEmailResult = cleanEmail(env.INQUIRY_NOTIFICATION_EMAIL);
  let apiKey: string | undefined;
  let senderEmail: string | undefined;
  let senderName: string | undefined;
  let notificationEmail: string | undefined;
  if ("value" in apiKeyResult) {
    apiKey = apiKeyResult.value;
  } else {
    issues.push({ field: "apiKey", problem: apiKeyResult.problem });
  }
  if ("value" in senderEmailResult) {
    senderEmail = senderEmailResult.value;
  } else {
    issues.push({ field: "senderEmail", problem: senderEmailResult.problem });
  }
  if ("value" in senderNameResult) {
    senderName = senderNameResult.value;
  } else {
    issues.push({ field: "senderName", problem: senderNameResult.problem });
  }
  if ("value" in notificationEmailResult) {
    notificationEmail = notificationEmailResult.value;
  } else {
    issues.push({ field: "notificationEmail", problem: notificationEmailResult.problem });
  }
  if (!apiKey || !senderEmail || !senderName || !notificationEmail) {
    return { ok: false, issues };
  }
  return {
    ok: true,
    config: { apiKey, senderEmail, senderName, notificationEmail },
  };
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

async function readProviderBody(response: Response) {
  if (!response.body) {
    return { truncated: false, text: "" };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value) {
        continue;
      }
      total += value.byteLength;
      if (total > MAX_PROVIDER_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { truncated: true, text: "" };
      }
      chunks.push(value);
    }
  } catch {
    return { truncated: true, text: "" };
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { truncated: false, text: new TextDecoder("utf-8", { fatal: false }).decode(merged) };
}

function acceptedByProvider(status: number, text: string) {
  if (status !== 201) {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") {
      return false;
    }
    const messageId = (parsed as { messageId?: unknown }).messageId;
    return typeof messageId === "string" && messageId.length > 0 && messageId.length <= 998;
  } catch {
    return false;
  }
}

/**
 * Sends the business notification first, then the customer confirmation.
 * A timeout or network error is unknown. This adapter does not retry.
 * The public route does not construct this class.
 */
export class BrevoInquiryDelivery implements InquiryDelivery {
  private readonly config: BrevoMailConfig | null;
  private readonly fetchImpl: BrevoFetch | undefined;
  private readonly timeoutMs: number;

  constructor(options: BrevoDeliveryOptions) {
    this.config = options.config;
    this.fetchImpl = options.fetchImpl;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async deliver(inquiry: ValidatedInquiry): Promise<DeliveryResult> {
    if (!this.config) {
      return { status: "unavailable", category: "configuration" };
    }

    const identity = {
      senderName: this.config.senderName,
      notificationEmail: this.config.notificationEmail,
    };
    const business = businessNotificationEmail(inquiry, identity);
    const businessResult = await this.send(business, {
      email: this.config.notificationEmail,
      name: this.config.senderName,
    }, {
      email: inquiry.email,
      name: inquiry.name,
    });
    if (businessResult.outcome === "unknown") {
      return { status: "unknown", category: businessResult.category };
    }
    if (businessResult.outcome !== "accepted") {
      return { status: "rejected", category: businessResult.category };
    }

    const confirmation = customerConfirmationEmail(inquiry, identity);
    const confirmationResult = await this.send(confirmation, { email: inquiry.email }, {
      email: this.config.notificationEmail,
      name: this.config.senderName,
    });
    if (confirmationResult.outcome === "accepted") {
      return { status: "accepted", confirmation: "accepted" };
    }
    if (confirmationResult.outcome === "unknown") {
      return { status: "accepted", confirmation: "unknown", confirmationCategory: confirmationResult.category };
    }
    return { status: "accepted", confirmation: "rejected", confirmationCategory: confirmationResult.category };
  }

  private async send(message: InquiryEmail, to: MailAddress, replyTo: MailAddress): Promise<SendOutcome> {
    if (!this.config) {
      return { outcome: "rejected", category: "configuration" };
    }
    const fetchImpl = this.fetchImpl ?? globalThis.fetch;
    try {
      const response = await fetchImpl(BREVO_TRANSACTIONAL_URL, {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": this.config.apiKey,
        },
        body: JSON.stringify({
          sender: { email: this.config.senderEmail, name: this.config.senderName },
          to: [to],
          replyTo,
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const body = await readProviderBody(response);
      if (response.ok) {
        if (!body.truncated && acceptedByProvider(response.status, body.text)) {
          return { outcome: "accepted" };
        }
        return { outcome: "unknown", category: "malformed_response" };
      }
      return { outcome: "rejected", category: categoryForStatus(response.status) };
    } catch (error) {
      const name = failureName(error);
      if (name === "TimeoutError" || name === "AbortError") {
        return { outcome: "unknown", category: "timeout" };
      }
      return { outcome: "unknown", category: "network" };
    }
  }
}

export function createBrevoInquiryDelivery(
  env: BrevoProcessEnv,
  options: { fetchImpl?: BrevoFetch; timeoutMs?: number } = {},
) {
  const read = readBrevoMailConfig(env);
  return new BrevoInquiryDelivery({
    config: read.ok ? read.config : null,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
  });
}
