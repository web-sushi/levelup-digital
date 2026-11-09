import Link from "next/link";

type ConsentBannerProps = {
  message: string;
  onAccept: () => void;
  onReject: () => void;
};

export function ConsentBanner({ message, onAccept, onReject }: ConsentBannerProps) {
  return (
    <section className="consent-banner" aria-labelledby="consent-banner-title">
      <div className="consent-copy">
        <h2 id="consent-banner-title" className="consent-title">Your privacy. Your choice.</h2>
        <p className="consent-text">
          We use optional analytics to understand how visitors use our website and improve the experience. You can accept or reject analytics, and change your choice anytime.
        </p>
        {message ? <p className="consent-note" role="status">{message}</p> : null}
      </div>
      <div className="consent-actions">
        <button type="button" className="consent-button consent-button-reject focus-ring" onClick={onReject}>
          Reject Analytics
        </button>
        <button type="button" className="consent-button consent-button-accept focus-ring" onClick={onAccept}>
          Accept Analytics
        </button>
        <Link href="/privacy" className="consent-policy-link focus-ring">
          Privacy Policy
        </Link>
      </div>
    </section>
  );
}
