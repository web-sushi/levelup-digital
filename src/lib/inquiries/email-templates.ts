import { budgets, labelFor, projectTypes, timelines } from "@/components/contact/inquiry-model";
import type { ValidatedInquiry } from "@/lib/inquiries/types";

export const BUSINESS_NOTIFICATION_SUBJECT = "New Project Inquiry — LevelUp Digital";
export const CUSTOMER_CONFIRMATION_SUBJECT = "We Received Your Project Inquiry — LevelUp Digital";
export const INQUIRY_SITE_URL = "https://levelup-digital.dev";

export type InquiryEmail = {
  subject: string;
  html: string;
  text: string;
};

export type InquiryMailIdentity = {
  senderName: string;
  notificationEmail: string;
};

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function safeHttpUrl(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  if (parsed.username || parsed.password || !parsed.hostname) {
    return null;
  }
  return parsed.href;
}

function textToHtml(value: string) {
  return escapeHtml(value).replaceAll("\r\n", "\n").replaceAll("\n", "<br>");
}

function choiceLabel(options: readonly { value: string; label: string }[], value: string) {
  return labelFor(options, value) || value;
}

function linkHtml(url: string) {
  const href = safeHttpUrl(url);
  const visible = escapeHtml(url);
  if (!href) {
    return visible;
  }
  return `<a href="${escapeHtml(href)}" style="color:#00f050;text-decoration:underline;word-break:break-all;">${visible}</a>`;
}

function renderEmail(preheader: string, heading: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#050505;">
    <div style="display:none;max-height:0;overflow:hidden;color:#050505;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#050505;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#151515;border-top:4px solid #00f050;">
            <tr>
              <td style="padding:28px 28px 8px;font:600 13px Arial,Helvetica,sans-serif;letter-spacing:0.14em;text-transform:uppercase;color:#00f050;">${escapeHtml(heading)}</td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;font:16px Arial,Helvetica,sans-serif;line-height:1.5;color:#ffffff;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function fieldBlock(label: string, valueHtml: string) {
  return `<p style="margin:16px 0 4px;font:600 12px Arial,Helvetica,sans-serif;letter-spacing:0.04em;text-transform:uppercase;color:#a3a3a3;">${escapeHtml(label)}</p>
<p style="margin:0 0 8px;font:16px Arial,Helvetica,sans-serif;line-height:1.5;color:#ffffff;word-break:break-word;">${valueHtml}</p>`;
}

function referenceHtml(inquiry: ValidatedInquiry) {
  if (inquiry.references.length === 0) {
    return fieldBlock("Website and design references", "None provided");
  }
  const items = inquiry.references
    .map((reference, index) => {
      const note = reference.note
        ? `<br><span style="color:#a3a3a3;">Note: ${textToHtml(reference.note)}</span>`
        : "";
      return `<p style="margin:0 0 12px;font:16px Arial,Helvetica,sans-serif;line-height:1.5;color:#ffffff;word-break:break-all;">${index + 1}. ${linkHtml(reference.url)}${note}</p>`;
    })
    .join("");
  return `<p style="margin:16px 0 8px;font:600 12px Arial,Helvetica,sans-serif;letter-spacing:0.04em;text-transform:uppercase;color:#a3a3a3;">Website and design references</p>${items}`;
}

function referenceText(inquiry: ValidatedInquiry) {
  if (inquiry.references.length === 0) {
    return "Website and design references\nNone provided";
  }
  const items = inquiry.references.map((reference, index) => {
    const note = reference.note ? `\n   Note: ${reference.note}` : "";
    return `${index + 1}. ${reference.url}${note}`;
  });
  return `Website and design references\n${items.join("\n")}`;
}

export function businessNotificationEmail(inquiry: ValidatedInquiry, identity: InquiryMailIdentity): InquiryEmail {
  const projectType = choiceLabel(projectTypes, inquiry.projectType);
  const budget = choiceLabel(budgets, inquiry.budget);
  const timeline = choiceLabel(timelines, inquiry.timeline);
  const business = inquiry.business ?? "Not provided";
  const details = inquiry.details ?? "Not provided";
  const html = renderEmail(
    "New project inquiry",
    identity.senderName,
    `${fieldBlock("Name", textToHtml(inquiry.name))}
${fieldBlock("Email", textToHtml(inquiry.email))}
${fieldBlock("Business", textToHtml(business))}
${fieldBlock("Project type", textToHtml(projectType))}
${fieldBlock("Approximate budget", textToHtml(budget))}
${fieldBlock("Preferred timeline", textToHtml(timeline))}
${fieldBlock("Project description", textToHtml(details))}
${referenceHtml(inquiry)}
<p style="margin:20px 0 0;font:14px Arial,Helvetica,sans-serif;line-height:1.5;color:#a3a3a3;">Reply to this message to reach the person who sent the inquiry.</p>`,
  );
  const text = [
    identity.senderName,
    "",
    "Name: " + inquiry.name,
    "Email: " + inquiry.email,
    "Business: " + business,
    "Project type: " + projectType,
    "Approximate budget: " + budget,
    "Preferred timeline: " + timeline,
    "",
    "Project description",
    details,
    "",
    referenceText(inquiry),
    "",
    "Reply to this message to reach the person who sent the inquiry.",
  ].join("\n");
  return { subject: BUSINESS_NOTIFICATION_SUBJECT, html, text };
}

export function customerConfirmationEmail(inquiry: ValidatedInquiry, identity: InquiryMailIdentity): InquiryEmail {
  const projectType = choiceLabel(projectTypes, inquiry.projectType);
  const site = `${INQUIRY_SITE_URL}/`;
  const html = renderEmail(
    "We received your project inquiry",
    identity.senderName,
    `<p style="margin:8px 0 12px;font:16px Arial,Helvetica,sans-serif;line-height:1.5;color:#ffffff;">Thank you for contacting ${escapeHtml(identity.senderName)}.</p>
<p style="margin:0 0 12px;font:16px Arial,Helvetica,sans-serif;line-height:1.5;color:#ffffff;">We received your project inquiry for review.</p>
${fieldBlock("Project type", textToHtml(projectType))}
<p style="margin:12px 0 0;font:16px Arial,Helvetica,sans-serif;line-height:1.5;color:#ffffff;">We will review the details and respond.</p>
<p style="margin:20px 0 0;font:14px Arial,Helvetica,sans-serif;line-height:1.5;color:#a3a3a3;">${escapeHtml(identity.senderName)}<br>Email: ${escapeHtml(identity.notificationEmail)}<br>Website: <a href="${escapeHtml(site)}" style="color:#00f050;text-decoration:underline;">${escapeHtml(site)}</a></p>`,
  );
  const text = [
    identity.senderName,
    "",
    `Thank you for contacting ${identity.senderName}.`,
    "",
    "We received your project inquiry for review.",
    `Project type: ${projectType}`,
    "",
    "We will review the details and respond.",
    "",
    identity.senderName,
    `Email: ${identity.notificationEmail}`,
    `Website: ${site}`,
  ].join("\n");
  return { subject: CUSTOMER_CONFIRMATION_SUBJECT, html, text };
}
