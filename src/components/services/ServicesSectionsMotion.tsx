"use client";

import { useEffect } from "react";
import { observeServicesActivity } from "./motion-activity";

const revealEase = "cubic-bezier(.22,1,.36,1)";
// GSAP power2.out is a cubic ease-out. These Bezier controls encode 1-(1-t)^3.
const drawEase = "cubic-bezier(.333333,1,.666667,1)";

export function ServicesSectionsMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('main[data-route="/services"]')!;
    const sections = [...root.querySelectorAll<HTMLElement>("[data-services-section-motion]")];
    const picker = root.querySelector<HTMLElement>("[data-services-phase-picker]")!;
    const details = sections.flatMap(section => [...section.querySelectorAll<HTMLDetailsElement>("[data-services-detail]")]);
    const all = new Set<Animation>(), phase = new Set<Animation>();
    const disclosures = new Map<HTMLDetailsElement, Animation>();
    const seen = new WeakSet<Element>(), drawn = new WeakSet<Element>(), lengths = new WeakMap<SVGPathElement, number>();
    let previous = Number(picker.querySelector<HTMLInputElement>("input:checked")!.value);
    let entrance: IntersectionObserver | undefined, drawing: IntersectionObserver | undefined;
    const cancel = (animations: Set<Animation>) => { animations.forEach(a => { a.cancel(); all.delete(a); }); animations.clear(); };
    const sync = () => {
      if (activity.reduced.matches) { cancel(all); phase.clear(); disclosures.clear(); return; }
      for (const a of all) {
        if (activity.active() && a.playState === "paused") a.play();
        else if (!activity.active() && a.playState === "running") a.pause();
      }
    };
    const activity = observeServicesActivity(root, sync);
    const animate = (element: Element, keys: Keyframe[], duration: number, delay = 0, easing = revealEase) => {
      const a = element.animate(keys, { duration, delay, easing, fill: "backwards" });
      all.add(a); if (!activity.active()) a.pause();
      void a.finished.then(() => { all.delete(a); phase.delete(a); a.cancel(); }, () => {});
      return a;
    };
    const enter = (el: HTMLElement, delay: number) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (!activity.reduced.matches) animate(el, [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "translateY(0)" }], 720, delay);
    };
    const draw = (el: Element) => {
      if (drawn.has(el)) return;
      drawn.add(el);
      if (activity.reduced.matches) return;
      const paths = el.matches("path") ? [el as SVGPathElement] : [...el.querySelectorAll<SVGPathElement>("path")];
      for (const path of paths) {
        let length = lengths.get(path);
        if (length === undefined) { length = path.getTotalLength(); lengths.set(path, length); }
        animate(path, [{ strokeDasharray: String(length), strokeDashoffset: String(length) }, { strokeDasharray: String(length), strokeDashoffset: "0" }], 1100, 0, drawEase);
      }
    };
    const enterTargets = sections.flatMap(s => [...s.querySelectorAll<HTMLElement>("[data-services-section-enter]")]);
    const drawTargets = sections.flatMap(s => [...s.querySelectorAll<Element>("[data-services-draw], [data-services-check]")]);
    // Initial HTML is fully visible. Anything already in the viewport at
    // hydration is marked seen without replaying a hidden starting pose.
    for (const el of enterTargets) if (el.getBoundingClientRect().top <= innerHeight * .93) seen.add(el);
    for (const el of drawTargets) if (el.getBoundingClientRect().top <= innerHeight * .87) drawn.add(el);
    const observe = () => {
      entrance?.disconnect(); drawing?.disconnect();
      // rootMargin percentages are relative to WIDTH; use viewport HEIGHT px.
      entrance = new IntersectionObserver(entries => {
        let index = 0;
        for (const entry of entries) if (entry.isIntersecting && getComputedStyle(entry.target).visibility !== "hidden") {
          enter(entry.target as HTMLElement, index++ * 55); entrance?.unobserve(entry.target);
        }
      }, { rootMargin: `0px 0px -${innerHeight * .07}px 0px`, threshold: 0 });
      drawing = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) { draw(entry.target); drawing?.unobserve(entry.target); }
      }, { rootMargin: `0px 0px -${innerHeight * .13}px 0px`, threshold: 0 });
      enterTargets.filter(el => !seen.has(el)).forEach(el => entrance!.observe(el));
      drawTargets.filter(el => !drawn.has(el)).forEach(el => drawing!.observe(el));
    };
    const change = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.name !== "services-phase") return;
      const next = Number(input.value), direction = next >= previous ? 1 : -1;
      previous = next; cancel(phase);
      // Cancel an entrance on the previous/new panel as well as selection
      // effects, so rapid native changes never leave competing transforms.
      for (const a of all) if ((a.effect as KeyframeEffect)?.target?.closest("[data-services-phase-panel]")) { a.cancel(); all.delete(a); }
      const panel = picker.querySelector<HTMLElement>(`[data-services-phase-panel="${next}"]`)!;
      for (const el of panel.querySelectorAll<HTMLElement>("[data-services-section-enter]")) { seen.add(el); entrance?.unobserve(el); }
      if (!activity.active()) return;
      [...panel.children].forEach((el, i) => phase.add(animate(el, [{ opacity: 0, transform: `translateX(${direction * 8}px)` }, { opacity: 1, transform: "translateX(0)" }], 320, i * 25)));
      panel.querySelectorAll("[data-services-process-piece]").forEach((el, i) => phase.add(animate(el, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], 400, 80 + i * 25)));
    };
    const toggle = (event: Event) => {
      const detail = event.target as HTMLDetailsElement;
      const old = disclosures.get(detail);
      if (old) { old.cancel(); all.delete(old); disclosures.delete(detail); }
      const body = detail.querySelector("p");
      if (body && detail.open && activity.active()) disclosures.set(detail, animate(body, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], 400, 0, drawEase));
    };
    observe(); picker.addEventListener("change", change);
    details.forEach(detail => detail.addEventListener("toggle", toggle));
    window.addEventListener("resize", observe);
    return () => {
      cancel(all); phase.clear(); disclosures.clear();
      entrance?.disconnect(); drawing?.disconnect(); activity.dispose();
      picker.removeEventListener("change", change); details.forEach(detail => detail.removeEventListener("toggle", toggle));
      window.removeEventListener("resize", observe);
    };
  }, []);
  return null;
}
