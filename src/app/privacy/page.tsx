import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { PolicyReviewNote } from "@/components/ui/PolicyReviewNote";
import { verifiedContactLinks } from "@/lib/nav";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description: "Privacy Policy for LevelUp Digital.",
  path: "/privacy",
});

export default function PrivacyPage() {
  const businessEmail = verifiedContactLinks.email.replace(/^mailto:/, "");
  return (
    <>
      <PageHeader
        title="Privacy Policy"
        description="How LevelUp Digital handles information when you visit this site or get in touch."
      />

      <section className="page-section">
        <div className="site-container page-prose" style={{ maxWidth: "48rem" }}>
          <p>
            <strong>Last updated:</strong> 9 November 2026
          </p>

          <PolicyReviewNote>
            This page describes the site as it works today. It is not a legal
            certification. A review should confirm the privacy contact, any notices
            for visitors outside Japan, and a retention period before online
            inquiries are enabled.
          </PolicyReviewNote>

          <h2>Who we are</h2>
          <p>
            LevelUp Digital is a studio in Tokyo, Japan. Questions about this
            policy can be sent to{" "}
            <a href={verifiedContactLinks.email}>{businessEmail}</a>. That is the
            address published on the contact page. An older draft listed
            hello@levelupdigital.com. That address is not used on the current site.
          </p>

          <h2>Information the inquiry form asks for</h2>
          <p>
            The contact page includes a project inquiry. It asks for your name,
            email address, project type, budget range, and preferred timeline. You
            can also add a business name, a project description, and up to three
            website or design references, each with a link and an optional note.
          </p>
          <p>
            Online submission of that inquiry is not enabled. What you type stays
            in the browser and is not sent to LevelUp Digital or stored by this
            site. If you email or message us, we use that message to reply about
            the project. The form also asks you to acknowledge that a future
            submission would be used to reply. That acknowledgment is not consent
            for marketing email.
          </p>

          <h2>Inquiry delivery</h2>
          <p>
            The inquiry route is built to send mail through Brevo, a transactional
            email service. That public route is not accepting submissions. The
            public form does not send email to Brevo, and it does not send a
            confirmation to a visitor. A separate technical check confirmed that
            Brevo can accept a message addressed to the business mailbox. That
            check was not a customer inquiry and did not turn the public form on.
          </p>
          <p>
            This policy does not set a retention period for inquiry emails. Brevo
            and the mailbox provider may keep messages under their own settings.
            Those periods are an owner decision and are not stated here.
          </p>

          <h2>Abuse protection</h2>
          <p>
            The server code includes a rate limit and an idempotency marker stored
            in Upstash Redis. The public form does not use them while submissions
            are off. The marker is designed to store a hash of a client address and
            a hash of the submission, not the name, email address, or message, and
            to expire after seven days. That period applies to the marker only. It
            is not a retention period for emails or other inquiry information.
          </p>

          <h2>Analytics</h2>
          <p>
            This site can use Google Analytics 4, measurement ID G-8S5ZWSYC00, to
            understand how the site is used. Analytics is off until you accept it.
            Google Analytics is not an anonymous service. If you accept, this site
            loads Google&apos;s script and Google may process identifiers such as a
            client ID, pages you visit, and general device or browser information.
            Google&apos;s own privacy policy describes that processing.
          </p>
          <p>
            If you reject analytics, this site does not load the Google Analytics
            script, does not send analytics events, and does not create Google
            Analytics cookies. You can change the choice at any time with Privacy
            Preferences in the footer. The choice is saved in this browser under
            the local storage key <code>levelup.privacy.consent</code>. The record
            contains a version, whether analytics was accepted or rejected, and the
            time of the choice. It does not contain your name, email address, or
            inquiry.
          </p>
          <p>
            Accepting analytics can set first-party cookies such as <code>_ga</code>,{" "}
            <code>_gid</code>, and <code>_ga_8S5ZWSYC00</code>. If you withdraw an
            earlier acceptance, this site stops further analytics from this browser,
            deletes those first-party cookies where the browser allows it, and
            reloads the page so the script is not loaded again. Removing the script
            from the page does not, by itself, undo code Google has already run.
            Information already sent to Google is not deleted by this site.
          </p>
          <p>
            If this browser cannot save the choice, analytics stays off.
          </p>

          <h2>Other services</h2>
          <p>
            The site does not use advertising or marketing cookies. Social links
            leave this site only when you choose them. This policy does not name a
            hosting provider. If the site is deployed, the host may keep connection
            logs, which can include IP addresses. The host and any log retention
            period are an owner decision.
          </p>

          <h2>Your choices</h2>
          <p>You may:</p>
          <ul>
            <li>Accept or reject analytics, and change that choice from the footer</li>
            <li>Ask what personal information we hold about you</li>
            <li>Ask us to correct inaccurate information</li>
            <li>Ask us to delete personal information, subject to legal obligations</li>
          </ul>
          <p>
            LevelUp Digital is based in Japan and may receive inquiries from other
            countries. This page does not decide which privacy or cookie law applies
            to a particular visitor, and it is not a claim of compliance with the
            Act on the Protection of Personal Information or with laws outside Japan.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be
            posted on this page with an updated revision date.
          </p>

          <p style={{ marginTop: "2rem" }}>
            <Link href="/contact" className="focus-ring" style={{ color: "var(--color-accent-primary)" }}>
              Contact page
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
