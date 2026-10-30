type InquiryOption = {
  value: string;
  label: string;
  description?: string;
};

type InquiryOptionGroupProps = {
  name: string;
  labelledBy: string;
  options: readonly InquiryOption[];
  value: string;
  error?: string;
  errorId: string;
  onChange: (value: string) => void;
};

export function InquiryOptionGroup({
  name,
  labelledBy,
  options,
  value,
  error,
  errorId,
  onChange,
}: InquiryOptionGroupProps) {
  return (
    <fieldset
      className="inquiry-options"
      aria-labelledby={labelledBy}
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
    >
      {options.map((option, index) => {
        const checked = value === option.value;
        return (
          <label key={option.value} className="inquiry-option">
            <input
              id={index === 0 ? name : undefined}
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
            />
            <span className="inquiry-mark" aria-hidden="true">
              {checked ? "✓" : ""}
            </span>
            <span className="inquiry-option-copy">
              <span className="inquiry-option-label">{option.label}</span>
              {option.description ? (
                <span className="inquiry-option-text">{option.description}</span>
              ) : null}
            </span>
            {checked ? <span className="inquiry-selected">Selected</span> : null}
          </label>
        );
      })}
      {error ? (
        <p id={errorId} className="inquiry-error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
