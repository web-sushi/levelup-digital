import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Services",
  description:
    "Website builds, custom web applications, and related digital services from LevelUp Digital.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        title="Services"
        description="Structured website builds and custom digital products — scoped clearly, built for clarity and real business goals."
      >
        <Link href="/contact" className="page-link-button focus-ring">
          Start a project ↗
        </Link>
      </PageHeader>

      <section className="page-section">
        <div className="site-container">
          <h2 className="page-section-title">What you can expect</h2>
          <div className="page-benefits">
            <div className="page-benefit">
              <h3>Conversion-focused structure</h3>
              <p>Pages guide visitors toward meaningful actions, not dead ends.</p>
            </div>
            <div className="page-benefit">
              <h3>Mobile-first design</h3>
              <p>Layouts that work across phones, tablets, and desktops.</p>
            </div>
            <div className="page-benefit">
              <h3>Clear inquiry flow</h3>
              <p>Make it straightforward for people to reach you.</p>
            </div>
            <div className="page-benefit">
              <h3>Room to grow</h3>
              <p>Start with what you need now; extend features when it makes sense.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section page-section-surface">
        <div className="site-container">
          <h2 className="page-section-title">Who this works best for</h2>
          <p className="page-section-intro">
            A good fit if you value clarity, thoughtful structure, and steady
            progress — whether you need a marketing site or a more custom build.
          </p>
          <div className="page-grid-2">
            <div className="page-card">
              <h3>This works well if…</h3>
              <ul>
                <li>You want professional guidance from discovery through launch</li>
                <li>You care about design and practical outcomes</li>
                <li>You prefer a structured process without unnecessary jargon</li>
                <li>You are ready to invest in your online presence at a sustainable pace</li>
              </ul>
            </div>
            <div className="page-card">
              <h3>This may not be ideal if…</h3>
              <ul>
                <li>You need a decision based only on the lowest possible price</li>
                <li>You require constant unscoped design experiments every week</li>
                <li>You are not ready to align on goals, content, and timeline</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="business-websites" className="page-section">
        <div className="site-container">
          <h2 className="page-section-title">Website build levels</h2>
          <p className="page-section-intro">
            Starting prices below. Final scope, timeline, and deliverables are
            confirmed after discovery — especially for Standard and Pro work.
          </p>
          <div className="page-grid-3">
            <div className="page-card">
              <h3>Basic</h3>
              <p>
                A focused marketing site for businesses that need a clear online
                presence without unnecessary complexity.
              </p>
              <ul>
                <li>Core pages aligned to your offer</li>
                <li>Mobile-responsive layout</li>
                <li>Contact / inquiry path</li>
                <li>Foundational on-page SEO structure</li>
              </ul>
              <p className="page-card-price">
                <strong>From ¥50,000</strong>
              </p>
            </div>
            <div className="page-card">
              <h3>Standard</h3>
              <p>
                For businesses that need richer content, stronger visual polish,
                and additional functionality within a defined scope.
              </p>
              <ul>
                <li>Expanded page set and content sections</li>
                <li>Enhanced layout and component patterns</li>
                <li>Additional functionality agreed in discovery</li>
                <li>Broader SEO-ready structure</li>
              </ul>
              <p className="page-card-price">
                <strong>From ¥100,000</strong>
              </p>
            </div>
            <div className="page-card">
              <h3>Pro</h3>
              <p>
                Custom builds for growing businesses — scope, integrations, and
                complexity vary significantly by project.
              </p>
              <ul>
                <li>Custom features defined in discovery</li>
                <li>Integrations where required (quoted separately if needed)</li>
                <li>Analytics setup guidance (tooling depends on scope)</li>
                <li>Ongoing collaboration through launch</li>
              </ul>
              <p className="page-card-price">
                <strong>From ¥200,000</strong>
                <br />
                <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                  Final quote depends on project complexity, integrations, and
                  timeline.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="custom-web-applications" className="page-section page-section-surface">
        <div className="site-container">
          <h2 className="page-section-title">Custom web applications</h2>
          <p className="page-section-intro">
            Separate from fixed website packages. Capabilities are scoped per
            project — not all items below are included in the Pro starting price.
          </p>
          <ul id="booking-and-payments" className="page-prose">
            <li>Business websites and product-style web experiences</li>
            <li>Custom web applications</li>
            <li>Booking and reservation systems</li>
            <li>Payment integrations</li>
            <li>Administrative dashboards</li>
            <li>Database-backed applications</li>
            <li>Business workflow automation</li>
          </ul>
          <p className="page-prose">
            Discovery defines architecture, integrations, hosting, and maintenance
            expectations before a quote is finalized.
          </p>
        </div>
      </section>

      <section className="page-section">
        <div className="site-container">
          <h2 className="page-section-title">Typical deliverables</h2>
          <p className="page-section-intro">
            Exact deliverables depend on your package and scope. Common elements include:
          </p>
          <div className="page-grid-2">
            {[
              ["Responsive website", "Works across common device sizes."],
              ["Performance-conscious build", "Built with loading speed in mind."],
              ["Contact / inquiry paths", "Structured ways for visitors to reach you."],
              ["SEO-ready structure", "Semantic markup and sensible page structure."],
              ["Brand-aligned design", "Visual direction aligned to your identity within scope."],
              ["Launch handoff", "Guidance on managing content after launch where applicable."],
            ].map(([title, body]) => (
              <div className="page-card" key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="website-improvements" className="page-section page-section-surface">
        <div className="site-container">
          <h2 className="page-section-title">Optional add-ons</h2>
          <div className="page-grid-2">
            <div className="page-card">
              <h3>Maintenance &amp; updates</h3>
              <p>
                Keep your site secure and up to date with agreed update windows,
                content changes, and technical maintenance.
              </p>
            </div>
            <div className="page-card">
              <h3>SEO setup</h3>
              <p>
                Technical and on-page SEO improvements aligned to your market and
                content — not guaranteed ranking outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="site-container">
          <h2 className="page-section-title">How we work</h2>
          <ol className="page-prose">
            <li>
              <strong>Discovery</strong> — goals, audience, content, and constraints
            </li>
            <li>
              <strong>Build</strong> — design and development within agreed scope
            </li>
            <li>
              <strong>Review</strong> — feedback cycles within the project plan
            </li>
            <li>
              <strong>Launch</strong> — go-live and practical handoff
            </li>
          </ol>
          <Link href="/work" className="page-inline-cta page-inline-cta-secondary focus-ring">
            View concept demos
          </Link>
        </div>
      </section>
    </>
  );
}
