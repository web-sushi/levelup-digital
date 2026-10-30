/** Concept demos highlighted on the homepage — must exist in portfolioProjects. */
export const homepageFeaturedProjectSlugs = [
  "tour-standard",
  "cafe-standard",
  "photo-standard",
] as const;

export type HomepageServiceOverview = {
  title: string;
  description: string;
  href: `/services#${string}`;
};

/** Aligned with /services — not a fixed-package claim for every item. */
export const homepageServiceOverview: HomepageServiceOverview[] = [
  {
    title: "Business Websites",
    description:
      "Structured marketing sites with clear pages, mobile-responsive layouts, and inquiry paths, scoped through Basic, Standard, or Pro build levels.",
    href: "/services#business-websites",
  },
  {
    title: "Custom Web Applications",
    description:
      "Product-style experiences and bespoke tools quoted separately from website packages after discovery defines scope and architecture.",
    href: "/services#custom-web-applications",
  },
  {
    title: "Booking & Payment Systems",
    description:
      "Reservation flows, scheduling, and payment integrations when your project requires them. Capabilities and integrations are agreed per project.",
    href: "/services#booking-and-payments",
  },
  {
    title: "Website Improvements & Maintenance",
    description:
      "Updates, security-minded maintenance, SEO setup, and iterative improvements. These can be optional add-ons or standalone engagements, depending on need.",
    href: "/services#website-improvements",
  },
];
