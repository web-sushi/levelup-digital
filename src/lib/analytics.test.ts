import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { publicInquirySubmissionsAvailable } from "@/lib/inquiries/public-availability";
import {
  GA_COOKIE_NAMES,
  GA_MEASUREMENT_ID,
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

function commandAt(entry: unknown, index: number) {
  return (entry as Record<number, unknown>)[index];
}

function isCommand(entry: unknown, name: string, second?: string) {
  if (!isArgumentsCommand(entry)) {
    return false;
  }
  return commandAt(entry, 0) === name && (second === undefined || commandAt(entry, 1) === second);
}

function pagePath(entry: unknown) {
  const params = commandAt(entry, 2);
  if (!params || typeof params !== "object") {
    return undefined;
  }
  return (params as { page_path?: unknown }).page_path;
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

const HOME = { path: "/", href: "https://levelup-digital.dev/" };

describe("Google Analytics loading", () => {
  it("does not create a script or a pageview before initialization", () => {
    resetAnalyticsState();
    assert.equal(isGoogleAnalyticsInitialized(), false);
  });

  it("sends one pageview per tracked path and ignores a second initialization", () => {
    resetAnalyticsState();
    const first = createEnvironment();
    assert.deepEqual(initializeGoogleAnalytics(first.env), { createdScript: true });
    assert.equal(trackPageView(HOME), true);
    assert.equal(trackPageView(HOME), false);
    assert.equal(trackPageView({ path: "/about", href: "https://levelup-digital.dev/about" }), true);
    assert.equal(trackPageView(HOME), true);
    assert.deepEqual(initializeGoogleAnalytics(first.env), { createdScript: false });
    assert.equal(first.scripts.length, 1);
    assert.equal(first.scripts[0]?.src, GA_SCRIPT_URL);
    assert.equal(first.scripts[0]?.async, true);
    const pageViews = first.dataLayer.filter((entry) => isCommand(entry, "event", "page_view"));
    assert.deepEqual(pageViews.map(pagePath), ["/", "/about", "/"]);
    const config = first.dataLayer.find((entry) => isCommand(entry, "config", GA_MEASUREMENT_ID));
    assert.equal((commandAt(config, 2) as { send_page_view?: boolean }).send_page_view, false);
    assert.equal(first.dataLayer.every((entry) => isArgumentsCommand(entry)), true);
    revokeGoogleAnalytics(first.env);
    assert.equal(trackPageView(HOME), false);
  });

  it("clears first-party analytics cookies on withdrawal", () => {
    resetAnalyticsState();
    const env = createEnvironment();
    initializeGoogleAnalytics(env.env);
    revokeGoogleAnalytics(env.env);
    assert.equal(isGoogleAnalyticsInitialized(), false);
    assert.equal(env.isDisabled(), true);
    for (const name of GA_COOKIE_NAMES) {
      assert.equal(env.cookies.some((cookie) => cookie.startsWith(`${name}=;`)), true);
    }
  });

  it("does not add a second script when one is already present", () => {
    resetAnalyticsState();
    const env = createEnvironment({ src: GA_SCRIPT_URL });
    assert.equal(initializeGoogleAnalytics(env.env).createdScript, false);
    assert.equal(env.scripts.length, 0);
    assert.equal(trackPageView(HOME), true);
    assert.equal(env.dataLayer.filter((entry) => isCommand(entry, "event", "page_view")).length, 1);
  });

  it("tracks each pathname from the component without patching history", () => {
    const analytics = readFileSync("src/lib/analytics.ts", "utf8");
    const component = readFileSync("src/components/analytics/GoogleAnalytics.tsx", "utf8");
    assert.equal(analytics.includes("history.pushState"), false);
    assert.equal(analytics.includes("history.replaceState"), false);
    assert.equal(analytics.includes("DUPLICATE_PAGEVIEW_MS"), false);
    assert.equal(analytics.includes("export function trackPageView"), true);
    assert.equal(component.includes("trackPageView"), true);
    assert.equal(component.includes("trackedPath.current === pathname"), true);
    assert.equal(component.includes("[pathname]"), true);
  });

  it("is not mounted from the root layout and stays off the public inquiry route", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    assert.equal(layout.includes("googletagmanager"), false);
    assert.equal(layout.includes("<GoogleAnalytics"), false);
    const manager = readFileSync("src/components/privacy/ConsentManager.tsx", "utf8");
    assert.equal(manager.includes("choice === \"accepted\" ? <GoogleAnalytics"), true);
    const preferences = readFileSync("src/components/privacy/ConsentPreferences.tsx", "utf8");
    assert.equal(preferences.includes("showModal"), true);
    assert.equal(preferences.includes("preventDefault"), false);
    assert.equal(publicInquirySubmissionsAvailable, true);
  });
});
