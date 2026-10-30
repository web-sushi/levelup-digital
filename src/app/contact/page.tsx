import { ContactDirectMethods } from "@/components/contact/ContactDirectMethods";
import { PageHeader } from "@/components/ui/PageHeader";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Contact",
  description:
    "Contact LevelUp Digital directly by email, WhatsApp, or social channels.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Contact"
        description="Reach out directly while the new inquiry experience is being built. You do not need every detail figured out yet."
      />

      <section className="page-section">
        <div className="site-container contact-layout">
          <div>
            <h2 className="page-section-title">Direct contact</h2>
            <p className="page-section-intro">
              Prefer a conversation before a formal brief? Use the channels below.
              I personally review messages and usually respond within a few business
              days.
            </p>
            <ContactDirectMethods />
            <p className="page-prose" style={{ marginTop: "1rem" }}>
              Looking forward to it.
            </p>
          </div>

          <div
            className="inquiry-placeholder"
            aria-labelledby="inquiry-future-heading"
          >
            <h2 id="inquiry-future-heading">Project inquiry (coming soon)</h2>
            <p>
              A low-typing, step-by-step inquiry flow will live here — covering
              project type, budget, timeline, contact details, optional notes, and
              review before submit.
            </p>
            <p>
              Submissions will be handled server-side with validation, spam
              protection, and email delivery through Brevo (business notification
              plus customer confirmation). That integration is not active on this
              site yet.
            </p>
            <p>
              Reserved component path for a future phase:{" "}
              <code>src/components/contact/InquiryWizard.tsx</code>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
