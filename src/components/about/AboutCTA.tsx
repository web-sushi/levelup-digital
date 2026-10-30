import Link from "next/link";

export function AboutCTA() {
  return (
    <section className="about-close" aria-labelledby="about-cta-heading">
      <div className="site-container">
        <h2 id="about-cta-heading" className="about-close-title">
          <span>Have something in mind?</span>
          <span className="about-hero-accent">Let&apos;s build it.</span>
        </h2>
        <p className="about-lead">
          If you have a website or application idea, the contact page is the place
          to talk it through. You can reach LevelUp Digital by email, WhatsApp, or
          the listed social channels.
        </p>
        <div className="about-actions">
          <Link href="/contact" className="page-link-button focus-ring">
            Start a project ↗
          </Link>
          <Link href="/work" className="page-link-button-secondary focus-ring">
            Explore our work ↗
          </Link>
        </div>
      </div>
    </section>
  );
}
