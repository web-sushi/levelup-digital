import { LIMITS } from "@/components/contact/inquiry-model";

type InquiryProjectDetailsProps = {
  details: string;
  error?: string;
  onChange: (value: string) => void;
};

export function InquiryProjectDetails({ details, error, onChange }: InquiryProjectDetailsProps) {
  const countId = "inquiry-details-count";
  return (
    <div className="inquiry-field">
      <label htmlFor="inquiry-details">
        Project details <span>Optional</span>
      </label>
      <textarea
        id="inquiry-details"
        name="details"
        maxLength={LIMITS.details}
        value={details}
        placeholder="Tell us about your business, the features you need, or the problem you are trying to solve."
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `inquiry-details-error ${countId}` : countId}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={countId} className="inquiry-count">
        {details.length.toLocaleString("en-US")} / {LIMITS.details.toLocaleString("en-US")}
      </p>
      {error ? (
        <p id="inquiry-details-error" className="inquiry-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
