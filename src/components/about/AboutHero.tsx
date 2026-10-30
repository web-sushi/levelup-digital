export function AboutHero() {
  return (
    <section className="about-hero" aria-labelledby="about-heading">
      <div className="site-container">
        <p className="about-kicker">
          About LevelUp
          <span aria-hidden="true"> / 2026</span>
        </p>
        <h1 id="about-heading" className="about-hero-title">
          <span>Independent by design.</span>
          <span className="about-hero-accent">Built for real businesses.</span>
        </h1>
        <p className="about-lead">
          LevelUp Digital creates business websites and custom web applications
          for small businesses and online entrepreneurs. The work stays practical:
          clear pages, structured systems, and tools that help a business move
          forward.
        </p>
      </div>
    </section>
  );
}
