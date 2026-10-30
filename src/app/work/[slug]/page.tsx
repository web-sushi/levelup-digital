import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectContentSection } from "@/components/work/ProjectContentSection";
import { ProjectCTA } from "@/components/work/ProjectCTA";
import { ProjectCustomization } from "@/components/work/ProjectCustomization";
import { ProjectHero } from "@/components/work/ProjectHero";
import { ProjectOverview } from "@/components/work/ProjectOverview";
import { ProjectPreview } from "@/components/work/ProjectPreview";
import { ProjectProcess } from "@/components/work/ProjectProcess";
import { RelatedProjects } from "@/components/work/RelatedProjects";
import {
  getCaseStudyDetail,
  getProjectBySlug,
  getPublishedConceptSlugs,
  getRelatedConceptProjects,
} from "@/content/projects/projects";

const siteUrl = "https://levelup-digital.dev";

type CaseStudyPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPublishedConceptSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  const detail = getCaseStudyDetail(slug);

  if (!project || !detail) {
    return { title: "Case study not found" };
  }

  const path = `/work/${slug}` as const;
  const title = `${project.title} | Concept case study`;
  const description = detail.seoDescription;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}${path}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}${path}`,
      type: "article",
      images: [
        {
          url: `${siteUrl}${project.imageDesktop}`,
          alt: `${project.title} desktop preview`,
        },
      ],
    },
  };
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  const detail = getCaseStudyDetail(slug);

  if (!project || project.kind !== "concept" || !detail) {
    notFound();
  }

  const related = getRelatedConceptProjects(slug);
  const projectNumber = getPublishedConceptSlugs().indexOf(slug) + 1;

  return (
    <>
      <ProjectHero project={project} projectNumber={projectNumber} />
      <ProjectPreview project={project} />
      <ProjectOverview
        overview={detail.overview}
        category={project.category}
        tier={project.tier}
      />
      <ProjectContentSection
        id="project-website-includes"
        title="What's in the website"
        intro={detail.websiteIntro}
        items={detail.websiteIncludes}
      />
      <ProjectContentSection
        id="project-key-features"
        title="Key features"
        intro={detail.featuresIntro}
        items={detail.features}
        variant="surface"
        shift
      />
      <ProjectContentSection
        id="project-benefits"
        title={detail.benefitsTitle}
        intro={detail.benefitsIntro}
        items={detail.intendedBenefits}
      />
      <ProjectProcess intro={detail.processIntro} steps={detail.process} />
      <ProjectCustomization paragraphs={detail.customization} />
      <RelatedProjects projects={related} />
      <ProjectCTA />
    </>
  );
}
