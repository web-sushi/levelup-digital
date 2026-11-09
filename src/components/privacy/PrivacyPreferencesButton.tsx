"use client";

import { openPrivacyPreferences } from "@/components/privacy/ConsentManager";

export function PrivacyPreferencesButton() {
  return (
    <button type="button" className="footer-link consent-footer-button focus-ring" onClick={openPrivacyPreferences}>
      Privacy Preferences
    </button>
  );
}
