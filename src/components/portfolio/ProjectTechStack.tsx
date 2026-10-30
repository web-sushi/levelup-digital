import type { ClientProject } from "@/content/projects/client-work";

export function ProjectTechStack({ project }: { project: ClientProject }) {
  return (
    <section className="client-band client-band-surface" aria-labelledby="client-tech-heading">
      <div className="site-container client-split">
        <h2 id="client-tech-heading">Technology</h2>
        <ul className="client-tech">
          {project.technology.map((item) => (
            <li key={item.name}>
              <span>{item.name}</span>
              <span>{item.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
