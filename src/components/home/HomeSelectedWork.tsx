import Image from "next/image";
import Link from "next/link";
import { homepageFeaturedProjectSlugs } from "@/content/homepage";
import { getProjectBySlug } from "@/content/projects/projects";

export function HomeSelectedWork() {
  const projects = homepageFeaturedProjectSlugs
    .map((slug) => getProjectBySlug(slug))
    .filter((project): project is NonNullable<typeof project> => Boolean(project));

  const [featured, ...supporting] = projects;

  if (!featured) {
    return null;
  }

  return (
    <section className="home-work" aria-labelledby="home-work-heading">
      <div className="site-container">
        <h2 id="home-work-heading" className="home-section-title">
          Selected work
        </h2>
        <p className="home-section-lead">
          Concept projects are illustrative demos, not verified client engagements.
          Open a case study, then the live demo.
        </p>
        <div className="home-work-stage">
          <ProjectFeature project={featured} priority />
          <div className="home-work-support">
            {supporting.map((project) => (
              <ProjectFeature key={project.slug} project={project} />
            ))}
          </div>
        </div>
        <Link href="/work" className="page-inline-cta focus-ring">
          View all concept demos
        </Link>
      </div>
    </section>
  );
}

function ProjectFeature({
  project,
  priority = false,
}: {
  project: NonNullable<ReturnType<typeof getProjectBySlug>>;
  priority?: boolean;
}) {
  return (
    <article className={priority ? "home-work-feature" : "home-work-item"}>
      <Link href={`/work/${project.slug}`} className="home-work-link focus-ring">
        <Image
          src={project.imageDesktop}
          alt={`${project.title} desktop concept preview`}
          width={960}
          height={454}
          className="home-work-image"
          sizes={priority ? "(max-width: 1024px) 100vw, 62vw" : "(max-width: 1024px) 100vw, 30vw"}
          priority={priority}
        />
        <p className="home-work-kicker">
          <span>{project.category}</span>
          <span className="home-work-concept">Concept project</span>
        </p>
        <h3>{project.title}</h3>
        <span className="home-work-go">View case study</span>
      </Link>
    </article>
  );
}
