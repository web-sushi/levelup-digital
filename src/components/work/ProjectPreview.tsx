import Image from "next/image";
import type { PortfolioProject } from "@/content/projects/types";

type ProjectPreviewProps = {
  project: PortfolioProject;
};

export function ProjectPreview({ project }: ProjectPreviewProps) {
  return (
    <section className="concept-study-stage-wrap" aria-labelledby="project-preview-heading">
      <div className="site-container">
        <h2 id="project-preview-heading" className="concept-study-kicker">
          Demo preview
        </h2>
        <p className="concept-study-stage-note">
          Desktop and mobile layouts from the migrated concept demo screenshots.
        </p>
        <div className="concept-study-stage">
          <figure className="concept-study-desktop">
            <Image
              src={project.imageDesktop}
              alt={`${project.title} desktop layout preview`}
              width={960}
              height={454}
              className="concept-study-image"
              sizes="(max-width: 1023px) 92vw, 68rem"
              priority
            />
          </figure>
          <figure className="concept-study-mobile">
            <Image
              src={project.imageMobile}
              alt={`${project.title} mobile layout preview`}
              width={320}
              height={420}
              className="concept-study-image"
              sizes="(max-width: 1023px) 70vw, 13rem"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
