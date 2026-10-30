"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { InquiryContactFields } from "@/components/contact/InquiryContactFields";
import { InquiryOptionGroup } from "@/components/contact/InquiryOptionGroup";
import { InquiryProgress } from "@/components/contact/InquiryProgress";
import { InquiryProjectDetails } from "@/components/contact/InquiryProjectDetails";
import { InquiryReferences } from "@/components/contact/InquiryReferences";
import { InquiryReview } from "@/components/contact/InquiryReview";
import { InquirySubmission } from "@/components/contact/InquirySubmission";
import {
  budgets,
  createInquiryDraft,
  createReferenceId,
  firstInvalidId,
  hasInquiryErrors,
  LIMITS,
  projectTypes,
  steps,
  timelines,
  validateStep,
  type InquiryDraft,
  type InquiryErrors,
} from "@/components/contact/inquiry-model";
import {
  createInquiryClient,
  validateInquiryDraft,
  type InquiryClient,
  type InquirySubmissionState,
} from "@/lib/inquiries/client";

type ProjectInquiryWizardProps = {
  submissionsAvailable?: boolean;
  client?: InquiryClient;
};

export function ProjectInquiryWizard({
  submissionsAvailable = false,
  client,
}: ProjectInquiryWizardProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<InquiryDraft>(createInquiryDraft);
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | undefined>();
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [submission, setSubmission] = useState<InquirySubmissionState>({ status: "idle" });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const pendingFocus = useRef<string | null>(null);
  const [inquiryClient] = useState<InquiryClient>(() => client ?? createInquiryClient());
  const headingId = useId();
  const busy = submission.status === "submitting";

  useEffect(() => {
    const fieldId = pendingFocus.current;
    const stepChanged = previousStep.current !== step;
    if (!stepChanged && !fieldId) {
      return;
    }
    previousStep.current = step;
    pendingFocus.current = null;
    if (fieldId) {
      document.getElementById(fieldId)?.focus();
      return;
    }
    if (stepChanged) {
      headingRef.current?.focus();
    }
  }, [step, submission]);

  useEffect(() => {
    if (submission.status === "idle" || submission.status === "validation_error" || submission.status === "aborted") {
      return;
    }
    document.getElementById("inquiry-status")?.focus();
  }, [submission]);

  function patch(partial: Partial<InquiryDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(partial) as (keyof InquiryDraft)[]) {
        delete next[key];
      }
      return next;
    });
  }

  function showFieldErrors(nextStep: number, nextErrors: InquiryErrors, focusId: string) {
    setErrors(nextErrors);
    pendingFocus.current = focusId;
    if (nextStep !== step) {
      setStep(nextStep);
      return;
    }
    window.requestAnimationFrame(() => {
      if (focusId) {
        document.getElementById(focusId)?.focus();
      }
    });
  }

  function advance() {
    const nextErrors = validateStep(step, draft);
    if (hasInquiryErrors(nextErrors)) {
      setErrors(nextErrors);
      const id = firstInvalidId(step, nextErrors, draft);
      window.requestAnimationFrame(() => {
        document.getElementById(id)?.focus();
      });
      return;
    }
    setErrors({});
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function edit(nextStep: number) {
    if (busy) {
      return;
    }
    setErrors({});
    setStep(nextStep);
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submissionsAvailable || busy) {
      return;
    }
    if (submission.status !== "idle" && submission.status !== "validation_error" && submission.status !== "rate_limited" && submission.status !== "unavailable" && submission.status !== "error") {
      return;
    }
    const ready = validateInquiryDraft(draft, privacyAccepted);
    if (ready.status === "validation_error") {
      setPrivacyError(ready.privacy);
      setSubmission(ready);
      showFieldErrors(ready.step, ready.errors, ready.focusId);
      return;
    }
    setPrivacyError(undefined);
    setErrors({});
    setSubmission({ status: "submitting" });
    const result = await inquiryClient.submit(draft, companyWebsite);
    if (result.status === "aborted" || result.status === "submitting") {
      return;
    }
    if (result.status === "validation_error") {
      setSubmission(result);
      showFieldErrors(result.step, result.errors, result.focusId);
      return;
    }
    setSubmission(result);
  }

  const current = steps[step];
  const support = step === 5 && !submissionsAvailable
    ? "Check the details. Online submissions are not available yet, and nothing you type is sent or saved."
    : step === 5
      ? "Check the details, then send your inquiry."
      : current.support;

  return (
    <form
      className="inquiry"
      noValidate
      aria-busy={busy || undefined}
      onSubmit={(event) => {
        void submitInquiry(event);
      }}
    >
      <InquiryProgress step={step} label={current.progress} />
      <h3 id={headingId} ref={headingRef} tabIndex={-1} className="inquiry-title">
        <span className="sr-only">
          Step {step + 1} of {steps.length}.{" "}
        </span>
        {current.title}
      </h3>
      <p className="inquiry-support">{support}</p>

      {step === 0 ? (
        <InquiryOptionGroup
          name="inquiry-project-type"
          labelledBy={headingId}
          options={projectTypes}
          value={draft.projectType}
          error={errors.projectType}
          errorId="inquiry-project-type-error"
          onChange={(projectType) => patch({ projectType: projectType as InquiryDraft["projectType"] })}
        />
      ) : null}

      {step === 1 ? (
        <InquiryOptionGroup
          name="inquiry-budget"
          labelledBy={headingId}
          options={budgets}
          value={draft.budget}
          error={errors.budget}
          errorId="inquiry-budget-error"
          onChange={(budget) => patch({ budget: budget as InquiryDraft["budget"] })}
        />
      ) : null}

      {step === 2 ? (
        <InquiryOptionGroup
          name="inquiry-timeline"
          labelledBy={headingId}
          options={timelines}
          value={draft.timeline}
          error={errors.timeline}
          errorId="inquiry-timeline-error"
          onChange={(timeline) => patch({ timeline: timeline as InquiryDraft["timeline"] })}
        />
      ) : null}

      {step === 3 ? (
        <InquiryContactFields
          name={draft.name}
          email={draft.email}
          business={draft.business}
          errors={errors}
          onName={(name) => patch({ name })}
          onEmail={(email) => patch({ email })}
          onBusiness={(business) => patch({ business })}
        />
      ) : null}

      {step === 4 ? (
        <div className="inquiry-vision">
          <InquiryProjectDetails
            details={draft.details}
            error={errors.details}
            onChange={(details) => patch({ details })}
          />
          <InquiryReferences
            references={draft.references}
            errors={errors.references}
            onChange={(id, field, value) => {
              setDraft((current) => ({
                ...current,
                references: current.references.map((item) =>
                  item.id === id ? { ...item, [field]: value } : item,
                ),
              }));
              setErrors((current) => {
                if (!current.references?.[id]) {
                  return current;
                }
                const references = { ...current.references };
                const issue = { ...references[id] };
                delete issue[field];
                if (!issue.url && !issue.note) {
                  delete references[id];
                } else {
                  references[id] = issue;
                }
                return { ...current, references };
              });
            }}
            onAdd={() => {
              setDraft((current) =>
                current.references.length >= LIMITS.references
                  ? current
                  : {
                      ...current,
                      references: [...current.references, { id: createReferenceId(), url: "", note: "" }],
                    },
              );
            }}
            onRemove={(id) => {
              setDraft((current) => ({
                ...current,
                references: current.references.filter((item) => item.id !== id),
              }));
              setErrors((current) => {
                if (!current.references?.[id]) {
                  return current;
                }
                const references = { ...current.references };
                delete references[id];
                return { ...current, references };
              });
            }}
          />
        </div>
      ) : null}

      {step === 5 ? (
        <>
          <InquiryReview draft={draft} editsDisabled={busy} onEdit={edit} />
          <InquirySubmission
            submissionsAvailable={submissionsAvailable}
            privacyAccepted={privacyAccepted}
            privacyError={privacyError}
            onPrivacy={(accepted) => {
              setPrivacyAccepted(accepted);
              if (accepted) {
                setPrivacyError(undefined);
              }
            }}
            companyWebsite={companyWebsite}
            onCompanyWebsite={setCompanyWebsite}
            state={submission}
          />
        </>
      ) : null}

      <div className="inquiry-nav">
        {step > 0 ? (
          <button
            type="button"
            className="page-link-button-secondary focus-ring"
            disabled={busy}
            onClick={() => {
              setErrors({});
              setStep((currentStep) => currentStep - 1);
            }}
          >
            Back
          </button>
        ) : null}
        {step === 4 ? (
          <button type="button" className="page-link-button-secondary focus-ring" onClick={advance}>
            Skip
          </button>
        ) : null}
        {step < 5 ? (
          <button type="button" className="page-link-button focus-ring" onClick={advance}>
            Continue
          </button>
        ) : null}
      </div>
    </form>
  );
}
