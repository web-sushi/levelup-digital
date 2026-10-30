const steps = [
  {
    title: "Understand",
    text: "Learn about the client’s business, goals, and operational challenges.",
  },
  {
    title: "Design",
    text: "Plan the user experience, structure, and visual direction.",
  },
  {
    title: "Build",
    text: "Develop the website or application using technologies appropriate to the project.",
  },
  {
    title: "Refine & Launch",
    text: "Test, improve, and prepare the solution for release.",
  },
] as const;

const fit = [
  "Small business owners launching or improving a website",
  "Service-based businesses that rely on inquiries and bookings",
  "Clients who value clarity, communication, and steady progress",
  "Teams ready to invest in their online presence without unnecessary complexity",
] as const;

export function AboutProcess() {
  return (
    <section className="about-process" aria-labelledby="about-process-heading">
      <div className="site-container">
        <h2 id="about-process-heading" className="about-section-title">
          How we approach projects
        </h2>
        <p className="about-lead">
          This is a general way of working. It is not a guarantee that every
          project follows the same stages.
        </p>
        <ol className="about-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="about-step-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>

        <h2 id="about-fit-heading" className="about-fit-title">
          Who I work best with
        </h2>
        <ul className="about-fit" aria-labelledby="about-fit-heading">
          {fit.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
