const steps = [
  {
    title: "Reach out",
    text: "Share your business idea, challenge, or project requirements.",
  },
  {
    title: "Let's discuss",
    text: "We'll clarify the goals, scope, and priorities.",
  },
  {
    title: "Plan the build",
    text: "We'll outline an appropriate direction and next steps.",
  },
] as const;

export function ContactProcess() {
  return (
    <section className="contact-band contact-band-surface" aria-labelledby="contact-process-heading">
      <div className="site-container">
        <h2 id="contact-process-heading" className="contact-heading">
          What happens next?
        </h2>
        <p className="contact-lead">
          This is the usual shape of an initial conversation. It is not a promise
          of a quote, a timeline, or that every enquiry becomes a project.
        </p>
        <ol className="contact-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="contact-step-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
