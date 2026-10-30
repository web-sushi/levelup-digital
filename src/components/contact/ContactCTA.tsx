import Link from "next/link";

export function ContactCTA() {
  return (
    <section className="contact-close" aria-labelledby="contact-cta-heading">
      <div className="site-container">
        <h2 id="contact-cta-heading" className="contact-close-title">
          <span>Still exploring?</span>
          <span className="contact-accent">See what we build.</span>
        </h2>
        <p className="contact-lead">
          If you are not ready to write yet, the work and services pages show the
          kinds of websites and applications LevelUp Digital builds.
        </p>
        <div className="contact-actions">
          <Link href="/work" className="page-link-button focus-ring">
            Explore our work ↗
          </Link>
          <Link href="/services" className="page-link-button-secondary focus-ring">
            View services ↗
          </Link>
        </div>
      </div>
    </section>
  );
}
