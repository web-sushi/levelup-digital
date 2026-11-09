/**
 * Google Analytics 4 measurement ID from the legacy site.
 * The script is installed only after the visitor accepts analytics.
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

const DUPLICATE_PAGEVIEW_MS = 50;

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
  releaseAutomaticHistoryPageViews?: () => void;
};

type AnalyticsRuntime = {
  initialized: boolean;
  lastPath: string;
  lastAt: number;
  dataLayer: unknown[];
};

let runtime: AnalyticsRuntime | null = null;

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
    lastPath: "",
    lastAt: 0,
    dataLayer,
  };
  if (existing) {
    env.releaseAutomaticHistoryPageViews?.();
    return { createdScript: false };
  }
  const script = env.document.createElement("script");
  script.async = true;
  script.src = GA_SCRIPT_URL;
  env.document.head.appendChild(script);
  return { createdScript: true };
}

export function trackPageView(path: string, href: string, now = Date.now()) {
  if (!runtime?.initialized) {
    return false;
  }
  if (runtime.lastPath === path && now - runtime.lastAt < DUPLICATE_PAGEVIEW_MS) {
    return false;
  }
  runtime.lastPath = path;
  runtime.lastAt = now;
  pushGtagCommand(runtime.dataLayer, ["event", "page_view", {
    page_path: path,
    page_location: href,
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
          const script = node as unknown as HTMLScriptElement;
          script.addEventListener("load", () => {
            releaseAutomaticHistoryPageViews();
            window.setTimeout(releaseAutomaticHistoryPageViews, 0);
            window.setTimeout(releaseAutomaticHistoryPageViews, 1000);
          });
          document.head.appendChild(script);
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
    releaseAutomaticHistoryPageViews,
  };
}

function releaseAutomaticHistoryPageViews() {
  // gtag.js wraps history and emits its own page_view on client navigations.
  // This site already sends one page_view, so the native methods are restored.
  history.pushState = History.prototype.pushState;
  history.replaceState = History.prototype.replaceState;
}
