import Link from "next/link";
import { homepageServiceOverview } from "@/content/homepage";

export function HomeServicesIntro() {
  return (
    <section className="home-services" aria-labelledby="home-services-heading">
      <div className="site-container">
        <h2 id="home-services-heading" className="home-section-title">
          What we build
        </h2>
        <p className="home-section-lead">
          From marketing websites to custom applications — each engagement is
          scoped in discovery. Fixed website packages cover defined marketing-site
          work; applications, integrations, and add-ons are quoted separately when
          needed.
        </p>
        <ol className="home-service-list">
          {homepageServiceOverview.map((service, index) => (
            <li key={service.title}>
              <Link href={service.href} className="home-service-row focus-ring">
                <span className="home-service-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="home-service-copy">
                  <h3 className="home-service-title">{service.title}</h3>
                  <p className="home-service-description">{service.description}</p>
                </div>
                <span className="home-service-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <Link href="/services" className="page-inline-cta page-inline-cta-secondary focus-ring">
          View services and pricing
        </Link>
      </div>
    </section>
  );
}
