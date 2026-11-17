import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InquiryDraft } from "@/components/contact/inquiry-model";
import {
  createIdempotencyKey,
  createInquiryClient,
  interpretInquiryResponse,
  requestFingerprint,
  submissionCopy,
  toInquiryRequest,
  validateInquiryDraft,
} from "@/lib/inquiries/client";
import { IDEMPOTENCY_KEY_PATTERN } from "@/lib/inquiries/idempotency";
import { publicInquirySubmissionsAvailable } from "@/lib/inquiries/public-availability";
import { createInquiryRuntime } from "@/lib/inquiries/config";
import { UnavailableInquiryDelivery } from "@/lib/inquiries/delivery";

const KEY_A = "11111111-1111-4111-8111-111111111111";
const KEY_B = "22222222-2222-4222-8222-222222222222";

function draft(overrides: Partial<InquiryDraft> = {}): InquiryDraft {
  return {
    projectType: "website",
    budget: "range-100",
    timeline: "month",
    name: "Ada Lovelace",
    email: "Ada@Example.com",
    business: "Analytical Engines",
    details: "A site for the workshop.",
    references: [
      { id: "ref-1", url: "https://example.com/guide", note: "Navigation" },
      { id: "ref-2", url: "  ", note: "" },
    ],
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("inquiry request mapping", () => {
  it("maps wizard values to the API fields and leaves out client-only state", () => {
    const body = toInquiryRequest(draft(), "");
    assert.ok(body);
    assert.equal(body.projectType, "website");
    assert.equal(body.budget, "range-100");
    assert.equal(body.timeline, "month");
    assert.equal(body.name, "Ada Lovelace");
    assert.equal(body.email, "Ada@Example.com");
    assert.equal(body.business, "Analytical Engines");
    assert.equal(body.details, "A site for the workshop.");
    assert.deepEqual(body.references, [{ url: "https://example.com/guide", note: "Navigation" }]);
    assert.equal(body.companyWebsite, "");
    assert.deepEqual(Object.keys(body), [
      "projectType",
      "budget",
      "timeline",
      "name",
      "email",
      "business",
      "details",
      "references",
      "companyWebsite",
    ]);
    assert.equal(JSON.stringify(body).includes("ref-1"), false);
    assert.equal(JSON.stringify(body).includes("privacy"), false);
  });

  it("omits blank optional fields and keeps a filled honeypot", () => {
    const body = toInquiryRequest(draft({
      business: "  ",
      details: "",
      references: [{ id: "ref-1", url: "", note: "" }],
    }), "https://spam.example");
    assert.ok(body);
    assert.equal(body.business, undefined);
    assert.equal(body.details, undefined);
    assert.equal(body.references, undefined);
    assert.equal(body.companyWebsite, "https://spam.example");
  });

  it("requires the privacy acknowledgment before a request is considered ready", () => {
    const missing = validateInquiryDraft(draft(), false);
    assert.equal(missing.status, "validation_error");
    if (missing.status === "validation_error") {
      assert.equal(missing.focusId, "inquiry-privacy");
    }
    assert.equal(validateInquiryDraft(draft(), true).status, "ready");
  });
});

describe("inquiry idempotency key lifecycle", () => {
  it("accepts a UUID idempotency key", () => {
    const key = createIdempotencyKey(() => KEY_A);
    assert.equal(key, KEY_A);
    assert.equal(IDEMPOTENCY_KEY_PATTERN.test(key), true);
  });

  it("reuses a key for the same payload and creates a new key after an edit", async () => {
    const keys: string[] = [];
    const client = createInquiryClient({
      randomUUID: () => (keys.length === 0 ? KEY_A : KEY_B),
      fetchImpl: async (_url, init) => {
        const headers = new Headers(init?.headers);
        keys.push(headers.get("idempotency-key") ?? "");
        return jsonResponse(503, { ok: false, code: "SUBMISSIONS_UNAVAILABLE", message: "Unavailable." });
      },
    });
    await client.submit(draft(), "");
    await client.submit(draft(), "");
    await client.submit(draft({ name: "Grace Hopper" }), "");
    assert.deepEqual(keys, [KEY_A, KEY_A, KEY_B]);
  });

  it("sends one request when submit is called again while the first request is in flight", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const client = createInquiryClient({
      randomUUID: () => KEY_A,
      fetchImpl: async () => {
        calls += 1;
        await gate;
        return jsonResponse(200, { ok: true });
      },
    });
    const first = client.submit(draft(), "");
    const second = await client.submit(draft(), "");
    assert.equal(second.status, "submitting");
    assert.equal(calls, 1);
    release();
    assert.equal((await first).status, "success");
    assert.equal(calls, 1);
  });

  it("keeps the original key after an unknown outcome", async () => {
    const keys: string[] = [];
    const client = createInquiryClient({
      randomUUID: () => (keys.length === 0 ? KEY_A : KEY_B),
      fetchImpl: async (_url, init) => {
        keys.push(new Headers(init?.headers).get("idempotency-key") ?? "");
        throw new TypeError("network down");
      },
    });
    assert.equal((await client.submit(draft(), "")).status, "unknown_outcome");
    assert.equal((await client.submit(draft({ details: "Changed after the timeout." }), "")).status, "unknown_outcome");
    assert.deepEqual(keys, [KEY_A, KEY_A]);
  });
});

describe("inquiry response handling", () => {
  it("accepts only a genuine accepted response", async () => {
    const accepted = await interpretInquiryResponse(jsonResponse(200, { ok: true, confirmation: "accepted" }), draft());
    assert.deepEqual(accepted, { status: "success", confirmation: "accepted" });
    assert.match(submissionCopy(accepted)?.confirmation ?? "", /queued for delivery/);

    const omitted = await interpretInquiryResponse(jsonResponse(200, { ok: true }), draft());
    assert.deepEqual(omitted, { status: "success", confirmation: "omitted" });
    assert.equal(submissionCopy(omitted)?.confirmation, undefined);

    const rejected = await interpretInquiryResponse(jsonResponse(200, { ok: true, confirmation: "rejected" }), draft());
    assert.deepEqual(rejected, { status: "success", confirmation: "rejected" });
    assert.equal(submissionCopy(rejected)?.confirmation, undefined);

    const fake = await interpretInquiryResponse(jsonResponse(200, { ok: true, confirmation: "sent" }), draft());
    assert.equal(fake.status, "error");
    const notOk = await interpretInquiryResponse(jsonResponse(200, { ok: false }), draft());
    assert.equal(notOk.status, "error");
  });

  it("maps validation errors onto wizard fields and ignores unexpected names", async () => {
    const result = await interpretInquiryResponse(jsonResponse(422, {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Please check the highlighted fields.",
      fieldErrors: {
        email: "Enter a valid email address.",
        references: "Enter a link for each reference, or remove the empty one.",
        password: "<script>alert(1)</script>",
      },
    }), draft());
    assert.equal(result.status, "validation_error");
    if (result.status !== "validation_error") {
      return;
    }
    assert.equal(result.step, 3);
    assert.equal(result.focusId, "inquiry-email");
    assert.equal(result.errors.email, "Enter a valid email address.");
    assert.equal(result.errors.references?.["ref-1"]?.url?.includes("link"), true);
    assert.equal(JSON.stringify(result.errors).includes("password"), false);
    assert.equal(JSON.stringify(result).includes("<script>"), false);
  });

  it("maps rate limits, unavailable delivery, persistence failure, and unknown outcomes", async () => {
    const limited = await interpretInquiryResponse(
      jsonResponse(429, { ok: false, code: "RATE_LIMITED", message: "Later." }, { "retry-after": "30" }),
      draft(),
    );
    assert.deepEqual(limited, { status: "rate_limited", retryAfterSeconds: 30 });
    const dated = await interpretInquiryResponse(
      jsonResponse(429, { ok: false, code: "RATE_LIMITED", message: "Later." }, { "retry-after": "Wed, 21 Oct 2015 07:28:00 GMT" }),
      draft(),
    );
    assert.deepEqual(dated, { status: "rate_limited" });

    for (const code of ["SUBMISSIONS_UNAVAILABLE", "RATE_LIMIT_UNAVAILABLE", "INQUIRY_STORAGE_UNAVAILABLE", "DELIVERY_UNAVAILABLE"]) {
      const result = await interpretInquiryResponse(jsonResponse(503, { ok: false, code, message: "Unavailable." }), draft());
      assert.equal(result.status, "unavailable");
    }
    const persistence = await interpretInquiryResponse(jsonResponse(503, { ok: false, code: "IDEMPOTENCY_PERSISTENCE_FAILED", message: "Saved?" }), draft());
    assert.equal(persistence.status, "persistence_uncertain");
    const unknown = await interpretInquiryResponse(jsonResponse(503, { ok: false, code: "DELIVERY_OUTCOME_UNKNOWN", message: "Unknown." }), draft());
    assert.equal(unknown.status, "unknown_outcome");
  });

  it("maps processing, conflict, and an invalid key without retrying inside one call", async () => {
    assert.equal((await interpretInquiryResponse(jsonResponse(409, { ok: false, code: "INQUIRY_PROCESSING", message: "Wait." }), draft())).status, "processing");
    assert.equal((await interpretInquiryResponse(jsonResponse(409, { ok: false, code: "IDEMPOTENCY_CONFLICT", message: "Conflict." }), draft())).status, "conflict");

    let calls = 0;
    const keys: string[] = [];
    const client = createInquiryClient({
      randomUUID: () => (calls === 0 ? KEY_A : KEY_B),
      fetchImpl: async (_url, init) => {
        calls += 1;
        keys.push(new Headers(init?.headers).get("idempotency-key") ?? "");
        return jsonResponse(400, { ok: false, code: "INVALID_IDEMPOTENCY_KEY", message: "Key." });
      },
    });
    assert.deepEqual(await client.submit(draft(), ""), { status: "error", reason: "invalid_key" });
    assert.equal(calls, 1);
    await client.submit(draft(), "");
    assert.deepEqual(keys, [KEY_A, KEY_B]);
  });

  it("does not follow a failed request with another fetch, and does not store the inquiry", async () => {
    const writes: string[] = [];
    const storage = {
      getItem: () => null,
      setItem: (key: string) => {
        writes.push(key);
      },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    };
    Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
    Object.defineProperty(globalThis, "sessionStorage", { value: storage, configurable: true });
    const logs: unknown[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args);
    };
    let calls = 0;
    try {
      const client = createInquiryClient({
        randomUUID: () => KEY_A,
        fetchImpl: async (url, init) => {
          calls += 1;
          assert.equal(url, "/api/inquiries");
          assert.equal(String(url).includes("brevo"), false);
          assert.equal(String(url).includes("upstash"), false);
          const headers = new Headers(init?.headers);
          assert.equal(headers.get("content-type"), "application/json");
          assert.equal(headers.has("origin"), false);
          assert.equal(headers.has("x-vercel-forwarded-for"), false);
          throw new TypeError("socket closed");
        },
      });
      await client.submit(draft(), "");
      assert.equal(calls, 1);
      assert.equal(writes.length, 0);
      assert.equal(JSON.stringify(logs).includes(KEY_A), false);
      assert.equal(JSON.stringify(logs).includes("Ada Lovelace"), false);
    } finally {
      console.log = original;
    }
  });
});

describe("public inquiry submission safety", () => {
  it("keeps an incomplete public runtime on unavailable adapters", () => {
    assert.equal(publicInquirySubmissionsAvailable, true);
    const runtime = createInquiryRuntime({
      NODE_ENV: "test",
      INQUIRY_SUBMISSIONS_ENABLED: "true",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token",
      BREVO_API_KEY: "x".repeat(24),
      BREVO_SENDER_EMAIL: "levelupdigital.support@gmail.com",
      BREVO_SENDER_NAME: "LevelUp Digital",
      INQUIRY_NOTIFICATION_EMAIL: "levelupdigital.support@gmail.com",
    });
    assert.equal(runtime.delivery instanceof UnavailableInquiryDelivery, true);
    assert.equal(runtime.idempotency, null);
    assert.equal(requestFingerprint({
      projectType: "website",
      budget: "range-100",
      timeline: "month",
      name: "Ada",
      email: "ada@example.com",
      companyWebsite: "",
    }).includes("localStorage"), false);
  });
});
