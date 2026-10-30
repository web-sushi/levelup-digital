import type { ReactNode } from "react";
import {
  budgets,
  filledReferences,
  labelFor,
  projectTypes,
  timelines,
  type InquiryDraft,
} from "@/components/contact/inquiry-model";

type InquiryReviewProps = {
  draft: InquiryDraft;
  onEdit: (step: number) => void;
};

function ReviewGroup({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="inquiry-review-group">
      <div className="inquiry-review-heading">
        <h4>{title}</h4>
        <button type="button" className="inquiry-text-button focus-ring" onClick={onEdit}>
          Edit {title}
        </button>
      </div>
      <dl>{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

export function InquiryReview({ draft, onEdit }: InquiryReviewProps) {
  const references = filledReferences(draft.references).filter((item) => item.url.trim());
  const business = draft.business.trim();
  const details = draft.details.trim();

  return (
    <div className="inquiry-review">
      <ReviewGroup title="Project type" onEdit={() => onEdit(0)}>
        <Row label="Type" value={labelFor(projectTypes, draft.projectType)} />
      </ReviewGroup>
      <ReviewGroup title="Budget" onEdit={() => onEdit(1)}>
        <Row label="Range" value={labelFor(budgets, draft.budget)} />
      </ReviewGroup>
      <ReviewGroup title="Timeline" onEdit={() => onEdit(2)}>
        <Row label="Preferred start" value={labelFor(timelines, draft.timeline)} />
      </ReviewGroup>
      <ReviewGroup title="Contact" onEdit={() => onEdit(3)}>
        <Row label="Name" value={draft.name.trim()} />
        <Row label="Email" value={draft.email.trim()} />
        {business ? <Row label="Business" value={business} /> : null}
      </ReviewGroup>
      <ReviewGroup title="Project details" onEdit={() => onEdit(4)}>
        <Row label="Description" value={details || "Not added"} />
        {references.length === 0 ? <Row label="References" value="Not added" /> : null}
        {references.map((reference, index) => (
          <Row
            key={reference.id}
            label={`Reference ${index + 1}`}
            value={reference.note.trim() ? `${reference.url.trim()} (${reference.note.trim()})` : reference.url.trim()}
          />
        ))}
      </ReviewGroup>
    </div>
  );
}
