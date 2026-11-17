import Link from "next/link";
import { ProjectInquiryWizard } from "@/components/contact/ProjectInquiryWizard";
import { resolvePublicInquirySubmissionsAvailable } from "@/lib/inquiries/readiness";
import type { PortfolioReference } from "@/lib/portfolio-reference";

type ContactProjectIntroProps = {
  reference?: PortfolioReference | null;
};

export function ContactProjectIntro({ reference = null }: ContactProjectIntroProps) {
  const submissionsAvailable = resolvePublicInquirySubmissionsAvailable();
  return (
    <section className="contact-band contact-band-surface" aria-labelledby="contact-project-heading">
      <div className="site-container contact-project">
        <div className="contact-project-copy">
          <h2 id="contact-project-heading" className="contact-heading">
            Tell us what you&apos;re building.
          </h2>
          <p className="contact-lead">
            {submissionsAvailable
              ? "Answer a few questions about the project, then send the inquiry from the last step. Email, WhatsApp, and the social links further down the page still work if you would rather write directly."
              : "Answer a few questions about the project. Nothing you type is sent or saved. Email, WhatsApp, and the social links further down the page still work if you would rather write directly."}
          </p>
          {reference ? (
            <p className="contact-lead">
              You were looking at{" "}
              <Link href={reference.path} className="focus-ring">
                {reference.title}
              </Link>
              . Choose the project type that fits what you want to build.
            </p>
          ) : null}
        </div>
        <div className="contact-inquiry-slot">
          <ProjectInquiryWizard submissionsAvailable={submissionsAvailable} />
        </div>
      </div>
    </section>
  );
}
