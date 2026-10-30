type PolicyReviewNoteProps = {
  children: React.ReactNode;
};

/** Visible note for owner/legal review — not a legal claim. */
export function PolicyReviewNote({ children }: PolicyReviewNoteProps) {
  return (
    <aside className="policy-review-note" role="note">
      <p className="policy-review-note-label">Owner review required</p>
      <div className="policy-review-note-body">{children}</div>
    </aside>
  );
}
