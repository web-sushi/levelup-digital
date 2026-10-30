import type { ClientProject } from "@/content/projects/client-work";
import { ProjectFeatureSection } from "@/components/portfolio/ProjectFeatureSection";
import { ProjectHero } from "@/components/portfolio/ProjectHero";
import { ProjectNavigation } from "@/components/portfolio/ProjectNavigation";
import { ProjectOverview } from "@/components/portfolio/ProjectOverview";
import { ProjectTechStack } from "@/components/portfolio/ProjectTechStack";

export function ClientCaseStudy({ project }: { project: ClientProject }) {
  return (
    <>
      <ProjectHero project={project} />
      <ProjectOverview project={project} />
      {project.sections.map((section) => (
        <ProjectFeatureSection key={section.id} section={section} />
      ))}
      <ProjectTechStack project={project} />
      {project.statusNote ? (
        <section className="client-band" aria-labelledby="client-status-heading">
          <div className="site-container client-split">
            <h2 id="client-status-heading">Status</h2>
            <div>
              {project.statusNote.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {project.liveUrl ? (
        <section className="client-band client-band-surface" aria-labelledby="client-live-heading">
          <div className="site-container client-split">
            <h2 id="client-live-heading">Live website</h2>
            <div>
              <p>The public website is available at the address below.</p>
              <a
                href={project.liveUrl}
                className="page-link-button focus-ring"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit live website
                <span aria-hidden="true"> ↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </div>
        </section>
      ) : null}
      <ProjectNavigation project={project} />
    </>
  );
}
