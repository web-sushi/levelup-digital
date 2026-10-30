import Image from "next/image";
import Link from "next/link";
import { ProjectStatusBadge } from "@/components/portfolio/ProjectStatusBadge";
import {
  CLIENT_IMAGE_HEIGHT,
  CLIENT_IMAGE_WIDTH,
  clientProjects,
} from "@/content/projects/client-work";
import type { ClientProject } from "@/content/projects/client-work";
import { getConceptProjects, groupProjectsByCategory } from "@/content/projects/projects";
import type { PortfolioProject } from "@/content/projects/types";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Work",
  description:
    "Real client projects and Concept Lab demos for LevelUp Digital, including launched travel platforms.",
  path: "/work",
});

function WorkBars() {
  return (
    <svg className="work-bars" viewBox="0 0 160 72" aria-hidden="true" focusable="false">
      <rect x="0" y="46" width="18" height="26" fill="#2A2A2A" />
      <rect x="28" y="34" width="18" height="38" fill="#3A3A3A" />
      <rect x="56" y="22" width="18" height="50" fill="#FFFFFF" />
      <rect x="84" y="12" width="18" height="60" fill="#FFFFFF" />
      <rect x="112" y="0" width="18" height="72" fill="#00F050" />
    </svg>
  );
}

function ClientPiece({ project, flip = false }: { project: ClientProject; flip?: boolean }) {
  return (
    <article className={flip ? "work-client work-client-flip" : "work-client"}>
      <Link href={`/work/${project.slug}`} className="work-client-link focus-ring">
        <span className="work-media">
          <Image
            src={project.hero.src}
            alt={project.hero.alt}
            width={CLIENT_IMAGE_WIDTH}
            height={CLIENT_IMAGE_HEIGHT}
            className="work-image"
            sizes="(max-width: 1024px) 100vw, 72rem"
            priority={project.number === "01"}
          />
        </span>
        <span className="work-client-copy">
          <span className="work-meta">
            <span className="work-index" aria-hidden="true">
              {project.number}
            </span>
            <span>{project.category}</span>
            <ProjectStatusBadge status={project.status} />
          </span>
          <h3>{project.title}</h3>
          <p className="work-summary">{project.summary}</p>
          <span className="work-go">
            View case study <span aria-hidden="true">→</span>
          </span>
        </span>
      </Link>
    </article>
  );
}

function WorkPiece({
  project,
  index,
  total,
  featured = false,
}: {
  project: PortfolioProject;
  index?: number;
  total?: number;
  featured?: boolean;
}) {
  const concept = project.kind === "concept";
  const number =
    index && total
      ? `${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}`
      : null;

  return (
    <article className={featured ? "work-piece work-piece-feature" : "work-piece"}>
      <Link href={`/work/${project.slug}`} className="work-link focus-ring">
        <span className="work-media">
          <Image
            src={project.imageDesktop}
            alt={
              concept
                ? `${project.title} desktop concept demo preview`
                : `${project.title} project preview`
            }
            width={960}
            height={454}
            className="work-image"
            sizes={featured ? "(max-width: 1024px) 100vw, 72rem" : "(max-width: 1024px) 100vw, 42vw"}
            priority={featured}
          />
        </span>
        <span className="work-meta">
          {number ? (
            <span className="work-index" aria-hidden="true">
              {number}
            </span>
          ) : null}
          <span>{project.category}</span>
          <span className="work-concept">{concept ? "Concept project" : "Client project"}</span>
        </span>
        <h3>{project.title}</h3>
        {featured ? <p className="work-summary">{project.summary}</p> : null}
        <span className="work-go">
          View case study <span aria-hidden="true">→</span>
        </span>
      </Link>
    </article>
  );
}

export default function WorkPage() {
  const conceptProjects = getConceptProjects();
  const grouped = groupProjectsByCategory(conceptProjects);
  const total = conceptProjects.length;
  let seen = 0;

  return (
    <>
      <section className="work-hero" aria-labelledby="work-heading">
        <div className="site-container work-hero-grid">
          <div>
            <p className="work-kicker">
              Selected work <span aria-hidden="true">/ 02</span>
            </p>
            <h1 id="work-heading" className="work-hero-title">
              <span>Ideas made</span>
              <span className="work-hero-accent">real.</span>
            </h1>
          </div>
          <div className="work-hero-copy">
            <WorkBars />
            <p>
              Explore website concepts and digital experiences built to demonstrate
              thoughtful design, practical functionality, and attention to detail.
            </p>
          </div>
        </div>
      </section>

      <section className="work-band" aria-labelledby="work-clients-heading">
        <div className="site-container">
          <h2 id="work-clients-heading" className="work-title">
            Client projects
          </h2>
          <p className="work-lead">
            Commissioned platforms, kept separate from the Concept Lab demos
            below.
          </p>
          <ul className="work-client-list">
            {clientProjects.map((project, index) => (
              <li key={project.slug}>
                <ClientPiece project={project} flip={index % 2 === 1} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="work-band work-band-surface" aria-labelledby="work-lab-heading">
        <div className="site-container">
          <div className="work-lab-intro">
            <h2 id="work-lab-heading" className="work-title">
              The Concept Lab.
            </h2>
            <div>
              <p className="work-lead">
                An experimental collection of websites and digital experiences
                exploring different industries, layouts, and functionality.
              </p>
              <p className="work-disclaimer">
                These are independent demonstration projects, not commissioned
                client work.
              </p>
            </div>
          </div>

          {Object.entries(grouped).map(([category, projects], groupIndex) => {
            const start = seen;
            seen += projects.length;

            return (
              <div key={category} className="work-group">
                <p className="work-group-label">{category}</p>
                <ul
                  className={
                    groupIndex % 2 === 1
                      ? "work-group-list work-group-list-flip"
                      : "work-group-list"
                  }
                >
                  {projects.map((project, index) => {
                    const featured = groupIndex === 0 && index === 0;
                    return (
                      <li key={project.slug} className={featured ? "work-feature-slot" : undefined}>
                        <WorkPiece
                          project={project}
                          index={start + index + 1}
                          total={total}
                          featured={featured}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="work-close" aria-labelledby="work-close-heading">
        <div className="site-container work-close-grid">
          <h2 id="work-close-heading" className="work-close-title">
            Your project could be next.
          </h2>
          <div>
            <p>
              Have a website or digital product in mind? Tell us what you&apos;re
              building.
            </p>
            <Link href="/contact" className="page-link-button focus-ring">
              Start a project
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
