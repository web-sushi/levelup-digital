import type { Metadata } from "next";
import { ClientCaseStudy } from "@/components/portfolio/ClientCaseStudy";
import { getClientProject } from "@/content/projects/client-work";
import { createPageMetadata } from "@/lib/metadata";

const project = getClientProject("mark-maeda-travel-and-tour");
const path = `/work/${project.slug}` as const;

export const metadata: Metadata = {
  ...createPageMetadata({
    title: project.title,
    description: project.seoDescription,
    path,
  }),
  openGraph: {
    title: `${project.title} | LevelUp Digital`,
    description: project.seoDescription,
    url: path,
    type: "article",
    images: [{ url: project.hero.src, alt: project.hero.alt }],
  },
};

export default function MarkMaedaCaseStudyPage() {
  return <ClientCaseStudy project={project} />;
}
