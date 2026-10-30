export type ProjectKind = "client" | "concept";

export type ProjectStatus = "published" | "draft";

export type ProjectContentBlock = {
  title: string;
  description: string;
};

export type CaseStudyDetail = {
  overview: string;
  seoDescription: string;
  websiteIntro?: string;
  websiteIncludes: ProjectContentBlock[];
  featuresIntro?: string;
  features: ProjectContentBlock[];
  benefitsTitle: string;
  benefitsIntro?: string;
  intendedBenefits: ProjectContentBlock[];
  processIntro?: string;
  process: ProjectContentBlock[];
  customization: string[];
};

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
