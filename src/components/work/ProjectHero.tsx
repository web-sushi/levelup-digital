import Link from "next/link";
import type { PortfolioProject } from "@/content/projects/types";

type ProjectHeroProps = {
  project: PortfolioProject;
  projectNumber: number;
};

export function ProjectHero({ project, projectNumber }: ProjectHeroProps) {
  const number = String(projectNumber).padStart(2, "0");

  return (
    <header className="concept-study-hero">
      <div className="site-container">
        <p className="concept-study-kicker">
          Concept Lab
          <span aria-hidden="true"> / Project {number}</span>
        </p>
        <p className="concept-study-category">{project.category}</p>
        <h1 className="concept-study-title">{project.title}</h1>
        <p className="concept-study-label">Concept project</p>
        <p className="concept-study-summary">{project.summary}</p>
        <p className="concept-study-note">
          Illustrative concept demo, not a verified client engagement. Explore
          structure here, then open the live demo on GitHub Pages.
        </p>
        <div className="concept-study-actions">
          <a
            href={project.demoUrl}
            className="page-link-button focus-ring"
            target="_blank"
            rel="noopener noreferrer"
          >
            View live demo ↗
          </a>
          <Link href="/work" className="page-link-button-secondary focus-ring">
            All work ↗
          </Link>
        </div>
      </div>
    </header>
  );
}
