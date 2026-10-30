import Link from "next/link";
import {
  getAdjacentClientProjects,
  type ClientProject,
} from "@/content/projects/client-work";

export function ProjectNavigation({ project }: { project: ClientProject }) {
  const { previous, next } = getAdjacentClientProjects(project.slug);

  return (
    <nav className="client-nav" aria-label="Client project navigation">
      <div className="site-container client-nav-grid">
        <Link href="/work" className="client-nav-back focus-ring">
          All work
        </Link>
        <div className="client-nav-neighbors">
          {previous ? (
            <Link href={`/work/${previous.slug}`} className="focus-ring">
              <span>Previous</span>
              {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/work/${next.slug}`} className="client-nav-next focus-ring">
              <span>Next</span>
              {next.title}
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
