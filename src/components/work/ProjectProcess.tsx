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
    <section className="page-section" aria-labelledby="project-process-heading">
      <div className="site-container">
        <h2 id="project-process-heading" className="page-section-title">
          How it works
        </h2>
        {intro ? <p className="page-section-intro">{intro}</p> : null}
        <ol className="case-study-process">
          {steps.map((step, index) => (
            <li key={step.title} className="case-study-process-step">
              <span className="case-study-process-number" aria-hidden>
                {index + 1}
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
