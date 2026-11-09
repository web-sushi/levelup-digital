import type { MetadataRoute } from "next";
import { canonicalUrl, indexablePaths } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexablePaths().map((path) => ({
    url: canonicalUrl(path),
  }));
}
