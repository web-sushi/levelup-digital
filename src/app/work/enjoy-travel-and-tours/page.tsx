import type { Metadata } from "next";
import { ClientCaseStudy } from "@/components/portfolio/ClientCaseStudy";
import { JsonLd } from "@/components/seo/JsonLd";
import { CLIENT_IMAGE_HEIGHT, CLIENT_IMAGE_WIDTH, getClientProject } from "@/content/projects/client-work";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd } from "@/lib/seo";

const project = getClientProject("enjoy-travel-and-tours");
const path = `/work/${project.slug}` as const;

export const metadata: Metadata = createPageMetadata({
  title: project.title,
  description: project.seoDescription,
  path,
  type: "article",
  image: {
    url: project.hero.src,
    alt: project.hero.alt,
    width: CLIENT_IMAGE_WIDTH,
    height: CLIENT_IMAGE_HEIGHT,
  },
});

export default function EnjoyTravelCaseStudyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Work", path: "/work" },
          { name: project.title, path },
        ])}
      />
      <ClientCaseStudy project={project} />
    </>
  );
}
