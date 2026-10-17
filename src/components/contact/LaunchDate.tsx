"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { localDate, parseCalendarDate } from "../../lib/contact-values";
import { keepCalendarFocusVisible, useCalendarPlacement } from "./use-calendar-placement";
import styles from "./ContactForm.module.css";

export function LaunchDate({ id, value, error, onChange }: { id: string; value: string; error?: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null), trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const focusDay = useRef(false);
  const [open, setOpen] = useState(false), [month, setMonth] = useState(new Date(2000, 0, 1, 12));
  const [today, setToday] = useState(""), [focused, setFocused] = useState("");
  const close = (restore = false) => { setOpen(false); if (restore) trigger.current?.focus({ preventScroll: true }); };
  const show = () => {
    const now = new Date(), selected = parseCalendarDate(value);
    const start = selected && localDate(selected) >= localDate(now) ? selected : now;
    setToday(localDate(now)); setMonth(new Date(start.getFullYear(), start.getMonth(), 1, 12));
    setFocused(localDate(start)); focusDay.current = true; setOpen(true);
  };
  useCalendarPlacement(open, input, panel, localDate(month));
  useEffect(() => {
    if (!open || !focusDay.current) return;
    focusDay.current = false;
    const target = panel.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`);
    target?.focus({ preventScroll: true });
    if (target && panel.current) keepCalendarFocusVisible(panel.current, target);
  }, [open, month, focused]);
  useEffect(() => {
    if (!open) return;
    const control = input.current?.parentElement, details = input.current?.closest("details"), application = input.current?.closest("[data-page-content]");
    const outside = (event: Event) => { if (!panel.current?.contains(event.target as Node) && !control?.contains(event.target as Node)) setOpen(false); };
    const collapse = () => { if (!details?.open) setOpen(false); };
    const lock = new MutationObserver(() => { if (application?.hasAttribute("inert")) setOpen(false); });
    if (application) lock.observe(application, { attributes: true, attributeFilter: ["inert"] });
    details?.addEventListener("toggle", collapse);
    document.addEventListener("pointerdown", outside); document.addEventListener("focusin", outside);
    return () => { lock.disconnect(); details?.removeEventListener("toggle", collapse); document.removeEventListener("pointerdown", outside); document.removeEventListener("focusin", outside); };
  }, [open]);
  const shiftMonth = (amount: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1, 12);
    if (localDate(new Date(next.getFullYear(), next.getMonth() + 1, 0, 12)) < today || next.getFullYear() > 9999) return;
    setMonth(next); setFocused(localDate(next) >= today ? localDate(next) : today);
  };
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); return; }
    if (!(event.target as HTMLElement).hasAttribute("data-date")) return;
    const current = parseCalendarDate(focused);
    if (!current) return;
    const weekday = (current.getDay() + 6) % 7;
    const delta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday };
    if (event.key in delta) current.setDate(current.getDate() + delta[event.key]);
    else if (event.key === "PageUp" || event.key === "PageDown") {
      const day = current.getDate(); current.setDate(1); current.setMonth(current.getMonth() + (event.key === "PageUp" ? -1 : 1));
      current.setDate(Math.min(day, new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()));
    } else return;
    event.preventDefault();
    if (localDate(current) < today || current.getFullYear() > 9999) return;
    focusDay.current = true; setFocused(localDate(current)); setMonth(new Date(current.getFullYear(), current.getMonth(), 1, 12));
  };
  const first = (month.getDay() + 6) % 7, days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return <span className={styles.field}>
    <label className={styles.label} htmlFor={id}>Preferred launch date<span className={styles.optional}> (optional)</span></label>
    <span className={styles.dateControl}>
      <input ref={input} id={id} name="date" value={value} onChange={event => onChange(event.target.value)} placeholder="YYYY-MM-DD" maxLength={10} autoComplete="off" aria-invalid={!!error} aria-describedby={error ? id + "-error" : id + "-hint"} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); show(); } else if (event.key === "Escape" && open) { event.preventDefault(); close(); } }} />
      <button ref={trigger} type="button" aria-label="Open calendar" aria-expanded={open} aria-controls={id + "-calendar"} aria-haspopup="dialog" onClick={() => open ? close() : show()}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M4 5h16v16H4zM4 9h16M8 2v6M16 2v6" /></svg>
      </button>
    </span>
    <span id={id + "-hint"} className="sr-only">Optional date in YYYY-MM-DD format, today or later.</span>
    {error && <span className={styles.error} id={id + "-error"}>{error}</span>}
    {open && <div ref={panel} id={id + "-calendar"} className={styles.panel} role="dialog" aria-label="Choose preferred date" data-scroll-native onKeyDown={keys}>
      <div className={styles.calendarHeader}>
        <button type="button" aria-label="Previous month" aria-disabled={localDate(new Date(month.getFullYear(), month.getMonth(), 0, 12)) < today} onClick={() => shiftMonth(-1)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="m14 5-7 7 7 7" /></svg></button>
        <span aria-live="polite">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="m10 5 7 7-7 7" /></svg></button>
      </div>
      <div role="grid" aria-label="Dates">
        <div className={styles.week} role="row">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(day => <span role="columnheader" key={day}>{day}</span>)}</div>
        {Array.from({ length: Math.ceil((days + first) / 7) }, (_, week) => <div className={styles.week} role="row" key={week}>
          {Array.from({ length: 7 }, (_, weekday) => {
            const day = week * 7 + weekday - first + 1, date = localDate(new Date(month.getFullYear(), month.getMonth(), day, 12));
            return <span role="gridcell" key={weekday} aria-selected={day > 0 && day <= days && value === date}>
              {day > 0 && day <= days && <button type="button" data-date={date} aria-label={date} aria-current={date === today ? "date" : undefined} disabled={date < today} className={value === date ? styles.selected : ""} tabIndex={date === focused ? 0 : -1} onFocus={() => setFocused(date)} onClick={() => { onChange(date); close(true); }}>{day}</button>}
            </span>;
          })}
        </div>)}
      </div>
      <button type="button" className={styles.clear} onClick={() => { onChange(""); close(true); }}>Clear</button>
    </div>}
  </span>;
}
