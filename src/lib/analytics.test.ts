import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  GA_COOKIE_NAMES,
  GA_SCRIPT_URL,
  initializeGoogleAnalytics,
  isGoogleAnalyticsInitialized,
  resetAnalyticsState,
  revokeGoogleAnalytics,
  trackPageView,
  type AnalyticsEnvironment,
} from "@/lib/analytics";

function isArgumentsCommand(entry: unknown) {
  return !!entry && typeof entry === "object" && "callee" in entry && typeof (entry as { length?: unknown }).length === "number";
}

function isCommand(entry: unknown, name: string, second?: string) {
  if (!isArgumentsCommand(entry)) {
    return false;
  }
  const command = entry as { 0?: unknown; 1?: unknown };
  return command[0] === name && (second === undefined || command[1] === second);
}

function createEnvironment(existing: unknown = null) {
  const scripts: Array<{ src: string; async: boolean }> = [];
  const cookies: string[] = [];
  const dataLayer: unknown[] = [];
  let disabled = false;
  const env: AnalyticsEnvironment = {
    document: {
      createElement: () => ({ src: "", async: false }),
      querySelector: (selector) => (selector.includes(GA_SCRIPT_URL) ? existing : null),
      head: {
        appendChild: (node) => {
          scripts.push(node);
        },
      },
    },
    cookie: {
      write: (value) => {
        cookies.push(value);
      },
    },
    location: { hostname: "levelup-digital.dev" },
    dataLayer,
    setDisabled: (value) => {
      disabled = value;
    },
  };
  return {
    env,
    scripts,
    cookies,
    dataLayer,
    isDisabled: () => disabled,
  };
}

describe("Google Analytics loading", () => {
  it("does not track before initialization", () => {
    resetAnalyticsState();
    assert.equal(trackPageView("/contact", "https://levelup-digital.dev/contact"), false);
    assert.equal(isGoogleAnalyticsInitialized(), false);
  });

  it("loads the script once after acceptance and skips a duplicate pageview", () => {
    resetAnalyticsState();
    const first = createEnvironment();
    assert.equal(initializeGoogleAnalytics(first.env).createdScript, true);
    assert.equal(initializeGoogleAnalytics(first.env).createdScript, false);
    assert.equal(first.scripts.length, 1);
    assert.equal(first.scripts[0]?.src, GA_SCRIPT_URL);
    assert.equal(first.scripts[0]?.async, true);
    assert.equal(trackPageView("/", "https://levelup-digital.dev/", 1_000), true);
    assert.equal(trackPageView("/", "https://levelup-digital.dev/", 1_010), false);
    assert.equal(trackPageView("/services", "https://levelup-digital.dev/services", 1_020), true);
    assert.equal(trackPageView("/", "https://levelup-digital.dev/", 1_100), true);
    const pageViews = first.dataLayer.filter((entry) => isCommand(entry, "event", "page_view"));
    assert.equal(pageViews.length, 3);
    assert.equal(first.dataLayer.some((entry) => isCommand(entry, "config")), true);
    assert.equal(first.dataLayer.every((entry) => isArgumentsCommand(entry)), true);
  });

  it("clears first-party analytics cookies on withdrawal", () => {
    resetAnalyticsState();
    const env = createEnvironment();
    initializeGoogleAnalytics(env.env);
    revokeGoogleAnalytics(env.env);
    assert.equal(isGoogleAnalyticsInitialized(), false);
    assert.equal(env.isDisabled(), true);
    assert.equal(trackPageView("/work", "https://levelup-digital.dev/work"), false);
    for (const name of GA_COOKIE_NAMES) {
      assert.equal(env.cookies.some((cookie) => cookie.startsWith(`${name}=;`)), true);
    }
  });

  it("does not add a second script when one is already present", () => {
    resetAnalyticsState();
    const env = createEnvironment({ src: GA_SCRIPT_URL });
    assert.equal(initializeGoogleAnalytics(env.env).createdScript, false);
    assert.equal(env.scripts.length, 0);
  });

  it("is not mounted from the root layout", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    assert.equal(layout.includes("googletagmanager"), false);
    assert.equal(layout.includes("<GoogleAnalytics"), false);
    const manager = readFileSync("src/components/privacy/ConsentManager.tsx", "utf8");
    assert.equal(manager.includes("choice === \"accepted\" ? <GoogleAnalytics"), true);
  });
});
