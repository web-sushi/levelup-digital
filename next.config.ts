import type { NextConfig } from "next";
import { previewRobotsTagHeaders } from "./src/lib/preview-indexing";

const legacyHtmlRedirects = [
  { source: "/index.html", destination: "/", permanent: true },
  { source: "/services.html", destination: "/services", permanent: true },
  { source: "/work.html", destination: "/work", permanent: true },
  { source: "/about.html", destination: "/about", permanent: true },
  { source: "/contact.html", destination: "/contact", permanent: true },
  { source: "/privacy.html", destination: "/privacy", permanent: true },
  { source: "/thank-you.html", destination: "/thank-you", permanent: true },
  { source: "/project-tour-basic.html", destination: "/work/tour-basic", permanent: true },
  { source: "/project-tour-standard.html", destination: "/work/tour-standard", permanent: true },
  { source: "/project-tour-pro.html", destination: "/work/tour-pro", permanent: true },
  { source: "/project-cafe-basic.html", destination: "/work/cafe-basic", permanent: true },
  { source: "/project-cafe-standard.html", destination: "/work/cafe-standard", permanent: true },
  { source: "/project-photo-basic.html", destination: "/work/photo-basic", permanent: true },
  { source: "/project-photo-standard.html", destination: "/work/photo-standard", permanent: true },
  {
    source: "/project-home-service-basic.html",
    destination: "/work/home-service-basic",
    permanent: true,
  },
  {
    source: "/project-home-service-standard.html",
    destination: "/work/home-service-standard",
    permanent: true,
  },
  { source: "/project-clinic-basic.html", destination: "/work/clinic-basic", permanent: true },
  {
    source: "/project-clinic-standard.html",
    destination: "/work/clinic-standard",
    permanent: true,
  },
] as const;

const nextConfig: NextConfig = {
  async redirects() {
    return [...legacyHtmlRedirects];
  },
  async headers() {
    return previewRobotsTagHeaders(process.env.VERCEL_ENV);
  },
};

export default nextConfig;
