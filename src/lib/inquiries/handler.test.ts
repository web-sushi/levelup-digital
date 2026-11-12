import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DELETE, GET, PATCH, POST, PUT } from "@/app/api/inquiries/route";
import { hashClientKey, trustedClientAddress } from "@/lib/inquiries/abuse-protection";
import { createInquiryRuntime } from "@/lib/inquiries/config";
import { UnavailableInquiryDelivery } from "@/lib/inquiries/delivery";
import { handleInquiryPost } from "@/lib/inquiries/handler";
import { MAX_INQUIRY_BODY_BYTES } from "@/lib/inquiries/schema";
import type {
  InquiryDelivery,
  InquiryRateLimiter,
  InquiryRuntime,
  RateLimitResult,
  ValidatedInquiry,
} from "@/lib/inquiries/types";
import { budgets, projectTypes, timelines } from "@/components/contact/inquiry-model";

const SECRET = "test-rate-limit-secret";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

class AllowLimiter implements InquiryRateLimiter {
  async consume(): Promise<RateLimitResult> {
    return { status: "allowed" };
  }
}

class UnavailableCallLimiter implements InquiryRateLimiter {
  calls = 0;
  async consume(): Promise<RateLimitResult> {
    this.calls += 1;
    return { status: "unavailable" };
  }
}

class MemoryLimiter implements InquiryRateLimiter {
  private hits = new Map<string, number>();
  async consume(clientKey: string): Promise<RateLimitResult> {
    const count = (this.hits.get(clientKey) ?? 0) + 1;
    this.hits.set(clientKey, count);
    if (count > 5) {
      return { status: "limited", retryAfterSeconds: 120 };
    }
    return { status: "allowed" };
  }
}

class RecordingDelivery implements InquiryDelivery {
  calls = 0;
  inquiry: ValidatedInquiry | null = null;
  private readonly status: "accepted" | "unavailable" | "rejected";

  constructor(status: "accepted" | "unavailable" | "rejected" = "accepted") {
    this.status = status;
  }
  async deliver(inquiry: ValidatedInquiry) {
    this.calls += 1;
    this.inquiry = inquiry;
    return { status: this.status };
  }
}

function runtime(overrides: Partial<InquiryRuntime> = {}): InquiryRuntime {
  return {
    submissionsEnabled: false,
    trustedOrigins: ["https://levelup-digital.dev"],
    allowDevelopmentOrigins: false,
    rateLimitKeySecret: SECRET,
    rateLimiter: new AllowLimiter(),
    delivery: new RecordingDelivery("unavailable"),
    ...overrides,
  };
}

function validInquiry(overrides: Record<string, unknown> = {}) {
  return {
    projectType: "website",
    budget: "range-100",
    timeline: "month",
    name: "Ada Lovelace",
    email: "Ada@Example.com",
    business: " Level Studio ",
    details: "A booking site for a small studio.",
    references: [
      { url: "https://example.com/guide", note: "I like the navigation." },
      { url: "http://example.org/layout" },
    ],
    ...overrides,
  };
}

function inquiryRequest(
  body: unknown,
  options: {
    origin?: string | null;
    contentType?: string | null;
    headers?: Record<string, string>;
    raw?: string;
  } = {},
) {
  const headers = new Headers(options.headers);
  if (options.contentType === undefined) {
    headers.set("content-type", "application/json");
  } else if (options.contentType) {
    headers.set("content-type", options.contentType);
  }
  if (options.origin === undefined) {
    headers.set("origin", "https://levelup-digital.dev");
  } else if (options.origin) {
    headers.set("origin", options.origin);
  }
  return new Request("https://levelup-digital.dev/api/inquiries", {
    method: "POST",
    headers,
    body: options.raw ?? JSON.stringify(body),
  });
}

async function readJson(response: Response) {
  return (await response.json()) as {
    ok: boolean;
    code?: string;
    message?: string;
    fieldErrors?: Record<string, string>;
  };
}

