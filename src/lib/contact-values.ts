export type ContactValues = Record<"name" | "email" | "goal" | "company" | "date" | "budget", string>;
export type ContactField = keyof ContactValues;
export type ContactErrors = Partial<Record<ContactField, string>>;
export const emptyContact: ContactValues = { name: "", email: "", goal: "", company: "", date: "", budget: "" };

/** Decimal text throughout: even very large amounts never pass through Number. */
export function normalizeBudget(input: string): string | null {
  const value = input.trim().replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit <= "٩" ? 0x660 : 0x6f0))).replaceAll("٫", ".");
  if (!value) return "";
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(value)) return null;
  const [integer, fraction] = value.split(".");
  return (integer.replace(/^0+(?=\d)/, "") || "0") + (fraction === undefined ? "" : "." + fraction);
}

export function localDate(date = new Date()): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseCalendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(2000, 0, 1, 12);
  date.setFullYear(year, month - 1, day);
  return localDate(date) === value ? date : null;
}

export function validateContact(values: ContactValues, now = new Date()): ContactErrors {
  const errors: ContactErrors = {};
  const line = /[\u0000-\u001f\u007f\u2028\u2029]/;
  if (!values.name.trim()) errors.name = "Enter your name.";
  else if (values.name.length > 100 || line.test(values.name)) errors.name = "Use a name of up to 100 characters on one line.";
  if (!values.email.trim()) errors.email = "Enter your email address.";
  else if (values.email.length > 254 || !/^[^\s@<>,;:"\\]+@[^\s@<>,;:"\\]+\.[^\s@<>,;:"\\]+$/.test(values.email.trim())) errors.email = "Enter a valid email address, up to 254 characters.";
  if (!values.goal.trim()) errors.goal = "Tell me what you would like to build or improve.";
  else if (values.goal.length > 2000) errors.goal = "Keep the project brief to 2000 characters or fewer.";
  if (values.company.length > 100 || line.test(values.company)) errors.company = "Use up to 100 characters on one line.";
  if (values.date.trim() && (!parseCalendarDate(values.date.trim()) || values.date.trim() < localDate(now))) errors.date = "Enter a real date, today or later, in YYYY-MM-DD format.";
  if (normalizeBudget(values.budget) === null) errors.budget = "Enter a non-negative amount with up to two decimal places.";
  return errors;
}
