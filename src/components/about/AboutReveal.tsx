"use client";

import { useEffect } from "react";
import { observeMotionActivity } from "./motion-activity";

/** Entrance enhancement for content still below the viewport. Initial CSS motion
 * starts with SSR; hydration never conceals content that was already on screen. */
export function AboutReveal() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('main[data-route="/about"]');
    if (!root) return;
    const seen = new WeakSet<Element>();
    const animations = new Map<Element, Animation>();
    let observer: IntersectionObserver | undefined;
    const finish = (event: Event) => {
      const target = event.target as Node;
      root.querySelectorAll<HTMLElement>("[data-about-enter],[data-about-reveal]").forEach(item => {
        if (!item.contains(target)) return;
        item.dataset.aboutFinished = ""; seen.add(item); observer?.unobserve(item);
        animations.get(item)?.cancel(); animations.delete(item);
      });
    };
    const clear = () => {
      observer?.disconnect(); animations.forEach(animation => animation.cancel()); animations.clear();
    };
    const activity = observeMotionActivity(root, active => {
      clear();
      if (!active) { root.dataset.aboutPaused = ""; return; }
      // Keep canceled first-paint animations canceled when returning from a menu.
      if (root.hasAttribute("data-about-paused")) {
        root.querySelectorAll<HTMLElement>("[data-about-enter]").forEach(item => { item.dataset.aboutFinished = ""; });
        delete root.dataset.aboutPaused;
      }
      observer = new IntersectionObserver(entries => {
        let order = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const item = entry.target as HTMLElement;
          observer?.unobserve(item);
          if (seen.has(item) || item.contains(document.activeElement)) continue;
          seen.add(item);
          const underline = item.matches("[data-about-underline]");
          const target = underline ? item.querySelector("path")! : item;
          const stationary = item.hasAttribute("data-about-stationary");
          const animation = target.animate(underline
            ? [{ strokeDasharray: "1", strokeDashoffset: "1" }, { strokeDasharray: "1", strokeDashoffset: "0" }]
            : [{ opacity: 0, ...(stationary ? {} : { transform: "translateY(24px)" }) }, { opacity: 1, ...(stationary ? {} : { transform: "none" }) }],
          { duration: underline ? 1150 : 720, delay: underline ? 0 : order++ * 55, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
          animations.set(item, animation);
          animation.onfinish = () => { animation.cancel(); animations.delete(item); };
        }
      }, { rootMargin: "0px 0px -9% 0px" });
      root.querySelectorAll<HTMLElement>("[data-about-reveal],[data-about-underline]").forEach(item => {
        if (seen.has(item)) return;
        // A late script must not replay over content the reader already saw.
        if (item.getBoundingClientRect().top < innerHeight) { seen.add(item); return; }
        observer?.observe(item);
      });
    });
    root.addEventListener("focusin", finish, true); root.addEventListener("pointerdown", finish, true);
    return () => { activity.dispose(); clear(); root.removeEventListener("focusin", finish, true); root.removeEventListener("pointerdown", finish, true); };
  }, []);
  return null;
}
