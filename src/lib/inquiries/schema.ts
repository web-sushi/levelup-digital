import {
  budgets,
  LIMITS,
  projectTypes,
  timelines,
  type BudgetRange,
  type ProjectType,
  type TimelineChoice,
} from "@/components/contact/inquiry-model";

export const MAX_INQUIRY_BODY_BYTES = 16 * 1024;

export const HONEYPOT_FIELD = "companyWebsite";

export const INQUIRY_FIELDS = [
  "projectType",
  "budget",
  "timeline",
  "name",
  "email",
  "business",
  "details",
  "references",
  HONEYPOT_FIELD,
] as const;

export const REFERENCE_FIELDS = ["url", "note"] as const;

export const inquiryLimits = LIMITS;

const projectTypeValues = new Set<string>(projectTypes.map((item) => item.value));
const budgetValues = new Set<string>(budgets.map((item) => item.value));
const timelineValues = new Set<string>(timelines.map((item) => item.value));

export function isProjectType(value: string): value is ProjectType {
  return projectTypeValues.has(value);
}

export function isBudgetRange(value: string): value is BudgetRange {
  return budgetValues.has(value);
}

export function isTimelineChoice(value: string): value is TimelineChoice {
  return timelineValues.has(value);
}

/** Local origins used only when the runtime explicitly allows development traffic. */
export const DEVELOPMENT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
] as const;

export const SUGGESTED_RATE_LIMIT = {
  limit: 5,
  windowSeconds: 60 * 60,
} as const;
