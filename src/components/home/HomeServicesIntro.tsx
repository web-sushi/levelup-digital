import Link from "next/link";
import { homepageServiceOverview } from "@/content/homepage";

export function HomeServicesIntro() {
  return (
    <section className="page-section" aria-labelledby="home-services-heading">
      <div className="site-container">
        <h2 id="home-services-heading" className="page-section-title">
          What we build
        </h2>
        <p className="page-section-intro">
          From marketing websites to custom applications — each engagement is scoped
          in discovery. Fixed website packages cover defined marketing-site work;
          applications, integrations, and add-ons are quoted separately when needed.
        </p>
        <ul className="home-service-grid">
          {homepageServiceOverview.map((service) => (
            <li key={service.title} className="page-card">
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </li>
          ))}
        </ul>
        <Link href="/services" className="page-inline-cta page-inline-cta-secondary focus-ring">
          View services &amp; pricing
        </Link>
      </div>
    </section>
  );
}