describe("inquiry request parsing", () => {
  it("accepts valid JSON when submissions are disabled", async () => {
    const delivery = new RecordingDelivery();
    const response = await handleInquiryPost(inquiryRequest(validInquiry()), runtime({ delivery }));
    const body = await readJson(response);
    assert.equal(response.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.code, "SUBMISSIONS_UNAVAILABLE");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(delivery.calls, 0);
  });

  it("rejects malformed JSON", async () => {
    const response = await handleInquiryPost(inquiryRequest(null, { raw: "{" }), runtime());
    const body = await readJson(response);
    assert.equal(response.status, 400);
    assert.equal(body.code, "INVALID_REQUEST");
    assert.equal(body.fieldErrors, undefined);
  });

  it("rejects unsupported media types", async () => {
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry(), { contentType: "text/plain" }),
      runtime(),
    );
    const body = await readJson(response);
    assert.equal(response.status, 415);
    assert.equal(body.code, "UNSUPPORTED_MEDIA_TYPE");
  });

  it("accepts a JSON charset", async () => {
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry(), { contentType: "application/json; charset=utf-8" }),
      runtime(),
    );
    assert.equal(response.status, 503);
  });

  it("rejects an oversized declared body", async () => {
    const raw = " ".repeat(MAX_INQUIRY_BODY_BYTES + 1);
    const response = await handleInquiryPost(inquiryRequest(null, { raw }), runtime());
    const body = await readJson(response);
    assert.equal(response.status, 413);
    assert.equal(body.code, "PAYLOAD_TOO_LARGE");
  });

  it("rejects an oversized stream even when content-length is absent", async () => {
    const chunk = new Uint8Array(1024);
    let sent = 0;
    const target = MAX_INQUIRY_BODY_BYTES + 1024;
    const request = new Request("https://levelup-digital.dev/api/inquiries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://levelup-digital.dev",
      },
      body: new ReadableStream({
        pull(controller) {
          if (sent >= target) {
            controller.close();
            return;
          }
          controller.enqueue(chunk);
          sent += chunk.byteLength;
        },
      }),
      duplex: "half",
    } as RequestInit);
    const response = await handleInquiryPost(request, runtime());
    const body = await readJson(response);
    assert.equal(response.status, 413);
    assert.equal(body.code, "PAYLOAD_TOO_LARGE");
  });

  it("rejects arrays and other non-object payloads", async () => {
    for (const raw of ["[]", "null", "\"hello\"", "4"]) {
      const response = await handleInquiryPost(inquiryRequest(null, { raw }), runtime());
      const body = await readJson(response);
      assert.equal(response.status, 400, raw);
      assert.equal(body.code, "INVALID_REQUEST");
    }
  });

  it("rejects unexpected fields without echoing them", async () => {
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry({ phone: "080-0000-0000" })),
      runtime(),
    );
    const body = await readJson(response);
    const text = JSON.stringify(body);
    assert.equal(response.status, 400);
    assert.equal(body.code, "INVALID_REQUEST");
    assert.equal(text.includes("080-0000-0000"), false);
    assert.equal(text.includes("phone"), false);
  });

  it("rejects unexpected reference properties", async () => {
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry({ references: [{ url: "https://example.com", id: "ref-1" }] })),
      runtime(),
    );
    const body = await readJson(response);
    assert.equal(response.status, 400);
    assert.equal(body.code, "INVALID_REQUEST");
    assert.equal(JSON.stringify(body).includes("ref-1"), false);
  });

  it("rejects invalid field types", async () => {
    const response = await handleInquiryPost(inquiryRequest(validInquiry({ email: 12 })), runtime());
    const body = await readJson(response);
    assert.equal(response.status, 400);
    assert.equal(body.code, "INVALID_REQUEST");
  });
});

