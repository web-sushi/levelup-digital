import Link from "next/link";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Thank You",
  description: "Confirmation page for LevelUp Digital enquiries.",
  path: "/thank-you",
});

export default function ThankYouPage() {
  return (
    <section className="thank-you-panel">
      <div className="site-container">
        <h1>Thank you</h1>
        <p>We&apos;ve received your enquiry.</p>
        <p>
          This page is reserved for a future post-submission step once the Brevo-powered
          inquiry flow is live. Visiting this URL directly does not mean a message was
          sent.
        </p>
        <div className="thank-you-actions">
          <Link href="/" className="page-link-button focus-ring">
            Back to home
          </Link>
          <Link
            href="/work"
            className="page-link-button page-inline-cta-secondary focus-ring"
          >
            View work
          </Link>
        </div>
      </div>
    </section>
  );
}
