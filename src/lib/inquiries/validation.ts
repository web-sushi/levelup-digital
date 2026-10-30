import { inquiryLimits, isBudgetRange, isProjectType, isTimelineChoice, REFERENCE_FIELDS } from "@/lib/inquiries/schema";
import type { FieldErrors, InquiryReferenceInput, ValidatedInquiry } from "@/lib/inquiries/types";

export type ValidationResult =
  | { ok: true; inquiry: ValidatedInquiry }
  | { ok: false; fieldErrors: FieldErrors };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function referenceUrlError(value: string) {
  if (value.length > inquiryLimits.url) {
    return "Enter a shorter http or https link.";
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "Enter a full link starting with http:// or https://.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Use an http:// or https:// link.";
  }
  if (parsed.username || parsed.password) {
    return "Remove the username and password from the link.";
  }
  if (!parsed.hostname) {
    return "Enter a full link starting with http:// or https://.";
  }
  return "";
}

function normalizeEmail(value: string) {
  const at = value.lastIndexOf("@");
  if (at <= 0) {
    return value;
  }
  return `${value.slice(0, at)}@${value.slice(at + 1).toLowerCase()}`;
}

function isReasonableEmail(value: string) {
  if (value.length > inquiryLimits.email) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateInquiry(input: Record<string, unknown>): ValidationResult {
  const fieldErrors: FieldErrors = {};

  if (typeof input.projectType !== "string" || !isProjectType(input.projectType)) {
    fieldErrors.projectType = "Choose a valid project type.";
  }
  if (typeof input.budget !== "string" || !isBudgetRange(input.budget)) {
    fieldErrors.budget = "Choose a valid budget range.";
  }
  if (typeof input.timeline !== "string" || !isTimelineChoice(input.timeline)) {
    fieldErrors.timeline = "Choose a valid timeline.";
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (typeof input.name !== "string" || name.length === 0) {
    fieldErrors.name = "Enter your name.";
  } else if (name.length > inquiryLimits.name) {
    fieldErrors.name = "Enter a shorter name.";
  }

  const email = typeof input.email === "string" ? normalizeEmail(input.email.trim()) : "";
  if (typeof input.email !== "string" || !isReasonableEmail(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  let business: string | undefined;
  if (input.business !== undefined) {
    if (typeof input.business !== "string") {
      fieldErrors.business = "Enter the business name as text.";
    } else {
      const trimmed = input.business.trim();
      if (trimmed.length > inquiryLimits.business) {
        fieldErrors.business = "Enter a shorter business name.";
      } else if (trimmed) {
        business = trimmed;
      }
    }
  }

  let details: string | undefined;
  if (input.details !== undefined) {
    if (typeof input.details !== "string") {
      fieldErrors.details = "Enter the project details as text.";
    } else if (input.details.length > inquiryLimits.details) {
      fieldErrors.details = "Keep the project details under 3,000 characters.";
    } else {
      const trimmed = input.details.trim();
      if (trimmed) {
        details = trimmed;
      }
    }
  }

  const references: InquiryReferenceInput[] = [];
  if (input.references !== undefined) {
    if (!Array.isArray(input.references)) {
      fieldErrors.references = "References must be a list.";
    } else if (input.references.length > inquiryLimits.references) {
      fieldErrors.references = "Add no more than three references.";
    } else {
      for (const item of input.references) {
        if (!isRecord(item)) {
          fieldErrors.references = "Each reference needs a link.";
          break;
        }
        const url = typeof item.url === "string" ? item.url.trim() : "";
        const note = typeof item.note === "string" ? item.note.trim() : "";
        if (item.url !== undefined && typeof item.url !== "string") {
          fieldErrors.references = "Enter each reference link as text.";
          break;
        }
        if (item.note !== undefined && typeof item.note !== "string") {
          fieldErrors.references = "Enter each reference note as text.";
          break;
        }
        if (!url && note) {
          fieldErrors.references = "Add a link for this note, or remove the note.";
          break;
        }
        if (!url) {
          fieldErrors.references = "Enter a link for each reference, or remove the empty one.";
          break;
        }
        const urlMessage = referenceUrlError(url);
        if (urlMessage) {
          fieldErrors.references = urlMessage;
          break;
        }
        if (note.length > inquiryLimits.note) {
          fieldErrors.references = "Keep each reference note under 300 characters.";
          break;
        }
        references.push(note ? { url, note } : { url });
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    inquiry: {
      projectType: input.projectType as ValidatedInquiry["projectType"],
      budget: input.budget as ValidatedInquiry["budget"],
      timeline: input.timeline as ValidatedInquiry["timeline"],
      name,
      email,
      ...(business ? { business } : {}),
      ...(details ? { details } : {}),
      references,
    },
  };
}

const referenceFieldSet = new Set<string>(REFERENCE_FIELDS);

export function unexpectedReferenceKeys(value: unknown) {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.some((item) => {
    if (!isRecord(item)) {
      return false;
    }
    return Object.keys(item).some((key) => !referenceFieldSet.has(key));
  });
}
