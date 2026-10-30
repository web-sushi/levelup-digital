import { verifiedContactLinks } from "@/lib/nav";

const prompts = [
  "Type of website or application",
  "Main business goal",
  "Desired timeline",
  "Approximate budget, if known",
] as const;

/**
 * Static project introduction. LS-08 replaces the contents of
 * `.contact-inquiry-slot` with the inquiry wizard.
 */
export function ContactProjectIntro() {
  return (
    <section className="contact-band contact-band-surface" aria-labelledby="contact-project-heading">
      <div className="site-container contact-project">
        <div className="contact-project-copy">
          <h2 id="contact-project-heading" className="contact-heading">
            Tell us what you&apos;re building.
          </h2>
          <p className="contact-lead">
            You can reach LevelUp Digital through the direct channels on this
            page. Email is the simplest way to start. You do not need every
            detail figured out yet.
          </p>
        </div>
        <div className="contact-inquiry-slot">
          <p className="contact-slot-label">Useful details, if you have them</p>
          <ul>
            {prompts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <a href={verifiedContactLinks.email} className="page-link-button focus-ring">
            Email your project idea ↗
          </a>
        </div>
      </div>
    </section>
  );
}
