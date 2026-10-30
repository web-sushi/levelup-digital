import type { ProjectContentBlock } from "@/content/projects/types";

type ProjectProcessProps = {
  intro?: string;
  steps: ProjectContentBlock[];
};

export function ProjectProcess({ intro, steps }: ProjectProcessProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <section className="concept-study-band concept-study-band-surface" aria-labelledby="project-process-heading">
      <div className="site-container">
        <h2 id="project-process-heading" className="concept-study-heading">
          How it works
        </h2>
        {intro ? <p className="concept-study-lead">{intro}</p> : null}
        <ol className="concept-study-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="concept-study-step-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
