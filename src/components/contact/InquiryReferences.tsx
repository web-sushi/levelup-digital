import {
  LIMITS,
  type InquiryReference,
  type ReferenceErrors,
} from "@/components/contact/inquiry-model";

type InquiryReferencesProps = {
  references: InquiryReference[];
  errors?: Record<string, ReferenceErrors>;
  onChange: (id: string, field: "url" | "note", value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
};

export function InquiryReferences({
  references,
  errors,
  onChange,
  onAdd,
  onRemove,
}: InquiryReferencesProps) {
  return (
    <div className="inquiry-references">
      <div className="inquiry-reference-heading">
        <h4>Website or design references</h4>
        <p>
          Have a website or design you like? Share a link so we can understand your
          preferences.
        </p>
      </div>
      <ul>
        {references.map((reference, index) => {
          const urlId = `inquiry-ref-url-${reference.id}`;
          const noteId = `inquiry-ref-note-${reference.id}`;
          const issue = errors?.[reference.id];
          return (
            <li key={reference.id} className="inquiry-reference">
              <div className="inquiry-reference-top">
                <p>Reference {index + 1}</p>
                <button type="button" className="inquiry-text-button focus-ring" onClick={() => onRemove(reference.id)}>
                  Remove
                </button>
              </div>
              <div className="inquiry-field">
                <label htmlFor={urlId}>Website URL</label>
                <input
                  id={urlId}
                  name={urlId}
                  type="url"
                  inputMode="url"
                  maxLength={LIMITS.url}
                  value={reference.url}
                  placeholder="https://example.com"
                  aria-invalid={issue?.url ? true : undefined}
                  aria-describedby={issue?.url ? `${urlId}-error` : undefined}
                  onChange={(event) => onChange(reference.id, "url", event.target.value)}
                />
                {issue?.url ? (
                  <p id={`${urlId}-error`} className="inquiry-error" role="alert">
                    {issue.url}
                  </p>
                ) : null}
              </div>
              <div className="inquiry-field">
                <label htmlFor={noteId}>
                  Note <span>Optional</span>
                </label>
                <input
                  id={noteId}
                  name={noteId}
                  type="text"
                  maxLength={LIMITS.note}
                  value={reference.note}
                  placeholder="I like the navigation and overall layout."
                  aria-invalid={issue?.note ? true : undefined}
                  aria-describedby={issue?.note ? `${noteId}-error` : undefined}
                  onChange={(event) => onChange(reference.id, "note", event.target.value)}
                />
                {issue?.note ? (
                  <p id={`${noteId}-error`} className="inquiry-error" role="alert">
                    {issue.note}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {references.length < LIMITS.references ? (
        <button type="button" className="inquiry-text-button focus-ring" onClick={onAdd}>
          {references.length === 0 ? "Add a reference +" : "Add another reference +"}
        </button>
      ) : (
        <p className="inquiry-count">Three references added.</p>
      )}
      <p className="inquiry-note">
        References help us understand your preferences. Your final website will be
        designed around your business, not copied from another website.
      </p>
    </div>
  );
}
