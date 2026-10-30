type InquiryProgressProps = {
  step: number;
  label: string;
};

export function InquiryProgress({ step, label }: InquiryProgressProps) {
  const current = step + 1;
  const width = `${(current / 6) * 100}%`;

  return (
    <div className="inquiry-progress">
      <p className="inquiry-kicker">
        Step {String(current).padStart(2, "0")} of 06
        <span>{label}</span>
      </p>
      <div className="inquiry-meter" aria-hidden="true">
        <span style={{ width }} />
      </div>
    </div>
  );
}
