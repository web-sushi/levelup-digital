import Link from "next/link";

export function ProjectCTA() {
  return (
    <section className="concept-study-close" aria-labelledby="project-cta-heading">
      <div className="site-container">
        <h2 id="project-cta-heading" className="concept-study-close-title">
          <span>Like the direction?</span>
          <span className="concept-study-accent">Let&apos;s build your version.</span>
        </h2>
        <p>
          These concepts demonstrate design and development possibilities. A real
          project is scoped around each business&apos;s requirements.
        </p>
        <div className="concept-study-actions">
          <Link href="/contact" className="page-link-button focus-ring">
            Start a project ↗
          </Link>
          <Link href="/work" className="page-link-button-secondary focus-ring">
            Explore all work ↗
          </Link>
        </div>
      </div>
    </section>
  );
}
