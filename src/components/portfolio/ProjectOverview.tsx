import type { ClientProject } from "@/content/projects/client-work";

export function ProjectOverview({ project }: { project: ClientProject }) {
  return (
    <section className="client-band" aria-labelledby="client-overview-heading">
      <div className="site-container client-split">
        <h2 id="client-overview-heading">Project overview</h2>
        <div>
          {project.overview.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
