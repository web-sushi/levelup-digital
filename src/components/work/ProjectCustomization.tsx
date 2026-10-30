type ProjectCustomizationProps = {
  paragraphs: string[];
};

export function ProjectCustomization({ paragraphs }: ProjectCustomizationProps) {
  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <section className="concept-study-band" aria-labelledby="project-customization-heading">
      <div className="site-container concept-study-custom">
        <h2 id="project-customization-heading" className="concept-study-heading">
          Design &amp; customization
        </h2>
        <div className="concept-study-prose">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
