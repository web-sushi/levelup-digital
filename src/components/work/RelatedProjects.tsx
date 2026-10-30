import Link from "next/link";
import type { PortfolioProject } from "@/content/projects/types";

type RelatedProjectsProps = {
  projects: PortfolioProject[];
};

export function RelatedProjects({ projects }: RelatedProjectsProps) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <section className="page-section" aria-labelledby="related-projects-heading">
      <div className="site-container">
        <h2 id="related-projects-heading" className="page-section-title">
          Related concept demos
        </h2>
        <p className="page-section-intro">
          Other illustrative builds in the Concept Lab, using the same data and no
          ranking claims.
        </p>
        <ul className="case-study-related-list">
          {projects.map((project) => (
            <li key={project.slug}>
              <Link href={`/work/${project.slug}`} className="page-card focus-ring case-study-related-card">
                <p className="concept-card-meta">
                  <span>{project.category}</span>
                  <span aria-hidden> · </span>
                  <span>{project.tier}</span>
                </p>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
