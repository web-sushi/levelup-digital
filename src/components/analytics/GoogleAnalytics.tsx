"use client";

import { useEffect } from "react";
import { browserAnalyticsEnvironment, initializeGoogleAnalytics, trackPageView } from "@/lib/analytics";

export function GoogleAnalytics({ pathname }: { pathname: string }) {
  useEffect(() => {
    initializeGoogleAnalytics(browserAnalyticsEnvironment());
    trackPageView(pathname, window.location.href);
  }, [pathname]);

  return null;
}
