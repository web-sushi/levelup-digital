export type RobotsTagHeader = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

/**
 * Vercel already sends `X-Robots-Tag: noindex` on preview deployment URLs.
 * A custom domain attached to a preview does not get that header unless the
 * app sends it. Production builds leave this empty, including when
 * `VERCEL_ENV` is unset.
 */
const INDEXABLE_HOSTS = new Set(["levelup-digital.dev", "www.levelup-digital.dev"]);

/**
 * Temporary Vercel hostnames stay out of the index even when a deployment's
 * environment is production. The public domain does not receive this tag.
 */
export function temporaryHostRobotsTag(hostHeader: string | null): "noindex" | null {
  const host = hostHeader?.trim().toLowerCase().split(":")[0] ?? "";
  if (INDEXABLE_HOSTS.has(host)) {
    return null;
  }
  return "noindex";
}

export function previewRobotsTagHeaders(vercelEnv: string | undefined): RobotsTagHeader[] {
  if (vercelEnv !== "preview") {
    return [];
  }
  return [
    {
      source: "/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex" }],
    },
  ];
}
