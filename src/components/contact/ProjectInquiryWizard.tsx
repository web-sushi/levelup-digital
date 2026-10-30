"use client";

import { useEffect, useId, useRef, useState } from "react";
import { InquiryContactFields } from "@/components/contact/InquiryContactFields";
import { InquiryOptionGroup } from "@/components/contact/InquiryOptionGroup";
import { InquiryProgress } from "@/components/contact/InquiryProgress";
import { InquiryProjectDetails } from "@/components/contact/InquiryProjectDetails";
import { InquiryReferences } from "@/components/contact/InquiryReferences";
import { InquiryReview } from "@/components/contact/InquiryReview";
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
import { verifiedContactLinks } from "@/lib/nav";

export function ProjectInquiryWizard() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<InquiryDraft>(createInquiryDraft);
  const [errors, setErrors] = useState<InquiryErrors>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const headingId = useId();

  useEffect(() => {
    if (previousStep.current === step) {
      return;
    }
    previousStep.current = step;
    headingRef.current?.focus();
  }, [step]);

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
    setErrors({});
    setStep(nextStep);
  }

  const current = steps[step];

  return (
    <form
      className="inquiry"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <InquiryProgress step={step} label={current.progress} />
      <h3 id={headingId} ref={headingRef} tabIndex={-1} className="inquiry-title">
        <span className="sr-only">
          Step {step + 1} of {steps.length}.{" "}
        </span>
        {current.title}
      </h3>
      <p className="inquiry-support">{current.support}</p>

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
          <InquiryReview draft={draft} onEdit={edit} />
          <div className="inquiry-submit-block">
            <button type="button" className="inquiry-disabled" disabled>
              Submission available soon
            </button>
            <p>
              The inquiry form is being finalized. For now, you can send your project
              details directly by email.
            </p>
            <a href={verifiedContactLinks.email} className="page-link-button focus-ring">
              Email your project idea ↗
            </a>
          </div>
        </>
      ) : null}

      <div className="inquiry-nav">
        {step > 0 ? (
          <button
            type="button"
            className="page-link-button-secondary focus-ring"
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
