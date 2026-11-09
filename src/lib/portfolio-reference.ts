import { clientProjects } from "@/content/projects/client-work";
import { portfolioProjects } from "@/content/projects/projects";

const PROJECT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PortfolioReference = {
  slug: string;
  title: string;
  path: `/work/${string}`;
};

/**
 * Accepts only a published portfolio slug. Concept and client slugs are not
 * wizard project types, and any other query value is ignored.
 */
export function portfolioReferenceFromQuery(
  value: string | string[] | undefined | null,
): PortfolioReference | null {
  if (typeof value !== "string" || value.length > 80 || !PROJECT_SLUG.test(value)) {
    return null;
  }
  const concept = portfolioProjects.find((project) => project.slug === value && project.status === "published");
  if (concept) {
    return { slug: concept.slug, title: concept.title, path: `/work/${concept.slug}` };
  }
  const client = clientProjects.find((project) => project.slug === value);
  if (client) {
    return { slug: client.slug, title: client.title, path: `/work/${client.slug}` };
  }
  return null;
}
