import type { ProjectContentBlock } from "@/content/projects/types";

type ProjectContentSectionProps = {
  id: string;
  title: string;
  intro?: string;
  items: ProjectContentBlock[];
  variant?: "default" | "surface";
  shift?: boolean;
};

export function ProjectContentSection({
  id,
  title,
  intro,
  items,
  variant = "default",
  shift = false,
}: ProjectContentSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className={
        variant === "surface"
          ? "concept-study-band concept-study-band-surface"
          : "concept-study-band"
      }
      aria-labelledby={id}
    >
      <div className="site-container">
        <h2 id={id} className="concept-study-heading">
          {title}
        </h2>
        {intro ? <p className="concept-study-lead">{intro}</p> : null}
        <ol className={shift ? "concept-study-rows concept-study-rows-shift" : "concept-study-rows"}>
          {items.map((item, index) => (
            <li key={item.title}>
              <span className="concept-study-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
