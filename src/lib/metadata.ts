import type { Metadata } from "next";

const siteUrl = "https://levelup-digital.dev";

export function createPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: `/${string}` | "/";
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}${path === "/" ? "" : path}`,
    },
  };
}
