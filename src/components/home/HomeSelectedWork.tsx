import Image from "next/image";
import Link from "next/link";
import { ProjectStatusBadge } from "@/components/portfolio/ProjectStatusBadge";
import {
  CLIENT_IMAGE_HEIGHT,
  CLIENT_IMAGE_WIDTH,
  clientProjects,
  type ClientProject,
} from "@/content/projects/client-work";

export function HomeSelectedWork() {
  return (
    <section className="home-work" aria-labelledby="home-work-heading">
      <div className="site-container">
        <div className="home-work-intro">
          <p className="home-work-kicker">
            Selected work <span aria-hidden="true">/ 2026</span>
          </p>
          <h2 id="home-work-heading" className="home-work-title">
            <span>Real projects.</span>
            <span className="home-work-accent">Real solutions.</span>
          </h2>
          <p>
            LevelUp Digital builds websites and custom applications for real
            businesses.
          </p>
        </div>

        <ol className="home-work-list">
          {clientProjects.map((project, index) => (
            <li key={project.slug}>
              <ClientFeature project={project} flipped={index % 2 === 1} />
            </li>
          ))}
        </ol>

        <div className="home-work-lab">
          <div>
            <h3>Beyond client work.</h3>
            <p>
              Explore interface concepts and experimental website designs created
              to demonstrate different approaches to digital experiences. These
              pieces are concepts, not client work.
            </p>
          </div>
          <Link href="/work#work-lab-heading" className="home-work-lab-link focus-ring">
            Explore the Concept Lab <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function ClientFeature({
  project,
  flipped,
}: {
  project: ClientProject;
  flipped: boolean;
}) {
  return (
    <article className={flipped ? "home-work-project home-work-project-flip" : "home-work-project"}>
      <Link href={`/work/${project.slug}`} className="home-work-link focus-ring">
        <span className="home-work-heading">
          <span className="home-work-number" aria-hidden="true">
            {project.number}
          </span>
          <span className="home-work-meta">
            <span>{project.category}</span>
            <ProjectStatusBadge status={project.status} />
          </span>
          <h3>{project.title}</h3>
        </span>
        <span className="home-work-body">
          <p>{project.summary}</p>
          <ul className="home-work-points">
            {project.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <span className="home-work-go">
            View case study <span aria-hidden="true">→</span>
          </span>
        </span>
        <span className="home-work-media">
          <Image
            src={project.hero.src}
            alt={project.hero.alt}
            width={CLIENT_IMAGE_WIDTH}
            height={CLIENT_IMAGE_HEIGHT}
            className="home-work-image"
            sizes="(max-width: 1024px) 100vw, 58vw"
            priority={project.number === "01"}
          />
        </span>
      </Link>
    </article>
  );
}
