import Image from "next/image";
import type { PortfolioProject } from "@/content/projects/types";

type ConceptProjectCardProps = {
  project: PortfolioProject;
};

export function ConceptProjectCard({ project }: ConceptProjectCardProps) {
  return (
    <article className="concept-card">
      <div className="concept-card-preview">
        <Image
          src={project.imageDesktop}
          alt={`${project.title} desktop concept demo preview`}
          width={960}
          height={454}
          className="concept-card-desktop"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <Image
          src={project.imageMobile}
          alt={`${project.title} mobile concept demo preview`}
          width={320}
          height={420}
          className="concept-card-mobile"
          sizes="160px"
        />
      </div>
      <div className="concept-card-body">
        <p className="concept-card-meta">
          <span>{project.category}</span>
          <span aria-hidden> · </span>
          <span>{project.tier}</span>
          <span className="concept-badge">Concept</span>
        </p>
        <h3 className="concept-card-title">{project.title}</h3>
        <p className="concept-card-summary">{project.summary}</p>
        {project.tags && project.tags.length > 0 ? (
          <ul className="concept-card-tags" aria-label="Demo themes">
            {project.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
        <a
          href={project.demoUrl}
          className="page-link-button focus-ring"
          target="_blank"
          rel="noopener noreferrer"
        >
          View live demo ↗
        </a>
      </div>
    </article>
  );
}
