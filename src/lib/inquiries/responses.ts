import type { FieldErrors, InquiryErrorBody, InquiryErrorCode, InquirySuccessBody } from "@/lib/inquiries/types";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
} as const;

export function inquiryJson(status: number, body: InquiryErrorBody | InquirySuccessBody, extra?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...jsonHeaders,
      ...extra,
    },
  });
}

export function errorResponse(
  status: number,
  code: InquiryErrorCode,
  message: string,
  fieldErrors?: FieldErrors,
  extra?: HeadersInit,
) {
  const body: InquiryErrorBody = { ok: false, code, message };
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    body.fieldErrors = fieldErrors;
  }
  return inquiryJson(status, body, extra);
}

export const messages = {
  invalid: "The request could not be processed.",
  media: "JSON requests are required.",
  validation: "Please check the highlighted fields.",
  unavailable: "Online inquiries are temporarily unavailable. Please contact us directly by email.",
  rateLimited: "Too many requests. Please try again later.",
} as const;
