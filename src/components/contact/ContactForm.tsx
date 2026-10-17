"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { emptyContact, validateContact, type ContactErrors, type ContactField } from "../../lib/contact-values";
import { buildContactDraft } from "../../lib/contact-draft";
import { Arrow } from "../ui/Icons";
import { LaunchDate } from "./LaunchDate";
import styles from "./ContactForm.module.css";

const subscribe = () => () => {};
export function ContactForm({ recipient }: { recipient: string }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const id = useId(), form = useRef<HTMLFormElement>(null), details = useRef<HTMLDetailsElement>(null), preview = useRef<HTMLPreElement>(null);
  const sequence = useRef(0), live = useRef(false);
  const [values, setValues] = useState(emptyContact), [errors, setErrors] = useState<ContactErrors>({}), [status, setStatus] = useState("");
  const [draft, setDraft] = useState<ReturnType<typeof buildContactDraft> | null>(null);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const change = (field: ContactField, value: string) => {
    sequence.current++; setValues(previous => ({ ...previous, [field]: value }));
    setErrors(previous => { const next = { ...previous }; delete next[field]; return next; });
    setDraft(null); setStatus("");
  };
  const prepare = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); sequence.current++;
    const next = validateContact(values);
    setErrors(next); setDraft(null);
    const first = (["name", "email", "goal", "company", "date", "budget"] as const).find(field => next[field]);
    if (first) {
      setStatus("Check the highlighted fields. Your entries have been kept.");
      if (["company", "date", "budget"].includes(first) && details.current) details.current.open = true;
      requestAnimationFrame(() => { if (live.current) form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(); });
      return;
    }
    setDraft(buildContactDraft(values, recipient));
    setStatus("Email draft ready. Open your email app to review and send it.");
  };
  const copy = async () => {
    if (!draft) return;
    const request = ++sequence.current;
    let copied = false;
    try { await navigator.clipboard.writeText(draft.message); copied = true; } catch { /* The full plain text is always available. */ }
    if (!live.current || sequence.current !== request) return;
    setStatus(copied ? "Message copied. Paste it into your email app to review and send it." : "Clipboard unavailable. Select and copy the full message below, then paste it into your email app.");
    if (!copied) preview.current?.focus({ preventScroll: true });
  };
  const input = (field: "name" | "email" | "company" | "budget", label: string, placeholder: string, maxLength?: number, required = false) => <span className={styles.field}>
    <label className={styles.label} htmlFor={id + "-" + field}>{label}{(required || field === "company") && <span aria-hidden="true" className={styles.optional}>{required ? " *" : " (optional)"}</span>}</label>
    <input id={id + "-" + field} name={field} type={field === "email" ? "email" : "text"} inputMode={field === "budget" ? "decimal" : field === "email" ? "email" : "text"} autoComplete={field === "name" ? "name" : field === "email" ? "email" : field === "company" ? "organization" : "off"} value={values[field]} onChange={event => change(field, event.target.value)} required={required} maxLength={maxLength} placeholder={placeholder} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? id + "-" + field + "-error" : undefined} />
    {errors[field] && <span className={styles.error} id={id + "-" + field + "-error"}>{errors[field]}</span>}
  </span>;
  return <form ref={form} className={styles.form} method="post" noValidate onSubmit={prepare} aria-label="Project enquiry">
    <fieldset disabled={!ready} className={styles.fields}>
      <legend className="sr-only">Your project details</legend>
      <div className={styles.row}>{input("name", "Name", "Your name", 100, true)}{input("email", "Email", "name@example.com", 254, true)}</div>
      <div className={styles.detailsRow}><span className={styles.field}>
        <label className={styles.label} htmlFor={id + "-goal"}>What would you like to build or improve? <span aria-hidden="true" className={styles.optional}>*</span></label>
        <textarea id={id + "-goal"} name="goal" required aria-invalid={!!errors.goal} aria-describedby={errors.goal ? id + "-goal-error" : undefined} autoComplete="off" value={values.goal} onChange={event => change("goal", event.target.value)} maxLength={2000} rows={3} placeholder="An online store, a new site, or changes to an existing one. Reference links are welcome." onInput={event => { const target = event.currentTarget; target.style.height = "auto"; target.style.height = Math.min(200, Math.max(108, target.scrollHeight)) + "px"; }} />
        {errors.goal && <span className={styles.error} id={id + "-goal-error"}>{errors.goal}</span>}
      </span></div>
      <details ref={details} className={styles.optionalDetails}>
        <summary>Add details <span>(optional)</span><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></summary>
        <div className={styles.optionalBody}>
          <div className={styles.companyRow}>{input("company", "Company or project name", "Company or project name", 100)}</div>
          <div className={styles.row}><LaunchDate id={id + "-date"} value={values.date} error={errors.date} onChange={value => change("date", value)} />{input("budget", "Budget (USD, optional)", "Enter an amount")}</div>
        </div>
      </details>
      <button type="submit" className={styles.submit} disabled={!ready}>Prepare email<span><Arrow size={18} /></span></button>
    </fieldset>
    <p className={styles.explanation}>Prepares a draft. Open your email app to review and send it.</p>
    {draft && <div className={styles.prepared}>
      <p className={styles.draftHeading}>Review your email draft</p>
      <pre ref={preview} className={styles.messageText} tabIndex={0} aria-label="Prepared project message">{draft.message}</pre>
      {draft.manual && <p className={styles.explanation}>This message is long, and email apps support different link lengths. Copy the full message, then open your email app and paste it in. The direct link supplies only the recipient.</p>}
      <div className={styles.preparedActions}><button type="button" onClick={copy}>Copy message</button><a href={draft.href}>Open email app <Arrow size={14} /></a></div>
    </div>}
    <p className={styles.status} data-contact-status role="status" aria-live="polite" aria-atomic="true">{status}</p>
    <noscript><p className={styles.explanation}>This form needs JavaScript to prepare an email draft. Please <a href={`mailto:${recipient}`}>email directly</a> or use the phone number below.</p></noscript>
  </form>;
}
