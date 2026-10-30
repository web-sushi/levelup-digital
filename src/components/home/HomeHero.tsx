import Link from "next/link";

const trustPoints = [
  "Mobile-first",
  "Clear inquiry flow",
  "SEO-ready structure",
] as const;

export function HomeHero() {
  return (
    <section className="home-hero" aria-labelledby="home-hero-heading">
      <div className="site-container home-hero-inner">
        <p className="home-eyebrow">Creative digital studio</p>
        <h1 id="home-hero-heading" className="home-hero-title">
          We build digital experiences that move businesses forward
        </h1>
        <p className="home-hero-lead">
          LevelUp Digital is a hands-on studio for website development, custom web
          applications, booking and payment integrations, and other business-focused
          digital solutions — scoped clearly so you know what you are getting.
        </p>
        <ul className="home-trust-list" aria-label="Build principles">
          {trustPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <div className="home-hero-actions">
          <Link href="/contact" className="page-link-button focus-ring">
            Start a Project
          </Link>
          <Link
            href="/work"
            className="page-link-button-secondary focus-ring home-hero-secondary"
          >
            Explore Our Work
          </Link>
        </div>
        <p className="home-hero-note">
          Start with a message on the contact page — email or WhatsApp.
        </p>
      </div>
    </section>
  );
}
