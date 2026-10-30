import Link from "next/link";

export function HomeClosingCta() {
  return (
    <section className="page-section page-section-surface home-closing" aria-labelledby="home-cta-heading">
      <div className="site-container home-closing-inner">
        <h2 id="home-cta-heading" className="page-section-title">
          Have something in mind? Let&apos;s build it.
        </h2>
        <p className="page-section-intro">
          Share your goals through the contact page — email or WhatsApp. We can
          discuss scope, timeline, and whether a website package or custom build
          fits best.
        </p>
        <Link href="/contact" className="page-link-button focus-ring">
          Start a Project
        </Link>
      </div>
    </section>
  );
}
