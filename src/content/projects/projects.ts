import { caseStudyDetails } from "@/content/projects/case-study-details";
import type { CaseStudyDetail, PortfolioProject } from "@/content/projects/types";

/** All eleven legacy demo sites are concept work (external GitHub Pages demos). */
export const portfolioProjects: PortfolioProject[] = [
  {
    slug: "tour-basic",
    title: "Tour Guide: Basic",
    kind: "concept",
    category: "Tour Guides",
    tier: "Basic",
    summary:
      "Concept demo for new tour operators who need a professional online presence quickly.",
    tags: ["Tour Listings", "Booking Flow", "Mobile-first"],
    imageDesktop: "/images/work/tour-basic-desktop.webp",
    imageMobile: "/images/work/tour-basic-mobile.webp",
    demoUrl: "https://web-sushi.github.io/tour-basic-demo/",
    status: "published",
  },
  {
    slug: "tour-standard",
    title: "Tour Guide: Standard",
    kind: "concept",
    category: "Tour Guides",
    tier: "Standard",
    summary:
      "Concept demo for established tour businesses ready to showcase expertise and build trust.",
    tags: ["Photo Galleries", "Testimonials", "SEO-ready structure"],
    imageDesktop: "/images/work/tour-standard-desktop.webp",
    imageMobile: "/images/work/tour-standard-mobile.webp",
    demoUrl: "https://web-sushi.github.io/tour-standard-demo/",
    status: "published",
  },
  {
    slug: "tour-pro",
    title: "Tour Guide: Pro",
    kind: "concept",
    category: "Tour Guides",
    tier: "Pro",
    summary:
      "Concept demo exploring advanced tour-operator features and scalability.",
    tags: ["Payments", "Multi-language", "Customer dashboard"],
    imageDesktop: "/images/work/tour-pro-desktop.webp",
    imageMobile: "/images/work/tour-pro-mobile.webp",
    demoUrl: "https://web-sushi.github.io/tour-pro-demo/",
    status: "published",
  },
  {
    slug: "cafe-basic",
    title: "Cafe: Basic",
    kind: "concept",
    category: "Cafes",
    tier: "Basic",
    summary:
      "Concept demo for small cafes establishing a simple, welcoming online presence.",
    tags: ["Menu Display", "Location Map", "Fast Loading"],
    imageDesktop: "/images/work/cafe-basic-desktop.webp",
    imageMobile: "/images/work/cafe-basic-mobile.webp",
    demoUrl: "https://web-sushi.github.io/cafe-basic-demo/",
    status: "published",
  },
  {
    slug: "cafe-standard",
    title: "Cafe: Standard",
    kind: "concept",
    category: "Cafes",
    tier: "Standard",
    summary:
      "Concept demo for cafes ready to expand online ordering and brand storytelling.",
    tags: ["Online Ordering", "Reviews", "Event Booking"],
    imageDesktop: "/images/work/cafe-standard-desktop.webp",
    imageMobile: "/images/work/cafe-standard-mobile.webp",
    demoUrl: "https://web-sushi.github.io/cafe-standard-demo/",
    status: "published",
  },
  {
    slug: "photo-basic",
    title: "Photography: Basic",
    kind: "concept",
    category: "Photography",
    tier: "Basic",
    summary:
      "Concept demo portfolio for photographers who want a clean, professional showcase.",
    tags: ["Portfolio Gallery", "Booking Form", "Clean Design"],
    imageDesktop: "/images/work/photo-basic-desktop.webp",
    imageMobile: "/images/work/photo-basic-mobile.webp",
    demoUrl: "https://web-sushi.github.io/photo-basic-demo/",
    status: "published",
  },
  {
    slug: "photo-standard",
    title: "Photography: Standard",
    kind: "concept",
    category: "Photography",
    tier: "Standard",
    summary:
      "Concept demo for established photographers presenting packages and gallery depth.",
    tags: ["Advanced Gallery", "Pricing Packages", "Client Portal"],
    imageDesktop: "/images/work/photo-standard-desktop.webp",
    imageMobile: "/images/work/photo-standard-mobile.webp",
    demoUrl: "https://web-sushi.github.io/photo-standard-demo/",
    status: "published",
  },
  {
    slug: "home-service-basic",
    title: "Home Service: Basic",
    kind: "concept",
    category: "Home Services",
    tier: "Basic",
    summary:
      "Concept demo for home service businesses building trust and quote requests online.",
    tags: ["Service Areas", "Quote Request", "Trust Building"],
    imageDesktop: "/images/work/home-service-basic-desktop.webp",
    imageMobile: "/images/work/home-service-basic-mobile.webp",
    demoUrl: "https://web-sushi.github.io/home-service-basic-demo/",
    status: "published",
  },
  {
    slug: "home-service-standard",
    title: "Home Service: Standard",
    kind: "concept",
    category: "Home Services",
    tier: "Standard",
    summary:
      "Concept demo for established service businesses showcasing reviews and scheduling flows.",
    tags: ["Online Scheduling", "Before/After Gallery", "Customer Reviews"],
    imageDesktop: "/images/work/home-service-standard-desktop.webp",
    imageMobile: "/images/work/home-service-standard-mobile.webp",
    demoUrl: "https://web-sushi.github.io/home-service-standard-demo/",
    status: "published",
  },
  {
    slug: "clinic-basic",
    title: "Clinic: Basic",
    kind: "concept",
    category: "Clinics",
    tier: "Basic",
    summary:
      "Concept demo for clinics needing a clean, trustworthy patient-facing presence.",
    tags: ["Appointment Booking", "Staff Profiles", "Patient-focused"],
    imageDesktop: "/images/work/clinic-basic-desktop.webp",
    imageMobile: "/images/work/clinic-basic-mobile.webp",
    demoUrl: "https://web-sushi.github.io/clinic-basic-demo/",
    status: "published",
  },
  {
    slug: "clinic-standard",
    title: "Clinic: Standard",
    kind: "concept",
    category: "Clinics",
    tier: "Standard",
    summary:
      "Concept demo for clinics exploring enhanced online services and resource areas.",
    tags: ["Patient Portal", "Health Resources", "Extended content"],
    imageDesktop: "/images/work/clinic-standard-desktop.webp",
    imageMobile: "/images/work/clinic-standard-mobile.webp",
    demoUrl: "https://web-sushi.github.io/clinic-standard-demo/",
    status: "published",
  },
];

