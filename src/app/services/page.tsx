import Link from "next/link";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Services",
  description:
    "Website builds, custom web applications, and related digital services from LevelUp Digital.",
  path: "/services",
});

const expectations = [
  ["Conversion-focused structure", "Pages guide visitors toward meaningful actions, not dead ends."],
  ["Mobile-first design", "Layouts that work across phones, tablets, and desktops."],
  ["Clear inquiry flow", "Make it straightforward for people to reach you."],
  ["Room to grow", "Start with what you need now; extend features when it makes sense."],
] as const;

const customCapabilities = [
  "Business websites and product-style web experiences",
  "Custom web applications",
  "Administrative dashboards",
  "Database-backed applications",
  "Business workflow automation",
] as const;

const bookingCapabilities = [
  "Booking and reservation systems",
  "Payment integrations",
] as const;

const packages = [
  {
    name: "Basic",
    summary:
      "A focused marketing site for businesses that need a clear online presence without unnecessary complexity.",
    includes: [
      "Core pages aligned to your offer",
      "Mobile-responsive layout",
      "Contact / inquiry path",
      "Foundational on-page SEO structure",
    ],
    price: "From ¥50,000",
    note: null,
  },
  {
    name: "Standard",
    summary:
      "For businesses that need richer content, stronger visual polish, and additional functionality within a defined scope.",
    includes: [
      "Expanded page set and content sections",
      "Enhanced layout and component patterns",
      "Additional functionality agreed in discovery",
      "Broader SEO-ready structure",
    ],
    price: "From ¥100,000",
    note: null,
  },
  {
    name: "Pro",
    summary:
      "Custom builds for growing businesses. Scope, integrations, and complexity vary significantly by project.",
    includes: [
      "Custom features defined in discovery",
      "Integrations where required (quoted separately if needed)",
      "Analytics setup guidance (tooling depends on scope)",
      "Ongoing collaboration through launch",
    ],
    price: "From ¥200,000",
    note: "Final quote depends on project complexity, integrations, and timeline.",
  },
] as const;

const deliverables = [
  ["Responsive website", "Works across common device sizes."],
  ["Performance-conscious build", "Built with loading speed in mind."],
  ["Contact / inquiry paths", "Structured ways for visitors to reach you."],
  ["SEO-ready structure", "Semantic markup and sensible page structure."],
  ["Brand-aligned design", "Visual direction aligned to your identity within scope."],
  ["Launch handoff", "Guidance on managing content after launch where applicable."],
] as const;

const goodFit = [
  "You want professional guidance from discovery through launch",
  "You care about design and practical outcomes",
  "You prefer a structured process without unnecessary jargon",
  "You are ready to invest in your online presence at a sustainable pace",
] as const;

const poorFit = [
  "You need a decision based only on the lowest possible price",
  "You require constant unscoped design experiments every week",
  "You are not ready to align on goals, content, and timeline",
] as const;

const steps = [
  ["01", "Discovery", "Goals, audience, content, and constraints"],
  ["02", "Build", "Design and development within agreed scope"],
  ["03", "Review", "Feedback cycles within the project plan"],
  ["04", "Launch", "Go-live and practical handoff"],
] as const;

