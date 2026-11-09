"use client";

import { useEffect, useRef } from "react";
import { browserAnalyticsEnvironment, initializeGoogleAnalytics, trackPageView } from "@/lib/analytics";

export function GoogleAnalytics({ pathname }: { pathname: string }) {
  const trackedPath = useRef<string | null>(null);

  useEffect(() => {
    initializeGoogleAnalytics(browserAnalyticsEnvironment());
    if (trackedPath.current === pathname) {
      return;
    }
    trackedPath.current = pathname;
    trackPageView({
      path: pathname,
      href: window.location.href,
    });
  }, [pathname]);

  return null;
}
