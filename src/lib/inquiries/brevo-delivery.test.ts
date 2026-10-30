import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POST } from "@/app/api/inquiries/route";
import { BREVO_TRANSACTIONAL_URL, createBrevoInquiryDelivery, readBrevoMailConfig, type BrevoFetch } from "@/lib/inquiries/brevo-delivery";
import { createInquiryRuntime } from "@/lib/inquiries/config";
import { UnavailableInquiryDelivery } from "@/lib/inquiries/delivery";
import {
  BUSINESS_NOTIFICATION_SUBJECT,
  CUSTOMER_CONFIRMATION_SUBJECT,
  businessNotificationEmail,
  safeHttpUrl,
} from "@/lib/inquiries/email-templates";
import { handleInquiryPost } from "@/lib/inquiries/handler";
import type { DeliveryResult, InquiryDelivery, InquiryRateLimiter, InquiryRuntime, RateLimitResult, ValidatedInquiry } from "@/lib/inquiries/types";

const API_KEY = "test-brevo-api-key-value";
const SENDER_EMAIL = "levelupdigital.support@gmail.com";
const SENDER_NAME = "LevelUp Digital";
const NOTIFICATION_EMAIL = "levelupdigital.support@gmail.com";
const CUSTOMER_EMAIL = "secret.customer@example.com";

const validEnv = {
  BREVO_API_KEY: `  ${API_KEY}  `,
  BREVO_SENDER_EMAIL: ` ${SENDER_EMAIL} `,
  BREVO_SENDER_NAME: ` ${SENDER_NAME} `,
  INQUIRY_NOTIFICATION_EMAIL: ` ${NOTIFICATION_EMAIL} `,
};

function inquiry(): ValidatedInquiry {
  return {
    projectType: "website",
    budget: "range-100",
    timeline: "month",
    name: "Ada <script>alert(1)</script>",
    email: CUSTOMER_EMAIL,
    business: "Level <Studio>",
    details: "Line one\n<img src=x onerror=alert(1)>",
    references: [
      { url: "https://example.com/a?q=1&b=2", note: "Nice <b>type</b>" },
      { url: "http://example.org/layout" },
    ],
  };
}

type Captured = { url: string; init: RequestInit };

