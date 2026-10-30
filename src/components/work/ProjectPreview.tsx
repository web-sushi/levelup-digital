import Image from "next/image";
import type { PortfolioProject } from "@/content/projects/types";

type ProjectPreviewProps = {
  project: PortfolioProject;
};

export function ProjectPreview({ project }: ProjectPreviewProps) {
  return (
    <section className="page-section" aria-labelledby="project-preview-heading">
      <div className="site-container">
        <h2 id="project-preview-heading" className="page-section-title">
          Demo preview
        </h2>
        <p className="page-section-intro">
          Desktop and mobile layouts from the migrated concept demo screenshots.
        </p>
        <div className="case-study-preview">
          <figure className="case-study-preview-desktop">
            <Image
              src={project.imageDesktop}
              alt={`${project.title} desktop layout preview`}
              width={960}
              height={454}
              className="case-study-preview-image"
              sizes="(max-width: 900px) 100vw, 960px"
              priority
            />
          </figure>
          <figure className="case-study-preview-mobile">
            <Image
              src={project.imageMobile}
              alt={`${project.title} mobile layout preview`}
              width={320}
              height={420}
              className="case-study-preview-image"
              sizes="240px"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