describe("inquiry validation", () => {
  it("accepts every wizard enum value", async () => {
    for (const projectType of projectTypes) {
      for (const budget of budgets) {
        for (const timeline of timelines) {
          const response = await handleInquiryPost(
            inquiryRequest(
              validInquiry({
                projectType: projectType.value,
                budget: budget.value,
                timeline: timeline.value,
              }),
            ),
            runtime(),
          );
          assert.equal(response.status, 503, `${projectType.value}/${budget.value}/${timeline.value}`);
        }
      }
    }
  });

  it("rejects invalid enum values", async () => {
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry({ projectType: "logo", budget: "free", timeline: "yesterday" })),
      runtime(),
    );
    const body = await readJson(response);
    assert.equal(response.status, 422);
    assert.equal(body.code, "VALIDATION_ERROR");
    assert.equal(body.fieldErrors?.projectType !== undefined, true);
    assert.equal(body.fieldErrors?.budget !== undefined, true);
    assert.equal(body.fieldErrors?.timeline !== undefined, true);
  });

  it("rejects empty and whitespace-only names", async () => {
    for (const name of ["", "   "]) {
      const response = await handleInquiryPost(inquiryRequest(validInquiry({ name })), runtime());
      const body = await readJson(response);
      assert.equal(response.status, 422);
      assert.equal(body.fieldErrors?.name, "Enter your name.");
    }
  });

  it("rejects an invalid email without returning the address", async () => {
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry({ email: "not-an-email" })),
      runtime(),
    );
    const body = await readJson(response);
    assert.equal(response.status, 422);
    assert.equal(body.fieldErrors?.email, "Enter a valid email address.");
    assert.equal(JSON.stringify(body).includes("not-an-email"), false);
  });

  it("allows omitted optional fields", async () => {
    const payload = validInquiry();
    const requiredOnly = {
      projectType: payload.projectType,
      budget: payload.budget,
      timeline: payload.timeline,
      name: payload.name,
      email: payload.email,
    };
    const response = await handleInquiryPost(inquiryRequest(requiredOnly), runtime());
    assert.equal(response.status, 503);
  });

  it("enforces maximum lengths", async () => {
    const response = await handleInquiryPost(
      inquiryRequest(
        validInquiry({
          name: "A".repeat(81),
          email: `${"a".repeat(250)}@example.com`,
          business: "B".repeat(121),
          details: "C".repeat(3001),
          references: [{ url: "https://example.com/guide", note: "N".repeat(301) }],
        }),
      ),
      runtime(),
    );
    const body = await readJson(response);
    assert.equal(response.status, 422);
    assert.equal(body.fieldErrors?.name !== undefined, true);
    assert.equal(body.fieldErrors?.email !== undefined, true);
    assert.equal(body.fieldErrors?.business !== undefined, true);
    assert.equal(body.fieldErrors?.details !== undefined, true);
    assert.equal(body.fieldErrors?.references, "Keep each reference note under 300 characters.");

    const longUrl = await handleInquiryPost(
      inquiryRequest(
        validInquiry({
          references: [{ url: `https://example.com/${"d".repeat(500)}` }],
        }),
      ),
      runtime(),
    );
    const urlBody = await readJson(longUrl);
    assert.equal(urlBody.fieldErrors?.references, "Enter a shorter http or https link.");
  });

  it("accepts three references and rejects four", async () => {
    const three = await handleInquiryPost(
      inquiryRequest(
        validInquiry({
          references: [
            { url: "https://example.com/1" },
            { url: "https://example.com/2" },
            { url: "https://example.com/3", note: "Type" },
          ],
        }),
      ),
      runtime(),
    );
    assert.equal(three.status, 503);

    const four = await handleInquiryPost(
      inquiryRequest(
        validInquiry({
          references: [1, 2, 3, 4].map((item) => ({ url: `https://example.com/${item}` })),
        }),
      ),
      runtime(),
    );
    const body = await readJson(four);
    assert.equal(four.status, 422);
    assert.equal(body.fieldErrors?.references, "Add no more than three references.");
  });

  it("rejects unsupported URL protocols and embedded credentials", async () => {
    const cases = [
      "javascript:alert(1)",
      "data:text/html,hi",
      "file:///tmp/a",
      "https://user:s3cret@example.com/path",
      "https://user@example.com/path",
    ];
    for (const url of cases) {
      const response = await handleInquiryPost(
        inquiryRequest(validInquiry({ references: [{ url }] })),
        runtime(),
      );
      const body = await readJson(response);
      assert.equal(response.status, 422, url);
      assert.equal(JSON.stringify(body).includes("s3cret"), false);
      assert.equal(JSON.stringify(body).includes("alert(1)"), false);
    }
  });

  it("rejects a note without a URL", async () => {
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry({ references: [{ url: "", note: "Nice layout" }] })),
      runtime(),
    );
    const body = await readJson(response);
    assert.equal(response.status, 422);
    assert.equal(body.fieldErrors?.references, "Add a link for this note, or remove the note.");
    assert.equal(JSON.stringify(body).includes("Nice layout"), false);
  });
});

