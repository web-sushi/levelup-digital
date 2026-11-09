import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { BREVO_TRANSACTIONAL_URL, readBrevoMailConfig, type BrevoFetch } from "@/lib/inquiries/brevo-delivery";
import {
  BREVO_ACCOUNT_URL,
  BREVO_SENDERS_URL,
  CONTROLLED_BREVO_CONFIRMATION,
  CONTROLLED_BREVO_SUBJECT,
  CONTROLLED_BREVO_TEXT,
  buildControlledBrevoMessage,
  controlledBrevoSendAuthorized,
  parseControlledBrevoArgs,
  runControlledBrevoVerification,
} from "@/lib/inquiries/brevo-verification";
import { createInquiryRuntime } from "@/lib/inquiries/config";
import { UnavailableInquiryDelivery } from "@/lib/inquiries/delivery";
import {
  CANONICAL_SITE_ORIGIN,
  EXPECTED_BREVO_NOTIFICATION_EMAIL,
  EXPECTED_BREVO_SENDER_EMAIL,
  EXPECTED_BREVO_SENDER_NAME,
  resolvePublicInquirySubmissionsAvailable,
} from "@/lib/inquiries/readiness";
const SYNTHETIC_KEY = "synthetic-brevo-key-value";

function env(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "production" as const,
    INQUIRY_SUBMISSIONS_ENABLED: "false",
    INQUIRY_ACTIVATION_GATE: "testing",
    INQUIRY_TRUSTED_ORIGINS: CANONICAL_SITE_ORIGIN,
    INQUIRY_RATE_LIMIT_KEY_SECRET: "rate-limit-secret-value",
    INQUIRY_IDEMPOTENCY_KEY_SECRET: "idempotency-secret-value",
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "example-token",
    BREVO_API_KEY: SYNTHETIC_KEY,
    BREVO_SENDER_EMAIL: EXPECTED_BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME: EXPECTED_BREVO_SENDER_NAME,
    INQUIRY_NOTIFICATION_EMAIL: EXPECTED_BREVO_NOTIFICATION_EMAIL,
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

function accessFetch(options: {
  postStatus?: number;
  postBody?: unknown;
  accountStatus?: number;
  senderActive?: boolean;
  senderName?: string;
} = {}) {
  const calls: Array<{ url: string; method: string; body: string; apiKey: string }> = [];
  const fetchImpl: BrevoFetch = async (url, init) => {
    const headers = new Headers(init.headers);
    calls.push({
      url,
      method: init.method ?? "GET",
      body: typeof init.body === "string" ? init.body : "",
      apiKey: headers.get("api-key") ?? "",
    });
    if ((init.method ?? "GET") === "POST") {
      return jsonResponse(options.postStatus ?? 201, options.postBody ?? { messageId: "<verification@example.com>" });
    }
    if (url === BREVO_ACCOUNT_URL) {
      return jsonResponse(options.accountStatus ?? 200, { relay: { enabled: true } });
    }
    if (url === BREVO_SENDERS_URL) {
      return jsonResponse(200, {
        senders: [{
          email: EXPECTED_BREVO_SENDER_EMAIL,
          name: options.senderName ?? EXPECTED_BREVO_SENDER_NAME,
          active: options.senderActive ?? true,
        }],
      });
    }
    throw new Error("unexpected Brevo URL");
  };
  return { calls, fetchImpl };
}

describe("controlled Brevo verification", () => {
  it("plans one business message in dry-run and does not send", async () => {
    const { calls, fetchImpl } = accessFetch();
    const report = await runControlledBrevoVerification(env(), {
      mode: "dry-run",
      confirm: CONTROLLED_BREVO_CONFIRMATION,
    }, fetchImpl);
    assert.equal(report.ok, true);
    assert.equal(report.mode, "dry-run");
    assert.equal(report.sendingRequests, 0);
    assert.equal(report.nonSendingRequests, 2);
    assert.equal(report.inboxDeliveryVerified, false);
    assert.equal(report.transactionalSendVerified, false);
    assert.equal(report.publicPageEnabled, false);
    assert.equal(report.publicRouteUsesLiveAdapters, false);
    assert.equal(report.access?.authenticated, true);
    assert.equal(report.access?.transactionalRelayEnabled, true);
    assert.equal(report.access?.senderListed, true);
    assert.equal(report.access?.senderActive, true);
    assert.equal(report.planned?.subject, CONTROLLED_BREVO_SUBJECT);
    assert.equal(report.planned?.text, CONTROLLED_BREVO_TEXT);
    assert.equal(report.planned?.recipient, EXPECTED_BREVO_NOTIFICATION_EMAIL);
    assert.deepEqual(calls.map((call) => [call.method, call.url]), [
      ["GET", BREVO_ACCOUNT_URL],
      ["GET", BREVO_SENDERS_URL],
    ]);
    assert.equal(calls.every((call) => call.apiKey === SYNTHETIC_KEY), true);
    assert.equal(calls.some((call) => call.url === BREVO_TRANSACTIONAL_URL), false);
  });

  it("refuses a missing API key before any request", async () => {
    let called = 0;
    const fetchImpl: BrevoFetch = async () => {
      called += 1;
      throw new Error("network must not be called");
    };
    const report = await runControlledBrevoVerification(env({ BREVO_API_KEY: undefined }), { mode: "dry-run" }, fetchImpl);
    assert.equal(report.mode, "refused");
    assert.equal(report.reason, "configuration");
    assert.equal(report.missing.includes("BREVO_API_KEY"), true);
    assert.equal(report.sendingRequests, 0);
    assert.equal(called, 0);
  });

  it("reports a stored sender name mismatch and does not send", async () => {
    const { calls, fetchImpl } = accessFetch({ senderName: "Different Sender Name" });
    const report = await runControlledBrevoVerification(env(), {
      mode: "send",
      confirm: CONTROLLED_BREVO_CONFIRMATION,
    }, fetchImpl);
    assert.equal(report.ok, false);
    assert.equal(report.reason, "sender_name_mismatch");
    assert.equal(report.access?.senderListed, true);
    assert.equal(report.access?.senderActive, true);
    assert.equal(report.access?.senderNameMatches, false);
    assert.equal(report.sendingRequests, 0);
    assert.equal(report.send?.outcome, "not_attempted");
    assert.equal(calls.some((call) => call.method === "POST"), false);
  });

  it("stops after an invalid API key response", async () => {
    const { calls, fetchImpl } = accessFetch({ accountStatus: 401 });
    const report = await runControlledBrevoVerification(env(), { mode: "dry-run" }, fetchImpl);
    assert.equal(report.ok, false);
    assert.equal(report.access?.authenticated, false);
    assert.equal(report.access?.category, "authentication");
    assert.equal(report.sendingRequests, 0);
    assert.deepEqual(calls.map((call) => call.url), [BREVO_ACCOUNT_URL]);
  });

  it("requires the exact confirmation and ignores it during dry-run", async () => {
    assert.equal(parseControlledBrevoArgs([]).mode, "dry-run");
    assert.equal(controlledBrevoSendAuthorized({ mode: "send" }), false);
    assert.equal(controlledBrevoSendAuthorized({ mode: "send", confirm: "yes" }), false);
    assert.equal(controlledBrevoSendAuthorized({ mode: "dry-run", confirm: CONTROLLED_BREVO_CONFIRMATION }), false);
    assert.equal(controlledBrevoSendAuthorized({ mode: "send", confirm: CONTROLLED_BREVO_CONFIRMATION }), true);
    assert.equal(parseControlledBrevoArgs(["--recipient=person@example.com"]).ok, false);

    let called = 0;
    const fetchImpl: BrevoFetch = async () => {
      called += 1;
      throw new Error("network must not be called");
    };
    const missing = await runControlledBrevoVerification(env(), { mode: "send" }, fetchImpl);
    const wrong = await runControlledBrevoVerification(env(), { mode: "send", confirm: "yes" }, fetchImpl);
    assert.equal(missing.reason, "authorization_required");
    assert.equal(wrong.reason, "authorization_required");
    assert.equal(missing.sendingRequests, 0);
    assert.equal(called, 0);
  });

  it("restricts the recipient to the LevelUp notification mailbox", () => {
    const config = readBrevoMailConfig(env());
    assert.equal(config.ok, true);
    if (!config.ok) {
      return;
    }
    const message = buildControlledBrevoMessage(config.config);
    assert.equal(message.ok, true);
    if (!message.ok) {
      return;
    }
    assert.deepEqual(message.payload.to, [{ email: EXPECTED_BREVO_NOTIFICATION_EMAIL }]);
    assert.equal(message.payload.replyTo.email, EXPECTED_BREVO_NOTIFICATION_EMAIL);
    assert.equal("cc" in message.payload, false);
    assert.equal(JSON.stringify(message.payload).includes("customer"), true);
    assert.equal(message.payload.subject.includes("Project Inquiry"), false);

    const other = buildControlledBrevoMessage({
      ...config.config,
      notificationEmail: "person@example.com",
    });
    assert.equal(other.ok, false);
  });

  it("does not send when the notification mailbox differs", async () => {
    let called = 0;
    const fetchImpl: BrevoFetch = async () => {
      called += 1;
      throw new Error("network must not be called");
    };
    const report = await runControlledBrevoVerification(env({
      INQUIRY_NOTIFICATION_EMAIL: "person@example.com",
    }), { mode: "send", confirm: CONTROLLED_BREVO_CONFIRMATION }, fetchImpl);
    assert.equal(report.reason, "recipient_restricted");
    assert.equal(report.sendingRequests, 0);
    assert.equal(called, 0);
  });

  it("keeps the testing gate off the public route", () => {
    const runtime = createInquiryRuntime(env());
    assert.equal(runtime.delivery instanceof UnavailableInquiryDelivery, true);
    assert.equal(runtime.idempotency ?? null, null);
    assert.equal(resolvePublicInquirySubmissionsAvailable(env()), false);
    assert.equal(runtime.submissionsEnabled, false);
  });

  it("sends one message only after authorization and does not retry provider failures", async () => {
    const cases: Array<{ postStatus: number; postBody?: unknown; outcome: "rejected" | "unknown"; category: string }> = [
      { postStatus: 400, outcome: "rejected", category: "invalid_sender" },
      { postStatus: 403, outcome: "rejected", category: "authentication" },
      { postStatus: 429, outcome: "rejected", category: "rate_limited" },
      { postStatus: 503, outcome: "rejected", category: "provider_error" },
      { postStatus: 201, postBody: {}, outcome: "unknown", category: "malformed_response" },
    ];
    for (const item of cases) {
      const { calls, fetchImpl } = accessFetch({ postStatus: item.postStatus, postBody: item.postBody });
      const report = await runControlledBrevoVerification(env(), {
        mode: "send",
        confirm: CONTROLLED_BREVO_CONFIRMATION,
      }, fetchImpl);
      assert.equal(report.send?.outcome, item.outcome);
      assert.equal(report.send?.category, item.category);
      assert.equal(report.sendingRequests, 1);
      assert.equal(calls.filter((call) => call.method === "POST").length, 1);
      const post = calls.find((call) => call.method === "POST");
      assert.equal(post?.url, BREVO_TRANSACTIONAL_URL);
      const body = JSON.parse(post?.body ?? "{}") as { to: Array<{ email: string }> };
      assert.deepEqual(body.to, [{ email: EXPECTED_BREVO_NOTIFICATION_EMAIL }]);
    }
  });

  it("treats a timeout or network error as unknown and does not retry", async () => {
    for (const failure of ["TimeoutError", "network"] as const) {
      const calls: string[] = [];
      const fetchImpl: BrevoFetch = async (url, init) => {
        calls.push(init.method ?? "GET");
        if ((init.method ?? "GET") !== "POST") {
          if (url === BREVO_ACCOUNT_URL) {
            return jsonResponse(200, { relay: { enabled: true } });
          }
          return jsonResponse(200, {
            senders: [{ email: EXPECTED_BREVO_SENDER_EMAIL, name: EXPECTED_BREVO_SENDER_NAME, active: true }],
          });
        }
        if (failure === "TimeoutError") {
          const error = new Error("timed out");
          error.name = "TimeoutError";
          throw error;
        }
        throw new Error("socket closed");
      };
      const report = await runControlledBrevoVerification(env(), {
        mode: "send",
        confirm: CONTROLLED_BREVO_CONFIRMATION,
      }, fetchImpl);
      assert.equal(report.send?.outcome, "unknown");
      assert.equal(report.send?.category, failure === "TimeoutError" ? "timeout" : "network");
      assert.equal(calls.filter((method) => method === "POST").length, 1);
    }
  });

  it("refuses to send while public submissions are enabled", async () => {
    let called = 0;
    const fetchImpl: BrevoFetch = async () => {
      called += 1;
      throw new Error("network must not be called");
    };
    const report = await runControlledBrevoVerification(env({
      INQUIRY_SUBMISSIONS_ENABLED: "true",
    }), { mode: "send", confirm: CONTROLLED_BREVO_CONFIRMATION }, fetchImpl);
    assert.equal(report.reason, "submissions_enabled");
    assert.equal(report.sendingRequests, 0);
    assert.equal(called, 0);
  });

  it("is not part of the ordinary unit-test command", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    assert.equal(pkg.scripts.test.includes("verify-brevo-delivery"), false);
    assert.equal(pkg.scripts["test:brevo"].includes("--send"), false);
    assert.equal(pkg.scripts["test:brevo"].includes("verify-brevo-delivery.ts"), true);
  });
});
