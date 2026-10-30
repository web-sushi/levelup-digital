import Image from "next/image";
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
    <section className="concept-study-band concept-study-band-surface" aria-labelledby="related-projects-heading">
      <div className="site-container">
        <h2 id="related-projects-heading" className="concept-study-heading">
          Related concepts
        </h2>
        <p className="concept-study-lead">
          Other illustrative builds in the Concept Lab, using the same data and no
          ranking claims.
        </p>
        <ul className="concept-study-related">
          {projects.map((project) => (
            <li key={project.slug}>
              <Link href={`/work/${project.slug}`} className="concept-study-related-link focus-ring">
                <span className="concept-study-related-media">
                  <Image
                    src={project.imageDesktop}
                    alt={`${project.title} desktop concept demo preview`}
                    width={960}
                    height={454}
                    className="concept-study-image"
                    sizes="(max-width: 767px) 92vw, (max-width: 1023px) 46vw, 24rem"
                  />
                </span>
                <span className="concept-study-related-meta">
                  <span>{project.category}</span>
                  <span className="concept-study-related-label">Concept project</span>
                </span>
                <h3 className="concept-study-related-title">{project.title}</h3>
                <span className="concept-study-related-go">
                  View case study <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
