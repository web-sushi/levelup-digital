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
  return (
    <>
      <PageHeader
        title="Privacy Policy"
        description="How LevelUp Digital handles information when you visit this site or get in touch."
      />

      <section className="page-section">
        <div className="site-container page-prose" style={{ maxWidth: "48rem" }}>
          <p>
            <strong>Last updated:</strong> 2024 (baseline from legacy policy; see
            review notes below)
          </p>

          <PolicyReviewNote>
            Update the last-revised date, contact email, and third-party processors
            before production launch on Vercel with Brevo enquiry handling.
          </PolicyReviewNote>

          <h2>Introduction</h2>
          <p>
            LevelUp Digital (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is
            committed to protecting your privacy. This Privacy Policy explains how
            we collect, use, and safeguard your information when you visit our
            website or contact us.
          </p>

          <h2>Information we collect</h2>
          <p>When you contact us, we may collect:</p>
          <ul>
            <li>Name</li>
            <li>Email address</li>
            <li>Business or project type (when provided)</li>
            <li>Message content and optional project details</li>
          </ul>
          <PolicyReviewNote>
            The legacy policy referenced a Netlify contact form. The Next.js site
            does not yet expose a working enquiry form. When Brevo is integrated,
            describe what is collected in the wizard and how long it is retained.
          </PolicyReviewNote>

          <h2>How we use your information</h2>
          <p>We use the information you provide to:</p>
          <ul>
            <li>Respond to your inquiries</li>
            <li>Provide information about our services</li>
            <li>Communicate with you about your project</li>
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
            Legacy text: contact forms may be processed through third-party services
            (such as Netlify Forms).
          </p>
          <PolicyReviewNote>
            Replace Netlify references before launch. Planned enquiry processing:
            Brevo Transactional Email API on Vercel server-side routes (not yet
            implemented). Do not state Brevo is active until verified in production.
          </PolicyReviewNote>

          <h2>Your rights</h2>
          <p>You may request to:</p>
          <ul>
            <li>Access personal information we hold about you</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your personal information, subject to legal obligations</li>
          </ul>

          <h2>Contact us</h2>
          <p>
            Legacy policy listed{" "}
            <a href="mailto:hello@levelupdigital.com">hello@levelupdigital.com</a>.
            Verified contact channels on the current site include{" "}
            <a href={verifiedContactLinks.email}>email</a> and{" "}
            <a href={verifiedContactLinks.whatsApp}>WhatsApp</a>.
          </p>
          <PolicyReviewNote>
            Resolve email inconsistency (hello@levelupdigital.com vs
            atsushijunior.harada@gmail.com) and publish one canonical privacy contact
            address.
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
