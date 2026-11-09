export const CONSENT_STORAGE_KEY = "levelup.privacy.consent";
export const CONSENT_VERSION = 1;
export const CONSENT_RELOAD_NOTICE_KEY = "levelup.privacy.reload-notice";

export type ConsentChoice = "accepted" | "rejected";

export type ConsentRecord = {
  version: typeof CONSENT_VERSION;
  analytics: ConsentChoice;
  updatedAt: string;
};

export type ConsentRead =
  | { status: "unknown"; reason: "missing" | "invalid" | "unavailable" }
  | { status: ConsentChoice; updatedAt: string };

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export function analyticsAllowed(read: ConsentRead) {
  return read.status === "accepted";
}

export function readConsent(store: KeyValueStore | null): ConsentRead {
  if (!store) {
    return { status: "unknown", reason: "unavailable" };
  }
  let raw: string | null;
  try {
    raw = store.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return { status: "unknown", reason: "unavailable" };
  }
  if (raw === null || raw.trim() === "") {
    return { status: "unknown", reason: "missing" };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { status: "unknown", reason: "invalid" };
    }
    const record = parsed as Record<string, unknown>;
    if (record.version !== CONSENT_VERSION) {
      return { status: "unknown", reason: "invalid" };
    }
    if (record.analytics !== "accepted" && record.analytics !== "rejected") {
      return { status: "unknown", reason: "invalid" };
    }
    if (typeof record.updatedAt !== "string" || record.updatedAt.trim() === "") {
      return { status: "unknown", reason: "invalid" };
    }
    return { status: record.analytics, updatedAt: record.updatedAt };
  } catch {
    return { status: "unknown", reason: "invalid" };
  }
}

export function writeConsent(
  store: KeyValueStore | null,
  choice: ConsentChoice,
  now = new Date(),
): { ok: true; record: ConsentRecord } | { ok: false; reason: "unavailable" } {
  if (!store) {
    return { ok: false, reason: "unavailable" };
  }
  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    analytics: choice,
    updatedAt: now.toISOString(),
  };
  try {
    store.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  return { ok: true, record };
}

export function browserLocalStore(): KeyValueStore | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    const probe = "__levelup_storage_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

export function readReloadNotice(store: KeyValueStore | null) {
  if (!store) {
    return "";
  }
  try {
    const value = store.getItem(CONSENT_RELOAD_NOTICE_KEY);
    store.removeItem?.(CONSENT_RELOAD_NOTICE_KEY);
    return value ?? "";
  } catch {
    return "";
  }
}

export function writeReloadNotice(store: KeyValueStore | null, message: string) {
  if (!store) {
    return;
  }
  try {
    store.setItem(CONSENT_RELOAD_NOTICE_KEY, message);
  } catch {
    // The page can still reload. The notice is optional.
  }
}
