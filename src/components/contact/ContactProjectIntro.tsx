import { ProjectInquiryWizard } from "@/components/contact/ProjectInquiryWizard";
import { publicInquirySubmissionsAvailable } from "@/lib/inquiries/public-availability";

export function ContactProjectIntro() {
  return (
    <section className="contact-band contact-band-surface" aria-labelledby="contact-project-heading">
      <div className="site-container contact-project">
        <div className="contact-project-copy">
          <h2 id="contact-project-heading" className="contact-heading">
            Tell us what you&apos;re building.
          </h2>
          <p className="contact-lead">
            Answer a few questions about the project. Nothing you type is sent or
            saved. Email, WhatsApp, and the social links further down the page
            still work if you would rather write directly.
          </p>
        </div>
        <div className="contact-inquiry-slot">
          <ProjectInquiryWizard submissionsAvailable={publicInquirySubmissionsAvailable} />
        </div>
      </div>
    </section>
  );
}
