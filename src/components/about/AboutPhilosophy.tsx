const values = [
  {
    title: "Clarity",
    text: "Clear communication, straightforward processes, and interfaces that do not confuse visitors.",
  },
  {
    title: "Reliability",
    text: "Delivering what was agreed, with steady progress and consistent quality.",
  },
  {
    title: "Growth",
    text: "Continuous learning for myself and practical improvements for the businesses I work with.",
  },
] as const;

export function AboutPhilosophy() {
  return (
    <section className="about-philosophy" aria-labelledby="about-philosophy-heading">
      <div className="site-container">
        <h2 id="about-philosophy-heading" className="about-philosophy-title">
          <span>Good design gets attention.</span>
          <span className="about-philosophy-accent">Good systems get things done.</span>
        </h2>
        <p className="about-lead">
          An effective website should do more than look attractive. It should help
          customers discover services, submit enquiries, make bookings, or complete
          the tasks a business actually needs. The portfolio is built that way:
          presentation, and the system behind it.
        </p>
        <ul className="about-values">
          {values.map((value) => (
            <li key={value.title}>
              <h3>{value.title}</h3>
              <p>{value.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