export function getConceptProjects() {
  return portfolioProjects.filter((p) => p.kind === "concept");
}

export function getClientProjects() {
  return portfolioProjects.filter((p) => p.kind === "client");
}

export function groupProjectsByCategory(projects: PortfolioProject[]) {
  return projects.reduce<Record<string, PortfolioProject[]>>((acc, project) => {
    if (!acc[project.category]) {
      acc[project.category] = [];
    }
    acc[project.category].push(project);
    return acc;
  }, {});
}

export function getProjectBySlug(slug: string): PortfolioProject | undefined {
  return portfolioProjects.find((p) => p.slug === slug && p.status === "published");
}

export function getCaseStudyDetail(slug: string): CaseStudyDetail | undefined {
  return caseStudyDetails[slug];
}

export function getPublishedConceptSlugs(): string[] {
  return portfolioProjects
    .filter((p) => p.kind === "concept" && p.status === "published")
    .map((p) => p.slug);
}

/** Same-category concept demos first, then others. Stable slug order, excludes current. */
export function getRelatedConceptProjects(
  slug: string,
  limit = 3,
): PortfolioProject[] {
  const current = getProjectBySlug(slug);
  if (!current) {
    return [];
  }

  const concepts = getConceptProjects().filter((p) => p.slug !== slug);
  const sameCategory = concepts
    .filter((p) => p.category === current.category)
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const other = concepts
    .filter((p) => p.category !== current.category)
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return [...sameCategory, ...other].slice(0, limit);
}
