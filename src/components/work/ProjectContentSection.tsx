import type { ProjectContentBlock } from "@/content/projects/types";

type ProjectContentSectionProps = {
  id: string;
  title: string;
  intro?: string;
  items: ProjectContentBlock[];
  variant?: "default" | "surface";
};

export function ProjectContentSection({
  id,
  title,
  intro,
  items,
  variant = "default",
}: ProjectContentSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className={
        variant === "surface" ? "page-section page-section-surface" : "page-section"
      }
      aria-labelledby={id}
    >
      <div className="site-container">
        <h2 id={id} className="page-section-title">
          {title}
        </h2>
        {intro ? <p className="page-section-intro">{intro}</p> : null}
        <ul className="case-study-block-list">
          {items.map((item) => (
            <li key={item.title} className="page-card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
