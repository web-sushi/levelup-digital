import type { ClientSection } from "@/content/projects/client-work";
import { ProjectImageGallery } from "@/components/portfolio/ProjectImageGallery";

export function ProjectFeatureSection({ section }: { section: ClientSection }) {
  const headingId = `client-${section.id}-heading`;

  return (
    <section className="client-band client-band-tight" aria-labelledby={headingId}>
      <div className="site-container">
        <div className="client-split">
          <div>
            <p className="client-index" aria-hidden="true">
              {section.index}
            </p>
            <h2 id={headingId}>{section.title}</h2>
          </div>
          <div>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
        <ProjectImageGallery images={section.images} />
      </div>
    </section>
  );
}
