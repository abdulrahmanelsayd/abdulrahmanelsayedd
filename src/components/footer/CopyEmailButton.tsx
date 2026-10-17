"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./SiteFooter.module.css";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function CopyEmailButton({ email }: { email: string }) {
  const ready = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sequence = useRef(0);
  const live = useRef(false);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; clearTimeout(timer.current); };
  }, []);
  const copy = async () => {
    const request = ++sequence.current;
    clearTimeout(timer.current);
    let success = false;
    try {
      if (typeof navigator.clipboard?.writeText !== "function") throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(email);
      success = true;
    } catch { /* The selectable native email link remains the fallback. */ }
    if (!live.current || sequence.current !== request) return;
    setCopied(success);
    setNotice(success ? "Email copied." : "Select the email address to copy it.");
    timer.current = setTimeout(() => {
      if (!live.current || sequence.current !== request) return;
      setCopied(false); setNotice("");
    }, 2400);
  };
  if (!ready) return null;
  return <span className={styles.copyControl}>
    <button className={styles.copyButton} type="button" aria-label={copied ? "Email copied" : "Copy email address"} onClick={copy} data-copy-email>
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">{copied
        ? <path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        : <><rect x="7" y="7" width="9" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" /><path d="M5 13H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></>}
      </svg>
    </button>
    <span className={`${styles.copyNotice} ${notice ? styles.noticeVisible : ""}`} data-copy-notice aria-hidden="true">{notice}</span>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{notice}</span>
  </span>;
}
