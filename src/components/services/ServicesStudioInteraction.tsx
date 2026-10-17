"use client";

import { useEffect } from "react";
import { observeServicesActivity } from "./motion-activity";

const ease = "cubic-bezier(.22,1,.36,1)";
export function ServicesStudioInteraction() {
  useEffect(() => {
    const studio = document.querySelector<HTMLFieldSetElement>("[data-services-studio]")!;
    const panels = [...studio.querySelectorAll<HTMLElement>("[data-services-panel]")];
    const order = ["design", "develop", "together"];
    let panel = panels.find(p => p.dataset.servicesPanel === studio.querySelector<HTMLInputElement>("input:checked")?.value)!;
    let previous = order.indexOf(panel.dataset.servicesPanel!), live = true, measureRAF = 0;
    let bounds = { left: 0, top: 0, width: 0, height: 0 };
    const animations = new Set<Animation>();
    const finish = () => { animations.forEach(a => a.cancel()); animations.clear(); };
    const centre = () => panels.forEach(p => p.querySelector<SVGGElement>("[data-services-pupil]")?.style.removeProperty("transform"));
    const sync = () => {
      if (activity.reduced.matches) { finish(); centre(); }
      for (const a of animations) { if (activity.active() && a.playState === "paused") a.play(); else if (!activity.active() && a.playState === "running") a.pause(); }
    };
    const activity = observeServicesActivity(studio, sync);
    const animate = (element: Element, keys: Keyframe[], duration: number, delay = 0) => {
      const a = element.animate(keys, { duration, delay, easing: ease, fill: "backwards" }); animations.add(a);
      void a.finished.then(() => { animations.delete(a); a.cancel(); }, () => {});
    };
    const measure = () => { measureRAF = 0; if (!live) return; const b = studio.getBoundingClientRect(); bounds = { left: b.left, top: b.top, width: b.width, height: b.height }; };
    const schedule = () => { if (live && !measureRAF) measureRAF = requestAnimationFrame(measure); };
    const change = (event: Event) => {
      const input = event.target as HTMLInputElement; if (input.name !== "services-mode") return;
      finish(); centre(); panel = panels.find(p => p.dataset.servicesPanel === input.value)!;
      panels.forEach(p => { if (p !== panel) p.querySelectorAll<HTMLDetailsElement>("details").forEach(d => { d.open = false; }); });
      const next = order.indexOf(input.value), direction = next >= previous ? 1 : -1; previous = next;
      if (activity.active()) {
        const distance = direction * Math.min(20, innerWidth * .035);
        // Copy stays fixed: only non-interactive text enters, never the CTA's container.
        const pieces = [
          { items: panel.querySelectorAll("h3,[data-services-panel-piece] > p"), x: distance, delay: 0 },
          { items: panel.querySelectorAll("[data-services-panel-piece] + [data-services-panel-piece]:not(:last-child)"), x: -distance, delay: 40 },
          { items: panel.querySelectorAll("h4"), x: distance, delay: 80 },
        ];
        pieces.forEach(({ items, x, delay }) => items.forEach(piece => animate(piece, [{ opacity: 0, transform: `translateX(${x}px)` }, { opacity: 1, transform: "translateX(0)" }], 480, delay)));
        panel.querySelectorAll<SVGGElement>("[data-services-pair]").forEach(pair => animate(pair, [{ transform: `translateX(${pair.dataset.servicesPair === "look" ? -16 : 16}px)` }, { transform: "translateX(0)" }], 550, 50));
      }
      schedule();
    };
    const toggle = (event: Event) => {
      const detail = event.target as HTMLDetailsElement;
      const body = detail.querySelector<HTMLElement>("[data-services-detail-body]")!;
      body.getAnimations().forEach(a => { animations.delete(a); a.cancel(); });
      if (!detail.open || !panel.contains(detail) || !activity.active()) return;
      animate(body, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], 400);
    };
    const move = (event: PointerEvent) => {
      if (!activity.active() || !activity.fine.matches || event.pointerType === "touch" || !bounds.width) return;
      const pupil = panel.querySelector<SVGGElement>("[data-services-pupil]"); if (!pupil) return;
      const x = Math.max(-3, Math.min(3, (event.clientX - bounds.left - bounds.width / 2) / bounds.width * 8));
      const y = Math.max(-3, Math.min(3, (event.clientY - bounds.top - bounds.height / 2) / bounds.height * 8));
      pupil.style.transform = `translate(${x}px,${y}px)`;
    };
    const details = [...studio.querySelectorAll<HTMLDetailsElement>("details")];
    details.forEach(d => d.addEventListener("toggle", toggle));
    studio.addEventListener("change", change); studio.addEventListener("pointermove", move); studio.addEventListener("pointerleave", centre);
    studio.addEventListener("focusin", finish); studio.addEventListener("pointerdown", finish);
    const resize = new ResizeObserver(schedule); resize.observe(studio);
    window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule);
    // Native checked/open properties are deliberately read rather than reset on hydration.
    measure(); sync();
    return () => {
      live = false; cancelAnimationFrame(measureRAF); finish(); centre(); activity.dispose(); resize.disconnect();
      details.forEach(d => d.removeEventListener("toggle", toggle));
      studio.removeEventListener("change", change); studio.removeEventListener("pointermove", move); studio.removeEventListener("pointerleave", centre);
      studio.removeEventListener("focusin", finish); studio.removeEventListener("pointerdown", finish);
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule);
    };
  }, []);
  return null;
}
