type ProjectOverviewProps = {
  overview: string;
  category: string;
  tier: string;
};

export function ProjectOverview({ overview, category, tier }: ProjectOverviewProps) {
  return (
    <section className="concept-study-band concept-study-band-surface" aria-labelledby="project-overview-heading">
      <div className="site-container concept-study-overview">
        <div>
          <h2 id="project-overview-heading" className="concept-study-heading">
            Project overview
          </h2>
          <p className="concept-study-lead">{overview}</p>
        </div>
        <dl className="concept-study-facts">
          <div>
            <dt>Category</dt>
            <dd>{category}</dd>
          </div>
          <div>
            <dt>Tier</dt>
            <dd>{tier}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
