import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  parseControlledBrevoArgs,
  resolveBrevoVerificationRequest,
  runControlledBrevoVerification,
} from "@/lib/inquiries/brevo-verification";

function loadEnvFile() {
  const text = readFileSync(".env.local", "utf8");
  const env: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator < 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function redact(serialized: string, secrets: Array<string | undefined>) {
  let output = serialized;
  for (const secret of secrets) {
    if (secret && secret.length >= 8) {
      output = output.split(secret).join("[redacted]");
    }
  }
  return output;
}

function diagnosticKey(loaded: Record<string, string>) {
  return process.env.BREVO_DIAGNOSTIC_API_KEY?.trim() || loaded.BREVO_DIAGNOSTIC_API_KEY?.trim() || "";
}

async function main(argv: readonly string[]) {
  const parsed = parseControlledBrevoArgs(argv);
  if (!parsed.ok) {
    console.log(JSON.stringify({
      ok: false,
      mode: "refused",
      reason: parsed.reason,
      sendingRequests: 0,
      nonSendingRequests: 0,
      authenticatedChecks: "skipped",
    }, null, 2));
    process.exitCode = 1;
    return;
  }
  let loaded: Record<string, string>;
  try {
    loaded = loadEnvFile();
  } catch {
    console.log(JSON.stringify({
      ok: false,
      mode: "refused",
      reason: "configuration",
      sendingRequests: 0,
      nonSendingRequests: 0,
      authenticatedChecks: "skipped",
    }, null, 2));
    process.exitCode = 1;
    return;
  }
  const diagnostic = diagnosticKey(loaded);
  const plan = resolveBrevoVerificationRequest({
    requested: parsed.requested,
    diagnosticKey: diagnostic,
  });
  if (!plan.ok) {
    console.log(JSON.stringify({
      ok: false,
      mode: "refused",
      reason: plan.reason,
      sendingRequests: 0,
      nonSendingRequests: 0,
      authenticatedChecks: "skipped",
    }, null, 2));
    process.exitCode = 1;
    return;
  }
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    INQUIRY_SUBMISSIONS_ENABLED: loaded.INQUIRY_SUBMISSIONS_ENABLED,
    INQUIRY_ACTIVATION_GATE: loaded.INQUIRY_ACTIVATION_GATE,
    INQUIRY_TRUSTED_ORIGINS: loaded.INQUIRY_TRUSTED_ORIGINS,
    INQUIRY_RATE_LIMIT_KEY_SECRET: loaded.INQUIRY_RATE_LIMIT_KEY_SECRET,
    INQUIRY_IDEMPOTENCY_KEY_SECRET: loaded.INQUIRY_IDEMPOTENCY_KEY_SECRET,
    UPSTASH_REDIS_REST_URL: loaded.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: loaded.UPSTASH_REDIS_REST_TOKEN,
    BREVO_SENDER_EMAIL: loaded.BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME: loaded.BREVO_SENDER_NAME,
    INQUIRY_NOTIFICATION_EMAIL: loaded.INQUIRY_NOTIFICATION_EMAIL,
  };
  if (plan.mode !== "local") {
    env.BREVO_API_KEY = diagnostic;
  }
  try {
    const report = await runControlledBrevoVerification(env, {
      mode: plan.mode,
      confirm: parsed.confirm,
      authenticatedCheckSkip: plan.ok && plan.mode === "local" ? plan.authenticatedCheckSkip : undefined,
    }, fetch);
    const serialized = redact(JSON.stringify(report, null, 2), [
      diagnostic,
      loaded.BREVO_DIAGNOSTIC_API_KEY,
      loaded.UPSTASH_REDIS_REST_TOKEN,
      loaded.INQUIRY_RATE_LIMIT_KEY_SECRET,
      loaded.INQUIRY_IDEMPOTENCY_KEY_SECRET,
      loaded.UPSTASH_REDIS_REST_URL,
    ]);
    console.log(serialized);
    if (plan.mode !== "send" && report.sendingRequests !== 0) {
      process.exitCode = 1;
      return;
    }
    process.exitCode = report.ok ? 0 : 1;
  } catch {
    console.error("Brevo verification failed before a report was produced.");
    process.exitCode = 1;
  }
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) {
  await main(process.argv.slice(2));
}
