import Link from "next/link";
import type { PortfolioProject } from "@/content/projects/types";

type ProjectHeroProps = {
  project: PortfolioProject;
  overview: string;
};

export function ProjectHero({ project, overview }: ProjectHeroProps) {
  return (
    <header className="page-header">
      <div className="site-container page-header-inner">
        <p className="case-study-meta">
          <Link href="/work" className="focus-ring case-study-back">
            Work
          </Link>
          <span aria-hidden> / </span>
          <span>{project.category}</span>
          <span aria-hidden> · </span>
          <span>{project.tier}</span>
          <span className="concept-badge">Concept</span>
        </p>
        <h1 className="page-title">{project.title}</h1>
        <p className="page-lead">{overview}</p>
        <p className="case-study-disclaimer">
          Illustrative concept demo — not a verified client engagement. Explore
          structure here, then open the live demo on GitHub Pages.
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
          <Link href="/contact" className="page-link-button-secondary focus-ring">
            Discuss a similar build
          </Link>
        </div>
      </div>
    </header>
  );
}
