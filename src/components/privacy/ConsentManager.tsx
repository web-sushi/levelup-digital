"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore, useState } from "react";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { ConsentBanner } from "@/components/privacy/ConsentBanner";
import { ConsentPreferences } from "@/components/privacy/ConsentPreferences";
import { browserAnalyticsEnvironment, revokeGoogleAnalytics } from "@/lib/analytics";
import {
  browserLocalStore,
  readConsent,
  readReloadNotice,
  writeConsent,
  writeReloadNotice,
  type ConsentChoice,
} from "@/lib/privacy/consent";

const OPEN_PREFERENCES_EVENT = "levelup:open-privacy-preferences";
const CONSENT_CHANGED_EVENT = "levelup:consent-changed";
const WITHDRAW_NOTICE = "Analytics is off. Tracking from this browser has stopped.";

type ConsentView = ConsentChoice | "unknown" | "pending";

export function openPrivacyPreferences() {
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}

function subscribeToConsent(onStoreChange: () => void) {
  window.addEventListener(CONSENT_CHANGED_EVENT, onStoreChange);
  return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onStoreChange);
}

function consentSnapshot(): ConsentView {
  const stored = readConsent(browserLocalStore());
  return stored.status === "unknown" ? "unknown" : stored.status;
}

function consentServerSnapshot(): ConsentView {
  return "pending";
}

let reloadNoticeCache: string | null = null;

function reloadNoticeSnapshot() {
  if (reloadNoticeCache === null) {
    reloadNoticeCache = readReloadNotice(sessionStore());
  }
  return reloadNoticeCache;
}

function emptyServerSnapshot() {
  return "";
}

function emptySubscribe() {
  return () => undefined;
}

export function ConsentManager() {
  const pathname = usePathname();
  const choice = useSyncExternalStore(subscribeToConsent, consentSnapshot, consentServerSnapshot);
  const reloadNotice = useSyncExternalStore(emptySubscribe, reloadNoticeSnapshot, emptyServerSnapshot);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const showBanner = choice === "unknown" && !dialogOpen;

  useEffect(() => {
    document.documentElement.classList.toggle("has-consent-banner", showBanner);
    return () => {
      document.documentElement.classList.remove("has-consent-banner");
    };
  }, [showBanner]);

  useEffect(() => {
    const open = () => setDialogOpen(true);
    window.addEventListener(OPEN_PREFERENCES_EVENT, open);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, open);
  }, []);

  function choose(next: ConsentChoice) {
    const saved = writeConsent(browserLocalStore(), next);
    if (!saved.ok) {
      const failure = "This browser did not save that choice. Analytics stays off.";
      setMessage(failure);
      setAnnouncement(failure);
      return;
    }
    if (next === "rejected" && choice === "accepted") {
      revokeGoogleAnalytics(browserAnalyticsEnvironment());
      writeReloadNotice(sessionStore(), WITHDRAW_NOTICE);
      window.location.reload();
      return;
    }
    window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
    setMessage("");
    setDialogOpen(false);
    setAnnouncement(next === "accepted" ? "Analytics accepted." : "Analytics rejected.");
  }

  return (
    <>
      <p className="sr-only" aria-live="polite">{announcement || reloadNotice}</p>
      {choice === "accepted" ? <GoogleAnalytics pathname={pathname} /> : null}
      {showBanner ? (
        <ConsentBanner
          message={message}
          onAccept={() => choose("accepted")}
          onReject={() => choose("rejected")}
        />
      ) : null}
      <ConsentPreferences
        open={dialogOpen}
        choice={choice === "pending" ? "unknown" : choice}
        message={message}
        onAccept={() => choose("accepted")}
        onReject={() => choose("rejected")}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}

function sessionStore() {
  try {
    if (typeof sessionStorage === "undefined") {
      return null;
    }
    return {
      getItem: (key: string) => sessionStorage.getItem(key),
      setItem: (key: string, value: string) => sessionStorage.setItem(key, value),
      removeItem: (key: string) => sessionStorage.removeItem(key),
    };
  } catch {
    return null;
  }
}
