import Link from "next/link";

const capabilities = [
  {
    title: "Business Websites",
    text: "Responsive websites for service businesses, with clear pages and a straightforward way for people to get in touch.",
    href: "/services#business-websites",
  },
  {
    title: "Custom Web Applications",
    text: "Business-specific applications, dashboards, and tools shaped around how the work actually runs.",
    href: "/services#custom-web-applications",
  },
  {
    title: "Booking & Payment Systems",
    text: "Booking workflows, checkout experiences, and payment integrations where a project needs them.",
    href: "/services#booking-and-payments",
  },
  {
    title: "Business Operations",
    text: "Administrative interfaces for bookings, enquiries, quotations, and day-to-day management. Some of this work is live. Some backend areas are still in development.",
    href: "/work",
  },
] as const;

export function AboutCapabilities() {
  return (
    <section className="about-capabilities" aria-labelledby="about-capabilities-heading">
      <div className="site-container">
        <h2 id="about-capabilities-heading" className="about-section-title">
          What we build
        </h2>
        <p className="about-lead">
          These are the kinds of digital solutions already represented in the
          studio&apos;s work. Scope still depends on the project.
        </p>
        <ol className="about-cap-list">
          {capabilities.map((item, index) => (
            <li key={item.title}>
              <Link href={item.href} className="about-cap-link focus-ring">
                <span className="about-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="about-cap-copy">
                  <h3 className="about-cap-title">{item.title}</h3>
                  <span className="about-cap-text">{item.text}</span>
                </span>
                <span className="about-cap-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