describe("inquiry abuse controls", () => {
  it("allows a trusted origin and rejects an untrusted one", async () => {
    const allowed = await handleInquiryPost(inquiryRequest(validInquiry()), runtime());
    assert.equal(allowed.status, 503);

    const denied = await handleInquiryPost(
      inquiryRequest(validInquiry(), { origin: "https://evil.example" }),
      runtime(),
    );
    const body = await readJson(denied);
    assert.equal(denied.status, 403);
    assert.equal(body.code, "FORBIDDEN_ORIGIN");
    assert.equal(JSON.stringify(body).includes("evil.example"), false);
  });

  it("rejects a missing or malformed origin in production and allows a missing origin in development", async () => {
    const missing = await handleInquiryPost(
      inquiryRequest(validInquiry(), { origin: null }),
      runtime({ allowDevelopmentOrigins: false }),
    );
    assert.equal(missing.status, 403);

    const malformed = await handleInquiryPost(
      inquiryRequest(validInquiry(), { origin: "not a url" }),
      runtime(),
    );
    assert.equal(malformed.status, 403);

    const development = await handleInquiryPost(
      inquiryRequest(validInquiry(), { origin: null }),
      runtime({ allowDevelopmentOrigins: true }),
    );
    assert.equal(development.status, 503);
  });

  it("allows documented development origins only when development access is enabled", async () => {
    const blocked = await handleInquiryPost(
      inquiryRequest(validInquiry(), { origin: "http://localhost:3000" }),
      runtime({ allowDevelopmentOrigins: false, trustedOrigins: ["https://levelup-digital.dev"] }),
    );
    assert.equal(blocked.status, 403);

    const allowed = await handleInquiryPost(
      inquiryRequest(validInquiry(), { origin: "http://localhost:3001" }),
      runtime({ allowDevelopmentOrigins: true, trustedOrigins: [] }),
    );
    assert.equal(allowed.status, 503);
  });

  it("does not trust a caller-supplied host or forwarded header", async () => {
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry(), {
        origin: "https://evil.example",
        headers: {
          host: "levelup-digital.dev",
          "x-forwarded-for": "203.0.113.10",
        },
      }),
      runtime(),
    );
    assert.equal(response.status, 403);
    assert.equal(trustedClientAddress(new Headers({ "x-forwarded-for": "203.0.113.10" })), null);
    assert.equal(trustedClientAddress(new Headers({
      "x-real-ip": "203.0.113.10",
      "x-forwarded-for": "203.0.113.10",
    })), null);
    assert.equal(trustedClientAddress(new Headers({
      "x-vercel-forwarded-for": "198.51.100.5, 203.0.113.10",
    })), null);
    assert.equal(trustedClientAddress(new Headers({
      "x-forwarded-for": "198.51.100.5",
      "x-vercel-forwarded-for": "203.0.113.10",
    })), "203.0.113.10");
  });

  it("does not spend a rate-limit slot on a forged address list", async () => {
    const limiter = new MemoryLimiter();
    const delivery = new RecordingDelivery("accepted");
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry(), {
        headers: {
          "x-forwarded-for": "203.0.113.10",
          "x-real-ip": "203.0.113.10",
          "x-vercel-forwarded-for": "198.51.100.5, 203.0.113.10",
        },
      }),
      runtime({ submissionsEnabled: true, rateLimiter: limiter, delivery }),
    );
    const body = await readJson(response);
    assert.equal(response.status, 503);
    assert.equal(body.code, "RATE_LIMIT_UNAVAILABLE");
    assert.equal(delivery.calls, 0);
  });

  it("returns a generic non-success response for a filled honeypot", async () => {
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry({ companyWebsite: "https://spam.example" })),
      runtime(),
    );
    const body = await readJson(response);
    const text = JSON.stringify(body);
    assert.equal(response.status, 400);
    assert.equal(body.ok, false);
    assert.equal(body.code, "INVALID_REQUEST");
    assert.equal(text.includes("honeypot"), false);
    assert.equal(text.includes("companyWebsite"), false);
    assert.equal(text.includes("spam.example"), false);
  });

  it("ignores an empty honeypot", async () => {
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry({ companyWebsite: "   " })),
      runtime(),
    );
    assert.equal(response.status, 503);
  });

  it("rejects the sixth request from one client key", async () => {
    const limiter = new MemoryLimiter();
    const delivery = new RecordingDelivery("accepted");
    const current = runtime({
      submissionsEnabled: true,
      rateLimiter: limiter,
      delivery,
    });
    let lastStatus = 0;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await handleInquiryPost(
        inquiryRequest(validInquiry(), { headers: { "x-vercel-forwarded-for": "203.0.113.10" } }),
        current,
      );
      lastStatus = response.status;
      assert.equal(response.status, 200);
    }
    const limited = await handleInquiryPost(
      inquiryRequest(validInquiry(), { headers: { "x-vercel-forwarded-for": "203.0.113.10" } }),
      current,
    );
    const body = await readJson(limited);
    assert.equal(lastStatus, 200);
    assert.equal(limited.status, 429);
    assert.equal(body.code, "RATE_LIMITED");
    assert.equal(limited.headers.get("retry-after"), "120");
    assert.equal(delivery.calls, 5);
  });

  it("fails closed when the rate limiter is unavailable", async () => {
    const delivery = new RecordingDelivery("accepted");
    const limiter = new UnavailableCallLimiter();
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry(), { headers: { "x-vercel-forwarded-for": "203.0.113.10" } }),
      runtime({ submissionsEnabled: true, rateLimiter: limiter, delivery }),
    );
    const body = await readJson(response);
    assert.equal(response.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.code, "RATE_LIMIT_UNAVAILABLE");
    assert.equal(delivery.calls, 0);
    assert.equal(limiter.calls, 1);
  });

  it("fails closed when a trustworthy client address or key secret is missing", async () => {
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry()),
      runtime({ submissionsEnabled: true, rateLimitKeySecret: null, rateLimiter: new AllowLimiter() }),
    );
    const body = await readJson(response);
    assert.equal(response.status, 503);
    assert.equal(body.code, "RATE_LIMIT_UNAVAILABLE");
  });

  it("hashes client keys instead of keeping the raw address", () => {
    const hashed = hashClientKey("203.0.113.10", SECRET);
    assert.notEqual(hashed, "203.0.113.10");
    assert.match(hashed, /^[a-f0-9]{64}$/);
  });
});

