import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InquiryDraft } from "@/components/contact/inquiry-model";
import {
  allowsManualSubmit,
  createIdempotencyKey,
  createInquiryClient,
  INQUIRY_SUBMISSION_DEADLINE_MS,
  interpretInquiryResponse,
  presentedSubmissionState,
  requestFingerprint,
  submissionCopy,
  toInquiryRequest,
  validateInquiryDraft,
  type InquirySubmissionState,
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

function verificationDraft(): InquiryDraft {
  return {
    projectType: "website",
    budget: "range-100",
    timeline: "exploring",
    name: "LevelUp Digital QA Test",
    email: "levelupdigital.support@gmail.com",
    business: "LevelUp Digital",
    details: "Production inquiry verification test. This is synthetic data and does not require a quotation or follow-up.",
    references: [{ id: "ref-1", url: "", note: "" }],
  };
}

function claimsDelivery(state: InquirySubmissionState) {
  const copy = submissionCopy(state);
  const text = `${copy?.title ?? ""} ${copy?.message ?? ""} ${copy?.confirmation ?? ""}`;
  return text.includes("accepted for review") || text.includes("queued for delivery");
}

describe("submission stall recovery", () => {
  it("keeps the client deadline long enough for both provider sends and shorter than the stuck review", () => {
    assert.equal(INQUIRY_SUBMISSION_DEADLINE_MS > 20_000, true);
    assert.equal(INQUIRY_SUBMISSION_DEADLINE_MS < 120_000, true);
  });

  it("sends one request for one attempt and does not follow a hung request with another", async () => {
    let calls = 0;
    const client = createInquiryClient({
      deadlineMs: 40,
      randomUUID: () => KEY_A,
      fetchImpl: () => {
        calls += 1;
        return new Promise(() => undefined);
      },
    });
    const started = Date.now();
    const result = await client.submit(verificationDraft(), "");
    assert.equal(result.status, "unknown_outcome");
    assert.equal(calls, 1);
    assert.equal(Date.now() - started < 1_000, true);
    assert.equal(presentedSubmissionState(result) === "pending", false);
    assert.equal(claimsDelivery(result), false);
    assert.equal(allowsManualSubmit(result), false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(calls, 1);
  });

  it("shows success only after the mocked server accepts the inquiry", async () => {
    let calls = 0;
    const client = createInquiryClient({
      deadlineMs: 500,
      randomUUID: () => KEY_A,
      fetchImpl: async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 15));
        return jsonResponse(200, { ok: true, confirmation: "accepted" });
      },
    });
    const result = await client.submit(verificationDraft(), "");
    assert.deepEqual(result, { status: "success", confirmation: "accepted" });
    assert.equal(presentedSubmissionState(result) === "pending", false);
    assert.match(submissionCopy(result)?.confirmation ?? "", /queued for delivery/);
    assert.equal(calls, 1);
  });

  it("leaves the pending state on a definite server rejection", async () => {
    const client = createInquiryClient({
      randomUUID: () => KEY_A,
      fetchImpl: async () => jsonResponse(422, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please check the highlighted fields.",
        fieldErrors: { email: "Enter a valid email address." },
      }),
    });
    const result = await client.submit(verificationDraft(), "");
    assert.equal(result.status, "validation_error");
    assert.equal(presentedSubmissionState(result) === "pending", false);
    assert.equal(claimsDelivery(result), false);
    if (result.status === "validation_error") {
      assert.equal(result.errors.email, "Enter a valid email address.");
    }
  });

  it("treats a rejected fetch as an unknown outcome and does not claim delivery", async () => {
    let calls = 0;
    const client = createInquiryClient({
      randomUUID: () => KEY_A,
      fetchImpl: async () => {
        calls += 1;
        throw new TypeError("network down");
      },
    });
    const result = await client.submit(verificationDraft(), "");
    assert.equal(result.status, "unknown_outcome");
    assert.equal(calls, 1);
    assert.equal(claimsDelivery(result), false);
    assert.match(submissionCopy(result)?.message ?? "", /may have reached us/);
  });

  it("keeps the same idempotency key when the same payload is submitted again after a timeout", async () => {
    const keys: string[] = [];
    const client = createInquiryClient({
      deadlineMs: 30,
      randomUUID: () => (keys.length === 0 ? KEY_A : KEY_B),
      fetchImpl: (_url, init) => {
        const key = new Headers(init?.headers).get("idempotency-key") ?? "";
        keys.push(key);
        if (keys.length === 1) {
          return new Promise(() => undefined);
        }
        return Promise.resolve(jsonResponse(503, { ok: false, code: "DELIVERY_OUTCOME_UNKNOWN", message: "Unknown." }));
      },
    });
    assert.equal((await client.submit(verificationDraft(), "")).status, "unknown_outcome");
    assert.deepEqual(keys, [KEY_A]);
    assert.equal((await client.submit(verificationDraft(), "")).status, "unknown_outcome");
    assert.deepEqual(keys, [KEY_A, KEY_A]);
  });

  it("does not call fetch for a request that is already aborted, and presents that as unconfirmed", async () => {
    let calls = 0;
    const controller = new AbortController();
    controller.abort();
    const client = createInquiryClient({
      randomUUID: () => KEY_A,
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse(200, { ok: true, confirmation: "accepted" });
      },
    });
    const result = await client.submit(verificationDraft(), "", controller.signal);
    assert.equal(result.status, "aborted");
    assert.equal(calls, 0);
    const presented = presentedSubmissionState(result);
    assert.equal(presented === "pending", false);
    if (presented !== "pending") {
      assert.equal(presented.status, "unknown_outcome");
      assert.equal(claimsDelivery(presented), false);
    }
  });

  it("keeps the entered draft when a request does not finish", async () => {
    const source = verificationDraft();
    const before = JSON.stringify(source);
    const client = createInquiryClient({
      deadlineMs: 20,
      randomUUID: () => KEY_A,
      fetchImpl: () => new Promise(() => undefined),
    });
    await client.submit(source, "");
    assert.equal(JSON.stringify(source), before);
  });

  it("requires the privacy acknowledgement and does not turn an in-flight duplicate into a second post", async () => {
    const missing = validateInquiryDraft(verificationDraft(), false);
    assert.equal(missing.status, "validation_error");
    let calls = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const client = createInquiryClient({
      randomUUID: () => KEY_A,
      fetchImpl: async () => {
        calls += 1;
        await gate;
        return jsonResponse(200, { ok: true, confirmation: "rejected" });
      },
    });
    const first = client.submit(verificationDraft(), "");
    const duplicate = await client.submit(verificationDraft(), "");
    assert.equal(duplicate.status, "submitting");
    assert.equal(presentedSubmissionState(duplicate), "pending");
    assert.equal(calls, 1);
    release();
    const result = await first;
    assert.deepEqual(result, { status: "success", confirmation: "rejected" });
    assert.equal(submissionCopy(result)?.confirmation, undefined);
    assert.equal(calls, 1);
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
