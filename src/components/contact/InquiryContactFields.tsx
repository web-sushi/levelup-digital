import { LIMITS, type InquiryErrors } from "@/components/contact/inquiry-model";

type InquiryContactFieldsProps = {
  name: string;
  email: string;
  business: string;
  errors: InquiryErrors;
  onName: (value: string) => void;
  onEmail: (value: string) => void;
  onBusiness: (value: string) => void;
};

export function InquiryContactFields({
  name,
  email,
  business,
  errors,
  onName,
  onEmail,
  onBusiness,
}: InquiryContactFieldsProps) {
  return (
    <div className="inquiry-fields">
      <div className="inquiry-field">
        <label htmlFor="inquiry-name">
          Full name <span>Required</span>
        </label>
        <input
          id="inquiry-name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={LIMITS.name}
          value={name}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "inquiry-name-error" : undefined}
          onChange={(event) => onName(event.target.value)}
        />
        {errors.name ? (
          <p id="inquiry-name-error" className="inquiry-error" role="alert">
            {errors.name}
          </p>
        ) : null}
      </div>
      <div className="inquiry-field">
        <label htmlFor="inquiry-email">
          Email address <span>Required</span>
        </label>
        <input
          id="inquiry-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={LIMITS.email}
          value={email}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "inquiry-email-error" : undefined}
          onChange={(event) => onEmail(event.target.value)}
        />
        {errors.email ? (
          <p id="inquiry-email-error" className="inquiry-error" role="alert">
            {errors.email}
          </p>
        ) : null}
      </div>
      <div className="inquiry-field">
        <label htmlFor="inquiry-business">
          Business name <span>Optional</span>
        </label>
        <input
          id="inquiry-business"
          name="organization"
          type="text"
          autoComplete="organization"
          maxLength={LIMITS.business}
          value={business}
          aria-invalid={errors.business ? true : undefined}
          aria-describedby={errors.business ? "inquiry-business-error" : undefined}
          onChange={(event) => onBusiness(event.target.value)}
        />
        {errors.business ? (
          <p id="inquiry-business-error" className="inquiry-error" role="alert">
            {errors.business}
          </p>
        ) : null}
      </div>
    </div>
  );
}
