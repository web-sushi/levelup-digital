import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPublishedConceptSlugs } from "@/content/projects/projects";
import { publicInquirySubmissionsAvailable } from "@/lib/inquiries/public-availability";
import { previewRobotsTagHeaders } from "@/lib/preview-indexing";
import {
  SITE_ORIGIN,
  breadcrumbJsonLd,
  canonicalUrl,
  createPageMetadata,
  indexablePaths,
  robotsPolicy,
  siteJsonLd,
  sitemapUrl,
} from "@/lib/seo";

describe("search metadata", () => {
  it("uses the canonical origin without localhost or a trailing slash on inner pages", () => {
    assert.equal(canonicalUrl("/"), SITE_ORIGIN);
    assert.equal(canonicalUrl("/about"), `${SITE_ORIGIN}/about`);
    assert.equal(canonicalUrl("/work/tour-basic").endsWith("/"), false);
    assert.equal(canonicalUrl("/about").includes("localhost"), false);
    assert.equal(canonicalUrl("/about").includes("vercel.app"), false);
  });

  it("lists each public page once and leaves out utility routes", () => {
    const paths = indexablePaths();
    assert.equal(new Set(paths).size, paths.length);
    assert.equal(paths.includes("/"), true);
    assert.equal(paths.includes("/services"), true);
    assert.equal(paths.includes("/work"), true);
    assert.equal(paths.includes("/about"), true);
    assert.equal(paths.includes("/contact"), true);
    assert.equal(paths.includes("/privacy"), true);
    assert.equal(paths.includes("/work/enjoy-travel-and-tours"), true);
    assert.equal(paths.includes("/work/mark-maeda-travel-and-tour"), true);
    for (const slug of getPublishedConceptSlugs()) {
      assert.equal(paths.includes(`/work/${slug}`), true);
    }
    assert.equal(paths.includes("/thank-you"), false);
    assert.equal(paths.includes("/api/inquiries"), false);
    assert.equal(paths.length, 6 + 2 + getPublishedConceptSlugs().length);
  });

  it("keeps the thank-you page out of the index and points sharing metadata at the canonical site", () => {
    const page = createPageMetadata({
      title: "Thank You",
      description: "Reserved confirmation page.",
      path: "/thank-you",
      index: false,
    });
    assert.equal(page.alternates && "canonical" in page.alternates ? page.alternates.canonical : "", `${SITE_ORIGIN}/thank-you`);
    assert.deepEqual(page.robots, { index: false, follow: true });
    const home = createPageMetadata({
      title: "Websites and custom digital products",
      description: "Studio description.",
      path: "/",
    });
    assert.equal(home.openGraph && !Array.isArray(home.openGraph) ? home.openGraph.url : "", SITE_ORIGIN);
    assert.equal(home.title && typeof home.title === "object" && "absolute" in home.title ? home.title.absolute : "", "Websites and custom digital products | LevelUp Digital");
    assert.equal(JSON.stringify(home.twitter).includes("summary_large_image"), true);
    const image = Array.isArray(home.openGraph?.images) ? home.openGraph.images[0] : undefined;
    assert.equal(image && typeof image === "object" && "url" in image ? image.url : "", "/og");
  });

  it("advertises the sitemap and does not block the public site", () => {
    assert.equal(robotsPolicy.allow, "/");
    assert.deepEqual([...robotsPolicy.disallow], ["/api/", "/thank-you"]);
    assert.equal(sitemapUrl(), `${SITE_ORIGIN}/sitemap.xml`);
  });

  it("publishes only verified organization facts", () => {
    const encoded = JSON.stringify(siteJsonLd());
    assert.equal(encoded.includes("\"Organization\""), true);
    assert.equal(encoded.includes("\"WebSite\""), true);
    assert.equal(encoded.includes("\"ProfessionalService\""), true);
    assert.equal(encoded.includes("levelupdigital.support@gmail.com"), true);
    assert.equal(encoded.includes("Tokyo"), true);
    for (const invented of ["aggregateRating", "review", "streetAddress", "postalCode", "employee", "award"]) {
      assert.equal(encoded.includes(invented), false);
    }
    const crumbs = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Work", path: "/work" },
      { name: "Tour Guide: Basic", path: "/work/tour-basic" },
    ]);
    assert.equal(crumbs.itemListElement.length, 3);
    assert.equal(crumbs.itemListElement[2]?.item, `${SITE_ORIGIN}/work/tour-basic`);
    assert.equal(publicInquirySubmissionsAvailable, false);
  });

  it("adds a preview noindex header without changing production indexing", () => {
    assert.deepEqual(previewRobotsTagHeaders(undefined), []);
    assert.deepEqual(previewRobotsTagHeaders("production"), []);
    assert.deepEqual(previewRobotsTagHeaders("development"), []);
    assert.deepEqual(previewRobotsTagHeaders("preview"), [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ]);
  });
});