export default function ServicesPage() {
  return (
    <>
      <section className="services-hero" aria-labelledby="services-heading">
        <div className="site-container services-hero-grid">
          <div>
            <p className="services-kicker">
              What we do <span aria-hidden="true">/ 01</span>
            </p>
            <h1 id="services-heading" className="services-hero-title">
              <span>Digital solutions.</span>
              <span className="services-hero-accent">Built to move you forward.</span>
            </h1>
          </div>
          <div className="services-hero-copy">
            <p>
              Business websites, custom web applications, booking systems, payment
              integrations, and related development services. Structured website
              builds and custom digital products are scoped clearly and built for
              clarity and real business goals.
            </p>
            <Link href="/contact" className="page-link-button focus-ring">
              Start a project
            </Link>
          </div>
        </div>
      </section>

      <section className="services-expect" aria-labelledby="services-expect-heading">
        <div className="site-container">
          <h2 id="services-expect-heading" className="services-label">
            What you can expect
          </h2>
          <ul className="services-expect-list">
            {expectations.map(([title, body]) => (
              <li key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="business-websites" className="services-band">
        <div className="site-container">
          <div className="services-category">
            <p className="services-index" aria-hidden="true">
              01
            </p>
            <div>
              <h2 className="services-title">Business websites</h2>
              <p className="services-lead">
                Structured marketing sites with clear pages, mobile-responsive
                layouts, and inquiry paths, scoped through Basic, Standard, or Pro
                build levels.
              </p>
              <p className="services-lead">
                Starting prices below. Final scope, timeline, and deliverables are
                confirmed after discovery, especially for Standard and Pro work.
              </p>
            </div>
          </div>

          <p id="website-build-levels" className="services-subhead">
            Website build levels
          </p>
          <ul className="services-packages">
            {packages.map((tier) => (
              <li key={tier.name} className="services-package">
                <h3>{tier.name}</h3>
                <p>{tier.summary}</p>
                <ul>
                  {tier.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="services-package-foot">
                  <p className="services-price">{tier.price}</p>
                  {tier.note ? <p className="services-price-note">{tier.note}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="services-band services-band-surface" aria-labelledby="services-deliverables-heading">
        <div className="site-container">
          <h2 id="services-deliverables-heading" className="services-title">
            Typical deliverables
          </h2>
          <p className="services-lead">
            Exact deliverables depend on your package and scope. Common elements
            include:
          </p>
          <ul className="services-deliverables">
            {deliverables.map(([title, body]) => (
              <li key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="custom-web-applications"
        className="services-band services-prominent"
        aria-labelledby="services-custom-heading"
      >
        <div className="site-container">
          <div className="services-category">
            <p className="services-index" aria-hidden="true">
              02
            </p>
            <div>
              <h2 id="services-custom-heading" className="services-title">
                Custom web applications
              </h2>
              <p className="services-lead">
                Separate from fixed website packages. Capabilities are scoped per
                project. Not all items below are included in the Pro starting price.
              </p>
              <ul className="services-capabilities">
                {customCapabilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="services-lead">
                Booking and reservation systems and payment integrations are part of
                this custom work. They follow the same terms and are listed in the
                next section.
              </p>
              <p className="services-lead">
                Discovery defines architecture, integrations, hosting, and
                maintenance expectations before a quote is finalized.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="booking-and-payments" className="services-band services-band-surface">
        <div className="site-container">
          <div className="services-category">
            <p className="services-index" aria-hidden="true">
              03
            </p>
            <div>
              <span className="services-rule" aria-hidden="true" />
              <h2 className="services-title">Booking and payment systems</h2>
              <p className="services-lead">
                Booking and reservation systems and payment integrations are custom
                application capabilities. They are separate from fixed website
                packages, scoped per project, and are not included in the Basic,
                Standard, or Pro website packages.
              </p>
              <ul className="services-capabilities">
                {bookingCapabilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="website-improvements" className="services-band">
        <div className="site-container">
          <div className="services-category">
            <p className="services-index" aria-hidden="true">
              04
            </p>
            <div>
              <h2 className="services-title">Website improvements and maintenance</h2>
              <p className="services-lead">
                Optional add-ons, or standalone engagements, depending on need.
              </p>
              <ul className="services-split">
                <li>
                  <h3>Maintenance &amp; updates</h3>
                  <p>
                    Keep your site secure and up to date with agreed update windows,
                    content changes, and technical maintenance.
                  </p>
                </li>
                <li>
                  <h3>SEO setup</h3>
                  <p>
                    Technical and on-page SEO improvements aligned to your market and
                    content. These are not guaranteed ranking outcomes.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="services-band services-band-surface" aria-labelledby="services-fit-heading">
        <div className="site-container">
          <h2 id="services-fit-heading" className="services-title">
            Who this works best for
          </h2>
          <p className="services-lead">
            A good fit if you value clarity, thoughtful structure, and steady
            progress, whether you need a marketing site or a more custom build.
          </p>
          <div className="services-fit">
            <div>
              <h3>This works well if…</h3>
              <ul>
                {goodFit.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>This may not be ideal if…</h3>
              <ul>
                {poorFit.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="services-band" aria-labelledby="services-process-heading">
        <div className="site-container">
          <h2 id="services-process-heading" className="services-title">
            How we work
          </h2>
          <ol className="services-steps">
            {steps.map(([index, title, body]) => (
              <li key={title}>
                <span className="services-step-index" aria-hidden="true">
                  {index}
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
          <Link href="/work" className="page-inline-cta page-inline-cta-secondary focus-ring">
            View concept demos
          </Link>
        </div>
      </section>

      <section className="services-close" aria-labelledby="services-close-heading">
        <div className="site-container services-close-grid">
          <h2 id="services-close-heading" className="services-close-title">
            Ready to build something better?
          </h2>
          <div>
            <p>
              Share your business goals and project requirements. Reach out from the
              contact page by email or WhatsApp.
            </p>
            <Link href="/contact" className="page-link-button focus-ring">
              Start a project
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