function scriptedFetch(steps: Array<Response | Error>) {
  const calls: Captured[] = [];
  const fetchImpl: BrevoFetch = async (url, init) => {
    calls.push({ url, init });
    const next = steps[calls.length - 1];
    if (!next) {
      throw new Error("unexpected extra Brevo request");
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  };
  return { fetchImpl, calls };
}

function acceptedResponse() {
  return new Response(JSON.stringify({ messageId: "<accepted@brevo.example>" }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}

function errorResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function payloadOf(call: Captured) {
  assert.equal(typeof call.init.body, "string");
  return JSON.parse(String(call.init.body)) as {
    sender: { email: string; name: string };
    to: Array<{ email: string; name?: string }>;
    replyTo: { email: string; name?: string };
    subject: string;
    htmlContent: string;
    textContent: string;
  };
}

function deliveryWith(fetchImpl: BrevoFetch, timeoutMs?: number) {
  return createBrevoInquiryDelivery(validEnv, { fetchImpl, timeoutMs });
}

class AllowLimiter implements InquiryRateLimiter {
  async consume(): Promise<RateLimitResult> {
    return { status: "allowed" };
  }
}

class FixedDelivery implements InquiryDelivery {
  private readonly result: DeliveryResult;
  constructor(result: DeliveryResult) {
    this.result = result;
  }
  async deliver(): Promise<DeliveryResult> {
    return this.result;
  }
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

describe("Brevo configuration", () => {
  it("reports a missing API key", () => {
    const read = readBrevoMailConfig({ ...validEnv, BREVO_API_KEY: "   " });
    assert.equal(read.ok, false);
    if (!read.ok) {
      assert.deepEqual(read.issues, [{ field: "apiKey", problem: "missing" }]);
    }
  });

  it("reports a missing sender email", () => {
    const read = readBrevoMailConfig({ ...validEnv, BREVO_SENDER_EMAIL: undefined });
    assert.equal(read.ok, false);
    if (!read.ok) {
      assert.deepEqual(read.issues, [{ field: "senderEmail", problem: "missing" }]);
    }
  });

  it("reports a missing notification recipient", () => {
    const read = readBrevoMailConfig({ ...validEnv, INQUIRY_NOTIFICATION_EMAIL: "" });
    assert.equal(read.ok, false);
    if (!read.ok) {
      assert.deepEqual(read.issues, [{ field: "notificationEmail", problem: "missing" }]);
    }
  });

  it("reads a valid configuration from environment values", () => {
    const read = readBrevoMailConfig(validEnv);
    assert.deepEqual(read, {
      ok: true,
      config: {
        apiKey: API_KEY,
        senderEmail: SENDER_EMAIL,
        senderName: SENDER_NAME,
        notificationEmail: NOTIFICATION_EMAIL,
      },
    });
  });

  it("rejects invalid configuration without calling Brevo", async () => {
    const read = readBrevoMailConfig({
      BREVO_API_KEY: "too-short",
      BREVO_SENDER_EMAIL: "not-an-email",
      BREVO_SENDER_NAME: "Bad\nName",
      INQUIRY_NOTIFICATION_EMAIL: "also bad",
    });
    assert.equal(read.ok, false);
    if (!read.ok) {
      assert.deepEqual(
        read.issues.map((issue) => issue.field),
        ["apiKey", "senderEmail", "senderName", "notificationEmail"],
      );
    }
    let called = 0;
    const adapter = createBrevoInquiryDelivery(
      {
        BREVO_API_KEY: "too-short",
        BREVO_SENDER_EMAIL: "not-an-email",
        BREVO_SENDER_NAME: "Bad\nName",
        INQUIRY_NOTIFICATION_EMAIL: "also bad",
      },
      {
        fetchImpl: async () => {
          called += 1;
          throw new Error("fetch should not run");
        },
      },
    );
    const result = await adapter.deliver(inquiry());
    assert.deepEqual(result, { status: "unavailable", category: "configuration" });
    assert.equal(called, 0);
  });
});

describe("Brevo business notification", () => {
  it("sends the business notification to the Brevo transactional endpoint", async () => {
    const script = scriptedFetch([acceptedResponse(), acceptedResponse()]);
    const result = await deliveryWith(script.fetchImpl).deliver(inquiry());
    assert.equal(result.status, "accepted");
    assert.equal(script.calls[0]?.url, BREVO_TRANSACTIONAL_URL);
    assert.equal(script.calls[0]?.url.startsWith("https://"), true);
    assert.equal(script.calls[0]?.init.method, "POST");
    const headers = new Headers(script.calls[0]?.init.headers);
    assert.equal(headers.get("api-key"), API_KEY);
    assert.equal(headers.get("content-type"), "application/json");
  });

  it("uses the configured sender, recipient, and customer reply-to", async () => {
    const script = scriptedFetch([acceptedResponse(), acceptedResponse()]);
    await deliveryWith(script.fetchImpl).deliver(inquiry());
    const first = script.calls[0];
    assert.ok(first);
    const body = payloadOf(first);
    assert.deepEqual(body.sender, { email: SENDER_EMAIL, name: SENDER_NAME });
    assert.deepEqual(body.to, [{ email: NOTIFICATION_EMAIL, name: SENDER_NAME }]);
    assert.deepEqual(body.replyTo, { email: CUSTOMER_EMAIL, name: inquiry().name });
    assert.equal(body.subject, BUSINESS_NOTIFICATION_SUBJECT);
  });

  it("includes project details, references, escaped HTML, and plain text", () => {
    const message = businessNotificationEmail(inquiry(), {
      senderName: SENDER_NAME,
      notificationEmail: NOTIFICATION_EMAIL,
    });
    assert.equal(message.html.includes("<script>"), false);
    assert.equal(message.html.includes("<img"), false);
    assert.equal(message.html.includes("<b>"), false);
    assert.equal(message.html.includes("Ada &lt;script&gt;alert(1)&lt;/script&gt;"), true);
    assert.equal(message.html.includes("Line one<br>"), true);
    assert.equal(message.html.includes("&lt;img src=x onerror=alert(1)&gt;"), true);
    assert.equal(message.html.includes("Nice &lt;b&gt;type&lt;/b&gt;"), true);
    assert.equal(message.html.includes('href="https://example.com/a?q=1&amp;b=2"'), true);
    assert.equal(message.html.includes("http://example.org/layout"), true);
    assert.equal(message.html.includes("Business website"), true);
    assert.equal(message.html.includes("¥100,000–¥199,999"), true);
    assert.equal(message.html.includes("Within 1 month"), true);
    assert.equal(message.text.includes("Ada <script>alert(1)</script>"), true);
    assert.equal(message.text.includes("Line one\n<img src=x onerror=alert(1)>"), true);
    assert.equal(message.text.includes("https://example.com/a?q=1&b=2"), true);
    assert.equal(message.text.includes("Nice <b>type</b>"), true);
    assert.equal(message.text.includes("http://example.org/layout"), true);
    assert.equal(message.html.includes(API_KEY), false);
    assert.equal(safeHttpUrl("https://user:s3cret@example.com/path"), null);
    assert.equal(businessNotificationEmail({ ...inquiry(), references: [{ url: "https://user:s3cret@example.com/path" }] }, {
      senderName: SENDER_NAME,
      notificationEmail: NOTIFICATION_EMAIL,
    }).html.includes("href=\"https://user:s3cret@example.com/path\""), false);
  });

  it("says none provided when references are absent", () => {
    const message = businessNotificationEmail({ ...inquiry(), business: undefined, details: undefined, references: [] }, {
      senderName: SENDER_NAME,
      notificationEmail: NOTIFICATION_EMAIL,
    });
    assert.equal(message.html.includes("None provided"), true);
    assert.equal(message.html.includes("Not provided"), true);
    assert.equal(message.text.includes("None provided"), true);
    assert.equal(message.text.includes("Not provided"), true);
  });
});

describe("Brevo customer confirmation", () => {
  it("sends a confirmation to the customer after the business notification is accepted", async () => {
    const script = scriptedFetch([acceptedResponse(), acceptedResponse()]);
    const result = await deliveryWith(script.fetchImpl).deliver(inquiry());
    assert.deepEqual(result, { status: "accepted", confirmation: "accepted" });
    const confirmation = script.calls[1];
    assert.ok(confirmation);
    const body = payloadOf(confirmation);
    assert.deepEqual(body.sender, { email: SENDER_EMAIL, name: SENDER_NAME });
    assert.deepEqual(body.to, [{ email: CUSTOMER_EMAIL }]);
    assert.deepEqual(body.replyTo, { email: NOTIFICATION_EMAIL, name: SENDER_NAME });
    assert.equal(body.subject, CUSTOMER_CONFIRMATION_SUBJECT);
    assert.equal(body.htmlContent.includes("Business website"), true);
    assert.equal(body.textContent.includes("Business website"), true);
    assert.equal(body.htmlContent.includes(CUSTOMER_EMAIL), false);
    assert.equal(body.textContent.includes(CUSTOMER_EMAIL), false);
    assert.equal(body.htmlContent.includes("Level &lt;Studio&gt;"), false);
    assert.equal(body.textContent.includes("Line one"), false);
    assert.equal(body.htmlContent.includes("example.com"), false);
    assert.equal(body.htmlContent.includes("Within 1 month"), false);
    assert.equal(body.textContent.includes("¥100,000"), false);
    assert.equal(body.textContent.includes("range-100"), false);
    assert.equal(body.htmlContent.includes(NOTIFICATION_EMAIL), true);
    assert.equal(body.textContent.includes("https://levelup-digital.dev/"), true);
    assert.equal(body.htmlContent.includes("within"), false);
    assert.equal(JSON.stringify(result).includes("<accepted@brevo.example>"), false);
  });
});

describe("Brevo provider failures", () => {
  it("rejects authentication failures before a confirmation is sent", async () => {
    const script = scriptedFetch([errorResponse(401, { message: "bad-token-detail" })]);
    const result = await deliveryWith(script.fetchImpl).deliver(inquiry());
    assert.deepEqual(result, { status: "rejected", category: "authentication" });
    assert.equal(script.calls.length, 1);
    assert.equal(JSON.stringify(result).includes("bad-token-detail"), false);
    assert.equal(JSON.stringify(result).includes(API_KEY), false);
  });

  it("rejects provider rate limits without a confirmation", async () => {
    const script = scriptedFetch([errorResponse(429, { message: "slow down" })]);
    const result = await deliveryWith(script.fetchImpl).deliver(inquiry());
    assert.deepEqual(result, { status: "rejected", category: "rate_limited" });
    assert.equal(script.calls.length, 1);
  });

  it("rejects provider server errors without a confirmation", async () => {
    const script = scriptedFetch([errorResponse(503, { message: "upstream unavailable" })]);
    const result = await deliveryWith(script.fetchImpl).deliver(inquiry());
    assert.deepEqual(result, { status: "rejected", category: "provider_error" });
    assert.equal(script.calls.length, 1);
    assert.equal(JSON.stringify(result).includes("upstream"), false);
  });

  it("treats a network error as an unknown business outcome and does not retry", async () => {
    const script = scriptedFetch([new TypeError("fetch failed")]);
    const result = await deliveryWith(script.fetchImpl).deliver(inquiry());
    assert.deepEqual(result, { status: "unknown", category: "network" });
    assert.equal(script.calls.length, 1);
  });

  it("treats a timeout as an unknown business outcome and does not retry", async () => {
    const script = scriptedFetch([Object.assign(new Error("timed out"), { name: "TimeoutError" })]);
    const result = await deliveryWith(script.fetchImpl, 20).deliver(inquiry());
    assert.deepEqual(result, { status: "unknown", category: "timeout" });
    assert.equal(script.calls.length, 1);
  });

  it("treats a malformed success body as unknown and does not send a confirmation", async () => {
    const script = scriptedFetch([new Response("not-json", { status: 201 })]);
    const result = await deliveryWith(script.fetchImpl).deliver(inquiry());
    assert.deepEqual(result, { status: "unknown", category: "malformed_response" });
    assert.equal(script.calls.length, 1);
  });
});

describe("Brevo partial delivery", () => {
  it("records an accepted confirmation separately from the business notification", async () => {
    const script = scriptedFetch([acceptedResponse(), acceptedResponse()]);
    const result = await deliveryWith(script.fetchImpl).deliver(inquiry());
    assert.deepEqual(result, { status: "accepted", confirmation: "accepted" });
    assert.equal(script.calls.length, 2);
  });

  it("keeps the business acceptance when the confirmation is rejected", async () => {
    const script = scriptedFetch([acceptedResponse(), errorResponse(400, { message: "sender blocked" })]);
    const result = await deliveryWith(script.fetchImpl).deliver(inquiry());
    assert.deepEqual(result, {
      status: "accepted",
      confirmation: "rejected",
      confirmationCategory: "invalid_sender",
    });
    assert.equal(script.calls.length, 2);
    assert.equal(JSON.stringify(result).includes("sender blocked"), false);
  });

  it("keeps the business acceptance when the confirmation outcome is unknown", async () => {
    const script = scriptedFetch([acceptedResponse(), Object.assign(new Error("timed out"), { name: "AbortError" })]);
    const result = await deliveryWith(script.fetchImpl).deliver(inquiry());
    assert.deepEqual(result, {
      status: "accepted",
      confirmation: "unknown",
      confirmationCategory: "timeout",
    });
    assert.equal(script.calls.length, 2);
  });

  it("does not send a confirmation when the business notification is rejected", async () => {
    const script = scriptedFetch([errorResponse(422, { code: "invalid_parameter" })]);
    const result = await deliveryWith(script.fetchImpl).deliver(inquiry());
    assert.deepEqual(result, { status: "rejected", category: "invalid_sender" });
    assert.equal(script.calls.length, 1);
  });

  it("does not send a confirmation when the business outcome is unknown", async () => {
    const script = scriptedFetch([new TypeError("socket closed")]);
    const result = await deliveryWith(script.fetchImpl).deliver(inquiry());
    assert.equal(result.status, "unknown");
    assert.equal(script.calls.length, 1);
  });
});

describe("Brevo delivery safety", () => {
  it("does not call the live fetch implementation", async () => {
    const original = globalThis.fetch;
    let liveCalls = 0;
    globalThis.fetch = (() => {
      liveCalls += 1;
      throw new Error("live network disabled");
    }) as typeof fetch;
    const logs: unknown[][] = [];
    const originalError = console.error;
    const originalLog = console.log;
    console.error = (...args: unknown[]) => {
      logs.push(args);
    };
    console.log = (...args: unknown[]) => {
      logs.push(args);
    };
    try {
      const script = scriptedFetch([errorResponse(401, { message: "nope" })]);
      await deliveryWith(script.fetchImpl).deliver(inquiry());
      assert.equal(liveCalls, 0);
      const logged = JSON.stringify(logs);
      assert.equal(logged.includes(CUSTOMER_EMAIL), false);
      assert.equal(logged.includes(API_KEY), false);
      assert.equal(logged.includes("Ada"), false);
    } finally {
      globalThis.fetch = original;
      console.error = originalError;
      console.log = originalLog;
    }
  });

  it("keeps Brevo credentials from selecting the public delivery adapter", () => {
    const created = createInquiryRuntime({
      NODE_ENV: "production",
      INQUIRY_SUBMISSIONS_ENABLED: "true",
      INQUIRY_TRUSTED_ORIGINS: "https://levelup-digital.dev",
      INQUIRY_RATE_LIMIT_KEY_SECRET: "test-rate-limit-secret",
      BREVO_API_KEY: API_KEY,
      BREVO_SENDER_EMAIL: SENDER_EMAIL,
      BREVO_SENDER_NAME: SENDER_NAME,
      INQUIRY_NOTIFICATION_EMAIL: NOTIFICATION_EMAIL,
    });
    assert.equal(created.delivery instanceof UnavailableInquiryDelivery, true);
    assert.equal(created.submissionsEnabled, true);
  });

  it("does not let the public route send mail or report success", async () => {
    const previous = {
      enabled: process.env.INQUIRY_SUBMISSIONS_ENABLED,
      origins: process.env.INQUIRY_TRUSTED_ORIGINS,
      key: process.env.BREVO_API_KEY,
      sender: process.env.BREVO_SENDER_EMAIL,
      name: process.env.BREVO_SENDER_NAME,
      notification: process.env.INQUIRY_NOTIFICATION_EMAIL,
    };
    process.env.INQUIRY_SUBMISSIONS_ENABLED = "true";
    process.env.INQUIRY_TRUSTED_ORIGINS = "https://levelup-digital.dev";
    process.env.BREVO_API_KEY = API_KEY;
    process.env.BREVO_SENDER_EMAIL = SENDER_EMAIL;
    process.env.BREVO_SENDER_NAME = SENDER_NAME;
    process.env.INQUIRY_NOTIFICATION_EMAIL = NOTIFICATION_EMAIL;
    const original = globalThis.fetch;
    let liveCalls = 0;
    globalThis.fetch = (() => {
      liveCalls += 1;
      throw new Error("live network disabled");
    }) as typeof fetch;
    try {
      const response = await POST(
        new Request("https://levelup-digital.dev/api/inquiries", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "https://levelup-digital.dev",
            "x-vercel-forwarded-for": "203.0.113.10",
          },
          body: JSON.stringify({
            projectType: "website",
            budget: "range-100",
            timeline: "month",
            name: "Ada Lovelace",
            email: CUSTOMER_EMAIL,
          }),
        }),
      );
      const body = (await response.json()) as { ok: boolean };
      assert.equal(body.ok, false);
      assert.notEqual(response.status, 200);
      assert.equal(liveCalls, 0);
    } finally {
      globalThis.fetch = original;
      restoreEnv("INQUIRY_SUBMISSIONS_ENABLED", previous.enabled);
      restoreEnv("INQUIRY_TRUSTED_ORIGINS", previous.origins);
      restoreEnv("BREVO_API_KEY", previous.key);
      restoreEnv("BREVO_SENDER_EMAIL", previous.sender);
      restoreEnv("BREVO_SENDER_NAME", previous.name);
      restoreEnv("INQUIRY_NOTIFICATION_EMAIL", previous.notification);
    }
  });

  it("maps partial delivery to a success response without a provider id", async () => {
    const current: InquiryRuntime = {
      submissionsEnabled: true,
      trustedOrigins: ["https://levelup-digital.dev"],
      allowDevelopmentOrigins: false,
      rateLimitKeySecret: "test-rate-limit-secret",
      rateLimiter: new AllowLimiter(),
      delivery: new FixedDelivery({
        status: "accepted",
        confirmation: "rejected",
        confirmationCategory: "invalid_sender",
      }),
    };
    const response = await handleInquiryPost(
      new Request("https://levelup-digital.dev/api/inquiries", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://levelup-digital.dev",
          "x-vercel-forwarded-for": "203.0.113.10",
        },
        body: JSON.stringify({
          projectType: "website",
          budget: "range-100",
          timeline: "month",
          name: "Ada Lovelace",
          email: "ada@example.com",
        }),
      }),
      current,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, confirmation: "rejected" });
  });

  it("keeps an unknown business outcome off the success response", async () => {
    const current: InquiryRuntime = {
      submissionsEnabled: true,
      trustedOrigins: ["https://levelup-digital.dev"],
      allowDevelopmentOrigins: false,
      rateLimitKeySecret: "test-rate-limit-secret",
      rateLimiter: new AllowLimiter(),
      delivery: new FixedDelivery({ status: "unknown", category: "timeout" }),
    };
    const response = await handleInquiryPost(
      new Request("https://levelup-digital.dev/api/inquiries", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://levelup-digital.dev",
          "x-vercel-forwarded-for": "203.0.113.10",
        },
        body: JSON.stringify({
          projectType: "website",
          budget: "range-100",
          timeline: "month",
          name: "Ada Lovelace",
          email: "ada@example.com",
        }),
      }),
      current,
    );
    const body = (await response.json()) as { ok: boolean; code?: string; category?: string };
    assert.equal(response.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.code, "DELIVERY_UNAVAILABLE");
    assert.equal(body.category, undefined);
  });
});
