type ProjectCustomizationProps = {
  paragraphs: string[];
};

export function ProjectCustomization({ paragraphs }: ProjectCustomizationProps) {
  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <section
      className="page-section page-section-surface"
      aria-labelledby="project-customization-heading"
    >
      <div className="site-container">
        <h2 id="project-customization-heading" className="page-section-title">
          Design &amp; customization
        </h2>
        <div className="page-prose case-study-prose">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
