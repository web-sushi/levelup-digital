import Image from "next/image";
import Link from "next/link";
import { homepageFeaturedProjectSlugs } from "@/content/homepage";
import { getProjectBySlug } from "@/content/projects/projects";

export function HomeSelectedWork() {
  const projects = homepageFeaturedProjectSlugs
    .map((slug) => getProjectBySlug(slug))
    .filter((project): project is NonNullable<typeof project> => Boolean(project));

  return (
    <section
      className="page-section page-section-surface"
      aria-labelledby="home-work-heading"
    >
      <div className="site-container">
        <h2 id="home-work-heading" className="page-section-title">
          Selected work
        </h2>
        <p className="page-section-intro">
          <span className="concept-badge">Concept projects</span>{" "}
          <span style={{ marginLeft: "0.35rem" }}>
            Illustrative demos across industries and build tiers — explore structure
            on case studies, then open live GitHub Pages demos. Not verified client
            engagements.
          </span>
        </p>
        <ul className="home-work-grid">
          {projects.map((project) => (
            <li key={project.slug}>
              <article className="home-work-card">
                <div className="home-work-preview">
                  <Image
                    src={project.imageDesktop}
                    alt={`${project.title} desktop concept preview`}
                    width={960}
                    height={454}
                    className="home-work-desktop"
                    sizes="(max-width: 900px) 100vw, 33vw"
                  />
                  <Image
                    src={project.imageMobile}
                    alt={`${project.title} mobile concept preview`}
                    width={320}
                    height={420}
                    className="home-work-mobile"
                    sizes="120px"
                  />
                </div>
                <div className="home-work-body">
                  <p className="concept-card-meta">
                    <span>{project.category}</span>
                    <span aria-hidden> · </span>
                    <span>{project.tier}</span>
                    <span className="concept-badge">Concept</span>
                  </p>
                  <h3>
                    <Link href={`/work/${project.slug}`} className="focus-ring">
                      {project.title}
                    </Link>
                  </h3>
                  <p>{project.summary}</p>
                  <Link
                    href={`/work/${project.slug}`}
                    className="page-link-button-secondary focus-ring home-work-link"
                  >
                    View case study
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
        <Link href="/work" className="page-inline-cta focus-ring">
          View all concept demos
        </Link>
      </div>
    </section>
  );
}
