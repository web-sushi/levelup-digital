import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
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
            <strong>Last updated:</strong> 13 November 2026
          </p>

          <h2>Who we are</h2>
          <p>
            LevelUp Digital is a studio in Tokyo, Japan. Questions about this
            policy, and requests for access, correction, or deletion, can be sent
            to <a href={verifiedContactLinks.email}>{businessEmail}</a>. That is
            the address published on the contact page. An older draft listed
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
            The form can be switched off. While it is off, what you type stays in
            this browser and is not sent to LevelUp Digital or stored by this
            site. While it is on, the server uses the inquiry to reply about the
            project, as described below. The form asks you to acknowledge that a
            submission would be used to reply. That acknowledgment is not consent
            for marketing email, and it is separate from the analytics choice in
            the footer.
          </p>

          <h2>Inquiry delivery</h2>
          <p>
            When online submission is on, the server sends the inquiry through
            Brevo, a transactional email service. It notifies the business mailbox
            first and then sends the visitor a transactional acknowledgement. The
            site can tell the visitor the inquiry was accepted only after Brevo
            accepts the business notification. A timeout or a lost response is not
            treated as a second send and is not described as delivered. The
            acknowledgement is a reply to the inquiry. It does not add the visitor
            to a marketing list.
          </p>
          <p>
            LevelUp Digital keeps that correspondence in {businessEmail} for 12
            months after the last meaningful reply about the inquiry, unless a
            contract or a legal obligation requires longer. A meaningful reply is
            a message about the project, not an automated receipt. There is no
            automatic deletion in the mailbox. The studio reviews that mailbox at
            least monthly and deletes inquiry threads that have passed the period,
            unless a contract, invoice, tax record, or legal obligation is the
            reason to keep them.
          </p>
          <p>
            Deleting a message from that mailbox does not delete the copy in the
            sender&apos;s own mailbox. It also does not delete a Brevo log or a
            Redis record. Those follow the separate periods below.
          </p>

          <h2>Abuse protection</h2>
          <p>
            While submissions are off, the public form does not use the rate limit
            or the idempotency marker. When submissions are on, the server allows
            five attempts an hour for one client. The client identity is the
            platform-supplied address, stored only as a hash. If that address is
            missing, the request is refused. The inquiry handler does not write
            the raw address, the name, the email address, or the message to its
            logs.
          </p>
          <p>
            The rate-limit record is a count for that hashed address. It is kept
            for about one hour. The idempotency marker stores a hash of the
            submission, a hash of the idempotency key, and a short result such as
            accepted or unknown. It does not store the message text. The hash is
            calculated from the inquiry, so it is a fingerprint rather than a copy
            of what was typed. The marker expires after seven days. That period
            applies to the marker only. It is not the retention period for emails.
          </p>
          <p>
            Those records are kept in Upstash Redis in AWS us-east-1 (N. Virginia).
            If Redis is unavailable, or if the database&apos;s monthly budget stops
            it, the request is refused. The site does not skip the check and does
            not tell the visitor the inquiry was delivered.
          </p>

          <h2>Analytics</h2>
          <p>
            This site can use Google Analytics 4, measurement ID G-8S5ZWSYC00, to
            understand how the site is used. Analytics is off until you accept it.
            Accepting or rejecting analytics is separate from sending a project
            inquiry. Google Analytics is not an anonymous service. If you accept,
            this site loads Google&apos;s script and Google may process identifiers
            such as a client ID, pages you visit, and general device or browser
            information. Google&apos;s own privacy policy describes that processing.
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

          <h2>Where information is processed</h2>
          <p>
            The site is hosted by Vercel. The inquiry function runs in Vercel&apos;s
            US East region. Vercel may keep connection and runtime logs, which can
            include IP addresses, for the retention period of the current plan.
            Vercel&apos;s published documentation describes one hour of runtime logs
            on Hobby and one day on Pro. This page does not state which plan
            applies.
          </p>
          <p>
            Brevo sends the business notification and the visitor acknowledgement.
            This account keeps transactional logs for one month and does not store
            message previews. Brevo&apos;s published description places that
            processing in the European Union. That sentence reports Brevo&apos;s
            description. It is not an independent audit of Brevo&apos;s systems.
          </p>
          <p>
            The studio and the business mailbox are in Japan. Inquiry functions and
            the Redis records above run in the United States. Brevo&apos;s published
            processing locations are in the European Union. This is a description
            of where these services run. It is not a claim that a particular
            transfer mechanism, or a privacy law in Japan or elsewhere, has been
            satisfied.
          </p>
          <p>
            The site does not use advertising or marketing cookies. Social links
            leave this site only when you choose them.
          </p>

          <h2>Your choices</h2>
          <p>You may:</p>
          <ul>
            <li>Accept or reject analytics, and change that choice from the footer</li>
            <li>Ask what personal information we hold about you</li>
            <li>Ask us to correct inaccurate information</li>
            <li>
              Ask us to delete personal information, subject to a contract or a
              legal obligation that requires us to keep it
            </li>
          </ul>
          <p>
            Send the request to {businessEmail}. LevelUp Digital will ask you to
            show that you control the email address on the inquiry, and will not
            ask for unrelated identity documents. A deletion request covers the
            mailbox copies LevelUp Digital controls. It does not, by itself, remove
            a Brevo log or a Redis marker. Those expire on the periods above, or
            can be deleted with the provider.
          </p>
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
