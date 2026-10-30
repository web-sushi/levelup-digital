import Link from "next/link";

function HeroShift() {
  return (
    <svg
      className="home-hero-art"
      viewBox="0 0 360 460"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="18" y="340" width="42" height="120" fill="#151515" />
      <rect x="78" y="268" width="46" height="192" fill="#2A2A2A" />
      <rect x="142" y="186" width="50" height="274" fill="#FFFFFF" />
      <rect x="210" y="96" width="54" height="364" fill="#FFFFFF" />
      <rect x="282" y="12" width="60" height="448" fill="#00F050" />
    </svg>
  );
}

export function HomeHero() {
  return (
    <section className="home-hero" aria-labelledby="home-hero-heading">
      <div className="site-container home-hero-grid">
        <h1 id="home-hero-heading" className="home-hero-title">
          <span className="home-hero-line">
            We don&apos;t
            <span className="home-hero-gap"> </span>
            <br className="home-hero-br" />
            just build.
          </span>
          <span className="home-hero-line home-hero-line-accent">We level up.</span>
        </h1>
        <div className="home-hero-copy">
          <p className="home-hero-lead">
            Websites, custom web applications, booking systems, payment
            integrations, and other business-focused digital solutions, scoped
            clearly so you know what you are getting.
          </p>
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
        </div>
        <HeroShift />
      </div>
    </section>
  );
}
