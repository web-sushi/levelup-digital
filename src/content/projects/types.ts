export type ProjectKind = "client" | "concept";

export type ProjectStatus = "published" | "draft";

export type PortfolioProject = {
  slug: string;
  title: string;
  kind: ProjectKind;
  category: string;
  tier: "Basic" | "Standard" | "Pro";
  summary: string;
  tags?: string[];
  imageDesktop: string;
  imageMobile: string;
  demoUrl: string;
  caseStudyUrl?: string;
  status: ProjectStatus;
};