describe("inquiry delivery safety", () => {
  it("does not report success when delivery is unavailable", async () => {
    const delivery = new RecordingDelivery("unavailable");
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry(), { headers: { "x-vercel-forwarded-for": "203.0.113.10" } }),
      runtime({ submissionsEnabled: true, rateLimiter: new AllowLimiter(), delivery }),
    );
    const body = await readJson(response);
    assert.equal(response.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.code, "DELIVERY_UNAVAILABLE");
    assert.equal(delivery.calls, 1);
  });

  it("reports success only after a test delivery adapter accepts the inquiry", async () => {
    const delivery = new RecordingDelivery("accepted");
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (() => {
      fetchCalls += 1;
      throw new Error("network disabled");
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
      const response = await handleInquiryPost(
        inquiryRequest(validInquiry(), { headers: { "x-vercel-forwarded-for": "2001:db8::1" } }),
        runtime({ submissionsEnabled: true, rateLimiter: new AllowLimiter(), delivery }),
      );
      const body = await readJson(response);
      assert.equal(response.status, 200);
      assert.deepEqual(body, { ok: true });
      assert.equal(delivery.inquiry?.email, "Ada@example.com");
      assert.equal(delivery.inquiry?.business, "Level Studio");
      assert.equal(delivery.inquiry?.references.length, 2);
      assert.equal(fetchCalls, 0);
      assert.equal(JSON.stringify(logs).includes("Ada@"), false);
      assert.equal(JSON.stringify(logs).includes("example.com"), false);
    } finally {
      globalThis.fetch = originalFetch;
      console.error = originalError;
      console.log = originalLog;
    }
  });

  it("keeps the production runtime from accepting a submission", async () => {
    const created = createInquiryRuntime({
      NODE_ENV: "production",
      INQUIRY_SUBMISSIONS_ENABLED: "true",
      INQUIRY_TRUSTED_ORIGINS: "https://levelup-digital.dev",
      INQUIRY_RATE_LIMIT_KEY_SECRET: SECRET,
    });
    assert.equal(created.delivery instanceof UnavailableInquiryDelivery, true);
    assert.equal(created.allowDevelopmentOrigins, false);
    const response = await handleInquiryPost(
      inquiryRequest(validInquiry(), { headers: { "x-vercel-forwarded-for": "203.0.113.10" } }),
      created,
    );
    const body = await readJson(response);
    assert.equal(response.status, 503);
    assert.equal(body.ok, false);
    assert.notEqual(response.status, 200);
  });

  it("does not let the public route report success", async () => {
    const previous = {
      enabled: process.env.INQUIRY_SUBMISSIONS_ENABLED,
      origins: process.env.INQUIRY_TRUSTED_ORIGINS,
    };
    process.env.INQUIRY_SUBMISSIONS_ENABLED = "true";
    process.env.INQUIRY_TRUSTED_ORIGINS = "https://levelup-digital.dev";
    try {
      const response = await POST(
        inquiryRequest(validInquiry(), { headers: { "x-vercel-forwarded-for": "203.0.113.10" } }),
      );
      const body = await readJson(response);
      assert.equal(body.ok, false);
      assert.notEqual(response.status, 200);
      const method = await GET();
      assert.equal(method.status, 405);
      assert.equal((await PUT()).status, 405);
      assert.equal((await PATCH()).status, 405);
      assert.equal((await DELETE()).status, 405);
    } finally {
      restoreEnv("INQUIRY_SUBMISSIONS_ENABLED", previous.enabled);
      restoreEnv("INQUIRY_TRUSTED_ORIGINS", previous.origins);
    }
  });
});
