import { submissionCopy, allowsManualSubmit, type InquirySubmissionState } from "@/lib/inquiries/client";
import { verifiedContactLinks } from "@/lib/nav";

type InquirySubmissionProps = {
  submissionsAvailable: boolean;
  privacyAccepted: boolean;
  privacyError?: string;
  onPrivacy: (accepted: boolean) => void;
  companyWebsite: string;
  onCompanyWebsite: (value: string) => void;
  state: InquirySubmissionState;
};

function EmailFallback() {
  return (
    <a href={verifiedContactLinks.email} className="page-link-button focus-ring">
      Email your project idea
    </a>
  );
}

export function InquirySubmission({
  submissionsAvailable,
  privacyAccepted,
  privacyError,
  onPrivacy,
  companyWebsite,
  onCompanyWebsite,
  state,
}: InquirySubmissionProps) {
  const copy = submissionCopy(state);
  const closed = !submissionsAvailable;
  const showSend = submissionsAvailable && allowsManualSubmit(state);
  const alert =
    state.status === "validation_error" ||
    state.status === "error" ||
    state.status === "rate_limited" ||
    state.status === "conflict";

  return (
    <div className="inquiry-submit-block">
      <div className="inquiry-honeypot" aria-hidden="true">
        <label>
          Company website
          <input
            tabIndex={-1}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            name="companyWebsite"
            value={companyWebsite}
            onChange={(event) => onCompanyWebsite(event.target.value)}
          />
        </label>
      </div>

      <div className="inquiry-privacy">
        <input
          id="inquiry-privacy"
          type="checkbox"
          checked={privacyAccepted}
          onChange={(event) => onPrivacy(event.target.checked)}
          aria-invalid={privacyError ? true : undefined}
          aria-describedby={privacyError ? "inquiry-privacy-error" : "inquiry-privacy-note"}
        />
        <div>
          <label htmlFor="inquiry-privacy">
            I understand that LevelUp Digital will use the information I provide to respond to my inquiry.
          </label>
          <a id="inquiry-privacy-note" href="/privacy" className="inquiry-privacy-link focus-ring">
            Privacy Policy
          </a>
        </div>
      </div>
      {privacyError ? (
        <p id="inquiry-privacy-error" className="inquiry-error" role="alert">
          {privacyError}
        </p>
      ) : null}

      <div
        id="inquiry-status"
        tabIndex={-1}
        className="inquiry-status"
        aria-live={alert ? "assertive" : "polite"}
        aria-atomic="true"
        role={alert ? "alert" : "status"}
      >
        {closed ? (
          <>
            <h4>Online inquiries are not yet available</h4>
            <p>Please contact us directly by email while the inquiry system is being finalized.</p>
          </>
        ) : null}
        {!closed && copy && state.status !== "submitting" ? (
          <>
            <h4>{copy.title}</h4>
            <p>{copy.message}</p>
            {copy.confirmation ? <p>{copy.confirmation}</p> : null}
          </>
        ) : null}
        {!closed && state.status === "submitting" ? <p className="sr-only">Sending your inquiry.</p> : null}
      </div>

      {showSend ? (
        <button type="submit" className="page-link-button focus-ring">
          Send inquiry
        </button>
      ) : null}
      {submissionsAvailable && state.status === "submitting" ? (
        <button type="button" className="page-link-button focus-ring" disabled aria-busy="true">
          Sending your inquiry
        </button>
      ) : null}
      <EmailFallback />
    </div>
  );
}
