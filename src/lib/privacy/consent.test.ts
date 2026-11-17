import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicInquirySubmissionsAvailable } from "@/lib/inquiries/public-availability";
import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  analyticsAllowed,
  readConsent,
  writeConsent,
  type KeyValueStore,
} from "@/lib/privacy/consent";

class MemoryStore implements KeyValueStore {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class BrokenStore implements KeyValueStore {
  getItem(): string | null {
    throw new Error("storage blocked");
  }

  setItem(): void {
    throw new Error("storage blocked");
  }
}

const NOW = new Date("2026-11-09T03:00:00.000Z");

describe("analytics consent storage", () => {
  it("treats a missing choice as denied", () => {
    const read = readConsent(new MemoryStore());
    assert.equal(read.status, "unknown");
    assert.equal(analyticsAllowed(read), false);
  });

  it("saves and restores an acceptance", () => {
    const store = new MemoryStore();
    const saved = writeConsent(store, "accepted", NOW);
    assert.equal(saved.ok, true);
    const read = readConsent(store);
    assert.equal(read.status, "accepted");
    assert.equal(analyticsAllowed(read), true);
    if (read.status === "accepted") {
      assert.equal(read.updatedAt, NOW.toISOString());
    }
  });

  it("saves and restores a rejection", () => {
    const store = new MemoryStore();
    writeConsent(store, "rejected", NOW);
    const read = readConsent(store);
    assert.equal(read.status, "rejected");
    assert.equal(analyticsAllowed(read), false);
  });

  it("keeps the same choice after another read", () => {
    const store = new MemoryStore();
    writeConsent(store, "accepted", NOW);
    assert.deepEqual(readConsent(store), readConsent(store));
  });

  it("ignores invalid stored preferences", () => {
    const store = new MemoryStore();
    for (const value of ["{", "[]", "null", JSON.stringify({ version: 2, analytics: "accepted", updatedAt: NOW.toISOString() }), JSON.stringify({ version: 1, analytics: "granted", updatedAt: NOW.toISOString() }), JSON.stringify({ version: 1, analytics: "accepted", updatedAt: "" })]) {
      store.setItem(CONSENT_STORAGE_KEY, value);
      const read = readConsent(store);
      assert.equal(read.status, "unknown");
      assert.equal(analyticsAllowed(read), false);
    }
  });

  it("fails closed when storage is unavailable", () => {
    const missing = readConsent(null);
    const blocked = readConsent(new BrokenStore());
    assert.equal(missing.status, "unknown");
    assert.equal(blocked.status, "unknown");
    if (missing.status === "unknown") {
      assert.equal(missing.reason, "unavailable");
    }
    if (blocked.status === "unknown") {
      assert.equal(blocked.reason, "unavailable");
    }
    assert.equal(writeConsent(null, "accepted").ok, false);
    assert.equal(writeConsent(new BrokenStore(), "accepted").ok, false);
    assert.equal(analyticsAllowed({ status: "unknown", reason: "unavailable" }), false);
  });

  it("stores only the consent record", () => {
    const store = new MemoryStore();
    const saved = writeConsent(store, "rejected", NOW);
    assert.equal(saved.ok, true);
    if (!saved.ok) {
      return;
    }
    assert.deepEqual(Object.keys(saved.record).sort(), ["analytics", "updatedAt", "version"]);
    assert.equal(saved.record.version, CONSENT_VERSION);
    const raw = store.getItem(CONSENT_STORAGE_KEY) ?? "";
    assert.equal(raw.includes("name"), false);
    assert.equal(raw.includes("email"), false);
    assert.equal(raw.includes("inquiry"), false);
  });

  it("records the activated inquiry source gate", () => {
    assert.equal(publicInquirySubmissionsAvailable, true);
  });
});
