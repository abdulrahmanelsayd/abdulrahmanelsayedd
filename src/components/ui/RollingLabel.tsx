"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import styles from "./RollingLabel.module.css";

export function RollingLabel({ label, full = false, copies = 2, icon, decorative = false }: {
  label: string; full?: boolean; copies?: 2 | 3; icon?: ReactNode; decorative?: boolean;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const angle = icon ? 10 : 20;
  const origin = icon ? 1100 : Math.min(10000, Math.max(100,
    Math.round(100 + 30 * (12 + 6 * label.trim().length)) * (full ? 3 : 1)));
  useEffect(() => {
    const element = root.current;
    const target = element?.closest<HTMLElement>("[data-roll-trigger]");
    if (!element || !target) return;
    const labels = [...element.querySelectorAll<HTMLElement>("[data-rolling-copy]")];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const hover = matchMedia("(hover: hover) and (pointer: fine)");
    let animations: Animation[] = [];
    let last = -Infinity;
    const clear = () => { animations.forEach(animation => animation.cancel()); animations = []; };
    const enter = () => {
      if (reduced.matches || target.closest("[data-about-footer-held]") || performance.now() - last < 100) return;
      last = performance.now();
      clear();
      animations = labels.map((label, index) => label.animate([
        { transform: `rotate(${-index * angle}deg)` },
        { transform: `rotate(${(1 - index) * angle}deg)` },
      ], { duration: full ? 750 : 500, delay: index * 75, easing: "cubic-bezier(.625,.05,0,1)" }));
      const owned = animations;
      Promise.all(owned.map(animation => animation.finished)).then(() => {
        if (animations === owned) clear();
      }).catch(() => { /* Cancellation is owned by reentry, preference changes or unmount. */ });
    };
    const pointer = (event: PointerEvent) => { if (hover.matches && event.pointerType === "mouse") enter(); };
    const focus = () => { if (target.matches(":focus-visible")) enter(); };
    const preference = () => { if (reduced.matches) clear(); };
    target.addEventListener("pointerenter", pointer);
    target.addEventListener("focus", focus);
    reduced.addEventListener("change", preference);
    return () => {
      clear(); target.removeEventListener("pointerenter", pointer); target.removeEventListener("focus", focus);
      reduced.removeEventListener("change", preference);
    };
  }, [angle, copies, full, label]);
  return <>
    {!decorative && <span className="sr-only">{label}</span>}
    <span ref={root} className={`${styles.wrap} ${icon ? styles.icon : ""}`} aria-hidden="true"
      style={{ "--roll-angle": `${angle}deg`, "--roll-origin": `${origin}%` } as CSSProperties}>
      {Array.from({ length: copies }, (_, index) => <span key={index} className={styles.copy} data-rolling-copy>{icon ?? label}</span>)}
    </span>
  </>;
}
