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
            A legal review should still confirm the privacy contact, any regional
            notices, and a retention period before online inquiries are enabled.
            This page does not state a retention period, because this site does not
            currently store inquiry submissions.
          </PolicyReviewNote>

          <h2>Introduction</h2>
          <p>
            LevelUp Digital (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is
            committed to protecting your privacy. This Privacy Policy explains how
            we collect, use, and safeguard your information when you visit our
            website or contact us.
          </p>

          <h2>Information we collect</h2>
          <p>
            The contact page includes a project inquiry. It asks for a project type,
            a budget range, a preferred timeline, your name, and your email address.
            You can also add a business name, a project description, and up to three
            website or design references, each with a link and an optional note.
          </p>
          <p>
            Online submission of that inquiry is not enabled. What you type in the
            form stays in the browser and is not sent or stored by this site. If
            submission is enabled later, the server is designed to email those
            details so LevelUp Digital can reply about that inquiry. The
            acknowledgment on the form covers that reply. It is not consent to
            marketing email.
          </p>

          <h2>How we use your information</h2>
          <p>We use inquiry information to:</p>
          <ul>
            <li>Respond to an inquiry you choose to send</li>
            <li>Communicate with you about that project</li>
          </ul>

          <h2>Analytics</h2>
          <p>
            This site uses Google Analytics (measurement ID G-8S5ZWSYC00) to
            understand aggregated traffic and usage. Google&apos;s policies apply to
            how that service processes data.
          </p>
          <PolicyReviewNote>
            Confirm whether analytics consent or regional disclosures are required
            for your audience (e.g. Japan / international visitors).
          </PolicyReviewNote>

          <h2>Data protection</h2>
          <p>
            We take reasonable measures to protect personal information. However, no
            method of transmission over the internet is completely secure.
          </p>

          <h2>Third-party services</h2>
          <p>
            This site does not use Netlify Forms. The inquiry route is built to send
            mail through Brevo&apos;s transactional email service from the server.
            That connection is not active, and the public form does not send email.
            If it is turned on later, Brevo would process the inquiry in order to
            deliver the message. This policy does not set a retention period for
            those messages.
          </p>

          <h2>Your rights</h2>
          <p>You may request to:</p>
          <ul>
            <li>Access personal information we hold about you</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your personal information, subject to legal obligations</li>
          </ul>

          <h2>Contact us</h2>
          <p>
            Questions about this policy can be sent to{" "}
            <a href={verifiedContactLinks.email}>{businessEmail}</a>, the
            address published on the contact page. An older draft listed
            hello@levelupdigital.com. That address is not published on the
            current site.
          </p>
          <PolicyReviewNote>
            A legal review should confirm that this is the right privacy contact
            before online inquiries are enabled.
          </PolicyReviewNote>

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
