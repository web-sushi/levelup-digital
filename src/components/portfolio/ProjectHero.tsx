import Image from "next/image";
import {
  CLIENT_IMAGE_HEIGHT,
  CLIENT_IMAGE_WIDTH,
  type ClientProject,
} from "@/content/projects/client-work";
import { ProjectStatusBadge } from "@/components/portfolio/ProjectStatusBadge";

export function ProjectHero({ project }: { project: ClientProject }) {
  return (
    <section className="client-hero" aria-labelledby="client-heading">
      <div className="site-container client-hero-grid">
        <div>
          <p className="client-kicker">
            Client project <span aria-hidden="true">/ {project.number}</span>
          </p>
          <p className="client-number" aria-hidden="true">
            {project.number}
          </p>
          <ProjectStatusBadge status={project.status} />
          <h1 id="client-heading">{project.title}</h1>
          <p className="client-category">{project.category}</p>
          <p className="client-intro">{project.introduction}</p>
        </div>
        <figure className="client-figure client-hero-figure">
          <Image
            src={project.hero.src}
            alt={project.hero.alt}
            width={CLIENT_IMAGE_WIDTH}
            height={CLIENT_IMAGE_HEIGHT}
            priority
            sizes="(max-width: 1024px) 100vw, 72rem"
            className="client-shot"
          />
          <figcaption>{project.hero.caption}</figcaption>
        </figure>
      </div>
    </section>
  );
}
