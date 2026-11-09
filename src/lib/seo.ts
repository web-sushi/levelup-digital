import type { Metadata } from "next";
import { clientProjects } from "@/content/projects/client-work";
import { getPublishedConceptSlugs } from "@/content/projects/projects";

export const SITE_ORIGIN = "https://levelup-digital.dev";
export const SITE_NAME = "LevelUp Digital";
export const SITE_EMAIL = "levelupdigital.support@gmail.com";
export const DEFAULT_OG_PATH = "/og";
export const SITEMAP_PATH = "/sitemap.xml";

const STATIC_INDEXABLE_PATHS = [
  "/",
  "/services",
  "/work",
  "/about",
  "/contact",
  "/privacy",
] as const;

export type SitePath = "/" | `/${string}`;

export function canonicalUrl(path: SitePath) {
  if (path === "/") {
    return SITE_ORIGIN;
  }
  return `${SITE_ORIGIN}${path}`;
}

export function indexablePaths(): SitePath[] {
  const clientPaths = clientProjects.map((project) => `/work/${project.slug}` as const);
  const conceptPaths = getPublishedConceptSlugs().map((slug) => `/work/${slug}` as const);
  return [...STATIC_INDEXABLE_PATHS, ...clientPaths, ...conceptPaths];
}

export const robotsPolicy = {
  userAgent: "*",
  allow: "/",
  disallow: ["/api/", "/thank-you"],
} as const;

export function sitemapUrl() {
  return canonicalUrl(SITEMAP_PATH);
}

type SocialImage = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
};

export function createPageMetadata({
  title,
  description,
  path,
  index = true,
  type = "website",
  image,
}: {
  title: string;
  description: string;
  path: SitePath;
  index?: boolean;
  type?: "website" | "article";
  image?: SocialImage;
}): Metadata {
  const url = canonicalUrl(path);
  const socialTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const socialImage = image ?? {
    url: DEFAULT_OG_PATH,
    alt: "LevelUp Digital. Websites and custom digital products.",
    width: 1200,
    height: 630,
  };

  return {
    title: { absolute: socialTitle },
    description,
    alternates: {
      canonical: url,
    },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: SITE_NAME,
      type,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [socialImage.url],
    },
  };
}

export function siteJsonLd() {
  const organizationId = `${SITE_ORIGIN}/#organization`;
  const websiteId = `${SITE_ORIGIN}/#website`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: SITE_NAME,
        url: canonicalUrl("/"),
        email: SITE_EMAIL,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Tokyo",
          addressCountry: "JP",
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: SITE_NAME,
        url: canonicalUrl("/"),
        publisher: { "@id": organizationId },
      },
      {
        "@type": "ProfessionalService",
        "@id": `${SITE_ORIGIN}/#professional-service`,
        name: SITE_NAME,
        url: canonicalUrl("/"),
        email: SITE_EMAIL,
        provider: { "@id": organizationId },
        address: {
          "@type": "PostalAddress",
          addressLocality: "Tokyo",
          addressCountry: "JP",
        },
        serviceType: [
          "Business websites",
          "Custom web applications",
          "Booking and payment systems",
        ],
      },
    ],
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: SitePath }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}
