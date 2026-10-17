"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { identity } from "../../content/identity";
import { useWhatsApp } from "./use-whatsapp";
import styles from "./FloatingWhatsApp.module.css";

export function FloatingWhatsApp({ blocked: menuBlocked, home = false }: { blocked: boolean; home?: boolean }) {
  const [heroVisible, setHeroVisible] = useState(home);
  useEffect(() => {
    if (!home) return;
    const hero = document.querySelector('[data-section="hero"]');
    if (!hero) return;
    const observer = new IntersectionObserver(entries => setHeroVisible(entries[0].intersectionRect.height > 0));
    observer.observe(hero);
    return () => observer.disconnect();
  }, [home]);
  const blocked = menuBlocked || (home && heroVisible);
  const { rootRef, triggerRef, ignoreHoverRef, pointerWithinRef, desktop, open, setMode, toggle } = useWhatsApp(blocked);
  const panelId = useId();
  return <div ref={rootRef} className={`${styles.contact} ${home ? styles.home : ""}`} data-floating-whatsapp
    data-open={open} data-blocked={blocked} inert={blocked}
    onPointerDownCapture={() => { pointerWithinRef.current = true; }}
    onPointerUpCapture={() => { pointerWithinRef.current = false; }}
    onPointerCancelCapture={() => { pointerWithinRef.current = false; }}
    onPointerEnter={event => {
      if (desktop && !blocked && event.pointerType === "mouse" && !ignoreHoverRef.current)
        setMode(previous => previous === "pinned" ? previous : "hover");
    }}
    onPointerLeave={() => {
      ignoreHoverRef.current = false;
      pointerWithinRef.current = false;
      if (!rootRef.current?.contains(document.activeElement))
        setMode(previous => previous === "hover" ? "closed" : previous);
    }}
    onBlur={event => {
      // Safari clears focus on mouse press instead of focusing the link.
      // Keep the panel alive until that native click has reached its target.
      if (!pointerWithinRef.current && !event.currentTarget.contains(event.relatedTarget)) setMode("closed");
    }}
    onKeyDown={event => {
      if (!open || event.key !== "Tab") return;
      const link = rootRef.current?.querySelector<HTMLAnchorElement>("[data-whatsapp-panel] a");
      // Safari may skip links in its native Tab order. Keep the two controls
      // consecutive, while leaving Tab at either outer edge to the document.
      if (!event.shiftKey && event.target === triggerRef.current && link) {
        event.preventDefault();
        link.focus({ preventScroll: true });
      } else if (event.shiftKey && event.target === link) {
        event.preventDefault();
        triggerRef.current?.focus({ preventScroll: true });
      }
    }}>
    <a ref={triggerRef} className={styles.trigger} href={identity.whatsappUri}
      target="_blank" rel="noopener noreferrer" data-whatsapp-trigger
      role={desktop ? "button" : undefined}
      aria-label={desktop ? "WhatsApp contact options" : "Chat with Abdulrahman on WhatsApp (opens in a new tab)"}
      aria-expanded={desktop ? open : undefined} aria-controls={desktop ? panelId : undefined}
      tabIndex={blocked ? -1 : undefined}
      onFocus={event => {
        if (desktop && !blocked && event.currentTarget.matches(":focus-visible") && !ignoreHoverRef.current)
          setMode(previous => previous === "pinned" ? previous : "hover");
      }}
      onClick={event => {
        if (blocked) { event.preventDefault(); return; }
        if (!desktop || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        toggle();
      }}
      onKeyDown={event => {
        if (desktop && event.key === " ") { event.preventDefault(); toggle(); }
      }}>
      <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M12.04 2a9.94 9.94 0 0 0-8.6 14.92L2 22l5.24-1.37A9.94 9.94 0 1 0 12.04 2Zm4.85 14.17c-.2.56-1.15 1.07-1.6 1.14-.42.07-.96.1-1.55-.09-.36-.12-.82-.27-1.4-.52-2.46-1.06-4.08-3.55-4.2-3.72-.12-.17-1-1.33-1-2.54 0-1.2.63-1.8.86-2.05.23-.24.5-.3.67-.3h.48c.15 0 .35-.05.55.42.2.49.7 1.71.76 1.83.06.12.1.27.02.43-.09.17-.12.27-.25.42-.12.14-.25.32-.36.43-.12.12-.25.25-.1.49.14.24.64 1.05 1.38 1.7.95.85 1.75 1.12 2 1.24.25.12.4.1.55-.06.15-.17.64-.75.81-1 .17-.24.34-.2.57-.12.23.09 1.45.69 1.7.81.24.12.4.18.46.28.06.1.06.58-.15 1.15Z" />
      </svg>
    </a>
    <div id={panelId} className={styles.panel} role="region" aria-label="WhatsApp contact options"
      aria-hidden={!open} inert={!open} data-whatsapp-panel>
      <div className={styles.surface} />
      <div className={styles.content}>
        <Image className={styles.qr} src="/graphics/whatsapp-qr.svg" width={164} height={164}
          alt="Scan to chat with Abdulrahman on WhatsApp" unoptimized />
        <div className={styles.copy}>
          <h2>WhatsApp me.</h2>
          <p>Scan to continue on your phone.</p>
        </div>
        <a className={styles.link} href={identity.whatsappUri} target="_blank" rel="noopener noreferrer">
          <span>Chat on desktop</span>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
            <path d="M5 15 15 5M5.5 5H15v9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </div>
  </div>;
}
