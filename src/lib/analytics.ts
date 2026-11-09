/**
 * Google Analytics 4 measurement ID from the legacy site.
 * The script is installed only after the visitor accepts analytics.
 *
 * This module loads gtag once. trackPageView sends one page_view per pathname.
 * GA4 enhanced measurement can send a second hit for the same history change.
 * This module does not patch the History API.
 */
export const GA_MEASUREMENT_ID = "G-8S5ZWSYC00";

export const GA_SCRIPT_URL = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;

export const GA_COOKIE_NAMES = [
  "_ga",
  "_gid",
  "_gat",
  "_ga_8S5ZWSYC00",
  "_gat_gtag_G-8S5ZWSYC00",
] as const;

type ScriptNode = {
  src: string;
  async: boolean;
};

export type AnalyticsEnvironment = {
  document: {
    createElement: (tag: string) => ScriptNode;
    querySelector: (selector: string) => unknown;
    head: { appendChild: (node: ScriptNode) => void };
  };
  cookie: {
    write: (value: string) => void;
  };
  location: {
    hostname: string;
  };
  dataLayer: unknown[];
  setDisabled: (disabled: boolean) => void;
};

export type LandingPage = {
  path: string;
  href: string;
};

type AnalyticsRuntime = {
  initialized: boolean;
  dataLayer: unknown[];
};

let runtime: AnalyticsRuntime | null = null;
let lastTrackedPath: string | null = null;

/**
 * gtag.js processes dataLayer entries that are Arguments objects.
 * A normal array is ignored, so the script can load without sending a hit.
 */
export function pushGtagCommand(dataLayer: unknown[], command: unknown[]) {
  // gtag.js ignores arrays. Only a real Arguments object is accepted.
  function gtag() {
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  }
  // eslint-disable-next-line prefer-spread
  gtag.apply(undefined, command as []);
}

export function resetAnalyticsState() {
  runtime = null;
  lastTrackedPath = null;
}

export function isGoogleAnalyticsInitialized() {
  return runtime?.initialized === true;
}

export function initializeGoogleAnalytics(env: AnalyticsEnvironment) {
  if (runtime?.initialized) {
    return { createdScript: false };
  }
  const existing = env.document.querySelector(`script[src="${GA_SCRIPT_URL}"]`);
  env.setDisabled(false);
  const dataLayer = env.dataLayer;
  pushGtagCommand(dataLayer, ["js", new Date()]);
  pushGtagCommand(dataLayer, ["config", GA_MEASUREMENT_ID, { send_page_view: false }]);
  runtime = {
    initialized: true,
    dataLayer,
  };
  if (existing) {
    return { createdScript: false };
  }
  const script = env.document.createElement("script");
  script.async = true;
  script.src = GA_SCRIPT_URL;
  env.document.head.appendChild(script);
  return { createdScript: true };
}

export function trackPageView(page: LandingPage) {
  if (!runtime?.initialized || lastTrackedPath === page.path) {
    return false;
  }
  lastTrackedPath = page.path;
  pushGtagCommand(runtime.dataLayer, ["event", "page_view", {
    page_path: page.path,
    page_location: page.href,
    send_to: GA_MEASUREMENT_ID,
  }]);
  return true;
}

function cookieDomains(hostname: string) {
  const domains = new Set<string>();
  if (hostname && hostname !== "localhost") {
    domains.add(hostname);
    domains.add(`.${hostname}`);
    const parts = hostname.split(".").filter(Boolean);
    if (parts.length > 2) {
      domains.add(`.${parts.slice(-2).join(".")}`);
    }
  }
  return [...domains];
}

export function clearGoogleAnalyticsCookies(env: AnalyticsEnvironment) {
  const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
  const domains = cookieDomains(env.location.hostname);
  for (const name of GA_COOKIE_NAMES) {
    env.cookie.write(`${name}=; expires=${expires}; path=/`);
    for (const domain of domains) {
      env.cookie.write(`${name}=; expires=${expires}; path=/; domain=${domain}`);
    }
  }
}

export function revokeGoogleAnalytics(env: AnalyticsEnvironment) {
  env.setDisabled(true);
  clearGoogleAnalyticsCookies(env);
  runtime = null;
  lastTrackedPath = null;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function browserAnalyticsEnvironment(): AnalyticsEnvironment {
  const dataLayer = window.dataLayer ?? [];
  window.dataLayer = dataLayer;
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  };
  const flags = window as unknown as Record<string, boolean>;
  return {
    document: {
      createElement: () => document.createElement("script") as unknown as ScriptNode,
      querySelector: (selector) => document.querySelector(selector),
      head: {
        appendChild: (node) => {
          document.head.appendChild(node as unknown as Node);
        },
      },
    },
    cookie: {
      write: (value) => {
        document.cookie = value;
      },
    },
    location: window.location,
    dataLayer,
    setDisabled: (disabled) => {
      flags[`ga-disable-${GA_MEASUREMENT_ID}`] = disabled;
    },
  };
}
