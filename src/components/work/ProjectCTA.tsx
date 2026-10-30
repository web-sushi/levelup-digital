import Link from "next/link";
import type { PortfolioProject } from "@/content/projects/types";

type ProjectCTAProps = {
  project: PortfolioProject;
};

export function ProjectCTA({ project }: ProjectCTAProps) {
  return (
    <section className="page-section page-section-surface" aria-labelledby="project-cta-heading">
      <div className="site-container case-study-cta">
        <h2 id="project-cta-heading" className="page-section-title">
          Explore the demo or start a conversation
        </h2>
        <p className="page-section-intro">
          Open the interactive GitHub Pages demo, or reach out if you want a
          similar structure for your business.
        </p>
        <div className="case-study-hero-actions">
          <a
            href={project.demoUrl}
            className="page-link-button focus-ring"
            target="_blank"
            rel="noopener noreferrer"
          >
            View live demo ↗
          </a>
          <Link
            href={`/contact?project=${project.slug}`}
            className="page-link-button-secondary focus-ring"
          >
            Inquire about this concept
          </Link>
        </div>
      </div>
    </section>
  );
}
