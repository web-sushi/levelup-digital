export const STEP_COUNT = 6;

export const projectTypes = [
  {
    value: "website",
    label: "Business website",
    description: "A site that explains the business and gives people a way to get in touch.",
  },
  {
    value: "application",
    label: "Custom web application",
    description: "A tool built around a specific way of working.",
  },
  {
    value: "booking",
    label: "Booking or payment system",
    description: "Reservations, checkout, or payment flows where a project needs them.",
  },
  {
    value: "redesign",
    label: "Website redesign",
    description: "A new version of a site that already exists.",
  },
  {
    value: "other",
    label: "Something else",
    description: "A project that does not fit the choices above.",
  },
] as const;

export const budgets = [
  { value: "range-50", label: "¥50,000–¥99,999" },
  { value: "range-100", label: "¥100,000–¥199,999" },
  { value: "range-200", label: "¥200,000–¥499,999" },
  { value: "range-500", label: "¥500,000+" },
  { value: "unsure", label: "Not sure yet" },
] as const;

export const timelines = [
  { value: "asap", label: "As soon as possible" },
  { value: "month", label: "Within 1 month" },
  { value: "quarter", label: "Within 1–3 months" },
  { value: "exploring", label: "Just exploring" },
] as const;

export const steps = [
  {
    progress: "Project type",
    title: "What are you building?",
    support: "Choose the option that best describes your project.",
  },
  {
    progress: "Your budget",
    title: "What's your budget?",
    support:
      "An approximate range helps us recommend an appropriate approach. This isn't a final quote.",
  },
  {
    progress: "Your timeline",
    title: "When would you like to start?",
    support: "Choose your preferred starting timeframe. This is not a delivery date.",
  },
  {
    progress: "How to reach you",
    title: "How can we reach you?",
    support: "A name and email are enough to continue the conversation.",
  },
  {
    progress: "Your vision",
    title: "Tell us about your vision.",
    support: "Share anything that would help us understand your idea. You can skip this step.",
  },
  {
    progress: "Review",
    title: "Let's review your project.",
    support: "Check the details. Nothing on this page is sent or saved.",
  },
] as const;

export type ProjectType = (typeof projectTypes)[number]["value"];
export type BudgetRange = (typeof budgets)[number]["value"];
export type TimelineChoice = (typeof timelines)[number]["value"];

export type InquiryReference = {
  id: string;
  url: string;
  note: string;
};

export type InquiryDraft = {
  projectType: ProjectType | "";
  budget: BudgetRange | "";
  timeline: TimelineChoice | "";
  name: string;
  email: string;
  business: string;
  details: string;
  references: InquiryReference[];
};

export type ReferenceErrors = {
  url?: string;
  note?: string;
};

export type InquiryErrors = {
  projectType?: string;
  budget?: string;
  timeline?: string;
  name?: string;
  email?: string;
  business?: string;
  details?: string;
  references?: Record<string, ReferenceErrors>;
};

export const LIMITS = {
  name: 80,
  email: 254,
  business: 120,
  details: 3000,
  note: 300,
  url: 500,
  references: 3,
} as const;

export const initialReferenceId = "ref-1";

export function createInquiryDraft(): InquiryDraft {
  return {
    projectType: "",
    budget: "",
    timeline: "",
    name: "",
    email: "",
    business: "",
    details: "",
    references: [{ id: initialReferenceId, url: "", note: "" }],
  };
}

export function createReferenceId() {
  return `ref-${crypto.randomUUID()}`;
}

export function labelFor<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? "";
}

function isBlank(value: string) {
  return value.trim().length === 0;
}

export function isValidEmail(value: string) {
  const email = value.trim();
  if (email.length > LIMITS.email) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function referenceUrlError(value: string) {
  const url = value.trim();
  if (!url) {
    return "";
  }
  if (url.length > LIMITS.url) {
    return `Keep the link under ${LIMITS.url} characters.`;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Enter a full link starting with http:// or https://.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Use an http:// or https:// link.";
  }
  if (!parsed.hostname) {
    return "Enter a full link starting with http:// or https://.";
  }
  return "";
}

export function filledReferences(references: InquiryReference[]) {
  return references.filter((item) => item.url.trim() || item.note.trim());
}

function referenceErrors(references: InquiryReference[]) {
  const errors: Record<string, ReferenceErrors> = {};
  for (const item of references) {
    const url = item.url.trim();
    const note = item.note.trim();
    const next: ReferenceErrors = {};
    if (!url && note) {
      next.url = "Add a link for this note, or clear the note.";
    } else if (url) {
      const urlMessage = referenceUrlError(url);
      if (urlMessage) {
        next.url = urlMessage;
      }
    }
    if (note.length > LIMITS.note) {
      next.note = `Keep this note under ${LIMITS.note} characters.`;
    }
    if (next.url || next.note) {
      errors[item.id] = next;
    }
  }
  return errors;
}

export function validateStep(step: number, draft: InquiryDraft): InquiryErrors {
  if (step === 0 && !draft.projectType) {
    return { projectType: "Choose a project type to continue." };
  }
  if (step === 1 && !draft.budget) {
    return { budget: "Choose a budget range to continue." };
  }
  if (step === 2 && !draft.timeline) {
    return { timeline: "Choose a starting timeframe to continue." };
  }
  if (step === 3) {
    const errors: InquiryErrors = {};
    if (isBlank(draft.name)) {
      errors.name = "Enter your name.";
    } else if (draft.name.trim().length > LIMITS.name) {
      errors.name = `Keep your name under ${LIMITS.name} characters.`;
    }
    if (isBlank(draft.email)) {
      errors.email = "Enter your email address.";
    } else if (!isValidEmail(draft.email)) {
      errors.email = "Enter an email address like name@example.com.";
    }
    if (draft.business.trim().length > LIMITS.business) {
      errors.business = `Keep the business name under ${LIMITS.business} characters.`;
    }
    return errors;
  }
  if (step === 4) {
    const errors: InquiryErrors = {};
    if (draft.details.length > LIMITS.details) {
      errors.details = `Keep this under ${LIMITS.details.toLocaleString("en-US")} characters.`;
    }
    const references = referenceErrors(draft.references);
    if (Object.keys(references).length > 0) {
      errors.references = references;
    }
    return errors;
  }
  return {};
}

export function hasInquiryErrors(errors: InquiryErrors) {
  return Object.values(errors).some((value) => {
    if (!value) {
      return false;
    }
    if (typeof value === "string") {
      return true;
    }
    return Object.keys(value).length > 0;
  });
}

export function firstInvalidId(step: number, errors: InquiryErrors, draft: InquiryDraft) {
  if (step === 0 && errors.projectType) {
    return "inquiry-project-type";
  }
  if (step === 1 && errors.budget) {
    return "inquiry-budget";
  }
  if (step === 2 && errors.timeline) {
    return "inquiry-timeline";
  }
  if (errors.name) {
    return "inquiry-name";
  }
  if (errors.email) {
    return "inquiry-email";
  }
  if (errors.business) {
    return "inquiry-business";
  }
  if (errors.details) {
    return "inquiry-details";
  }
  const reference = draft.references.find((item) => errors.references?.[item.id]);
  if (!reference || !errors.references) {
    return "";
  }
  const issue = errors.references[reference.id];
  return issue?.url ? `inquiry-ref-url-${reference.id}` : `inquiry-ref-note-${reference.id}`;
}
