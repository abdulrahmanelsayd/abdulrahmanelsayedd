import { normalizeBudget, type ContactValues } from "./contact-values.ts";

// A conservative fallback policy, not a guarantee about any email app's limit.
export const mailtoReviewLimit = 1800;
export function buildContactDraft(values: ContactValues, recipient: string) {
  const subject = `Project enquiry — ${values.name.trim()}`;
  const budget = normalizeBudget(values.budget);
  if (budget === null) throw new Error("Invalid budget");
  const body = [
    `Name: ${values.name.trim()}`,
    `Reply email: ${values.email.trim()}`,
    ...(values.company.trim() ? [`Company: ${values.company.trim()}`] : []),
    ...(values.date.trim() ? [`Preferred launch date: ${values.date.trim()}`] : []),
    ...(budget ? [`Budget: ${budget} USD`] : []),
    "", "Project brief:", values.goal,
  ].join("\n");
  const directHref = `mailto:${recipient}`;
  const href = `${directHref}?subject=${encodeURIComponent(subject.toWellFormed())}&body=${encodeURIComponent(body.replace(/\r\n|\r|\n/g, "\r\n").toWellFormed())}`;
  const manual = href.length > mailtoReviewLimit;
  return { recipient, subject, body, message: `To: ${recipient}\nSubject: ${subject}\n\n${body}`, href: manual ? directHref : href, manual };
}
