import Link from "next/link";

export function HomeClosingCta() {
  return (
    <section className="home-closing" aria-labelledby="home-cta-heading">
      <div className="site-container home-closing-inner">
        <h2 id="home-cta-heading" className="home-closing-title">
          <span>Have something in mind?</span>
          <span>Let&apos;s build it.</span>
        </h2>
        <p>
          Share your goals through the contact page — email or WhatsApp. We can
          discuss scope, timeline, and whether a website package or custom build
          fits best.
        </p>
        <Link href="/contact" className="home-closing-button focus-ring">
          Start a Project
        </Link>
      </div>
    </section>
  );
}
