export function ContactHero() {
  return (
    <section className="contact-hero" aria-labelledby="contact-heading">
      <div className="site-container">
        <p className="contact-kicker">
          Contact <span aria-hidden="true">/ LevelUp Digital</span>
        </p>
        <h1 id="contact-heading" className="contact-hero-title">
          <span>Got a project?</span>
          <span className="contact-accent">Let&apos;s make it happen.</span>
        </h1>
        <p className="contact-lead">
          Whether you&apos;re launching a new business website or planning a custom
          web application, let&apos;s talk about what you&apos;re building.
        </p>
      </div>
    </section>
  );
}
