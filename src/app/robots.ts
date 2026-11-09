import type { MetadataRoute } from "next";
import { robotsPolicy, sitemapUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: robotsPolicy.userAgent,
      allow: robotsPolicy.allow,
      disallow: [...robotsPolicy.disallow],
    },
    sitemap: sitemapUrl(),
  };
}
