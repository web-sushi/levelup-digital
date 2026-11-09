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
