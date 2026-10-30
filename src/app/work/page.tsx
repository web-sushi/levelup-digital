import Link from "next/link";
import { ConceptProjectCard } from "@/components/work/ConceptProjectCard";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getClientProjects,
  getConceptProjects,
  groupProjectsByCategory,
} from "@/content/projects/projects";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Work",
  description:
    "Concept Lab demos and client project space for LevelUp Digital.",
  path: "/work",
});

export default function WorkPage() {
  const clientProjects = getClientProjects();
  const conceptProjects = getConceptProjects();
  const grouped = groupProjectsByCategory(conceptProjects);

  return (
    <>
      <PageHeader
        title="Work"
        description="Explore concept demos that show how different industries and build levels can be structured online. Client case studies will appear here when verified project details are available."
      />

      <section className="page-section">
        <div className="site-container">
          <h2 className="page-section-title">Client projects</h2>
          <p className="page-section-intro">
            Published work for real clients appears here with owner-approved
            details. The repository does not currently include verified client
            case studies to migrate.
          </p>
          {clientProjects.length === 0 ? (
            <div className="page-empty-state" role="status">
              No client projects are listed yet. Concept demos below are
              illustrative builds hosted externally — not live client engagements.
            </div>
          ) : (
            <ul className="concept-grid">
              {clientProjects.map((project) => (
                <li key={project.slug}>
                  <ConceptProjectCard project={project} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="page-section page-section-surface">
        <div className="site-container">
          <h2 className="page-section-title">Concept Lab</h2>
          <p className="page-section-intro">
            Eleven interactive demos across niches and build tiers (Basic,
            Standard, Pro). Open a case study for structure and details, then
            follow through to the external GitHub Pages demo — not a production
            client URL.
          </p>
          {Object.entries(grouped).map(([category, projects]) => (
            <div key={category} style={{ marginTop: "2.5rem" }}>
              <h3 className="page-section-title" style={{ fontSize: "1.25rem" }}>
                {category}
              </h3>
              <ul className="concept-grid" style={{ marginTop: "1rem" }}>
                {projects.map((project) => (
                  <li key={project.slug}>
                    <ConceptProjectCard project={project} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="page-section">
        <div className="site-container">
          <p className="page-prose">
            Interested in a similar structure for your business?{" "}
            <Link href="/contact" className="focus-ring" style={{ color: "var(--color-accent-primary)" }}>
              Get in touch
            </Link>{" "}
            or review{" "}
            <Link href="/services" className="focus-ring" style={{ color: "var(--color-accent-primary)" }}>
              services and pricing
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
