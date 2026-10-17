"use client";

import { useEffect } from "react";
import { observeServicesActivity } from "./motion-activity";

export function ServicesRibbonMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-services-ribbon]")!;
    const button = root.querySelector<HTMLButtonElement>("[data-ribbon-toggle]")!;
    const viewport = root.firstElementChild as HTMLElement;
    let visible = false, hover = false;
    let manualPause = false;
    try { manualPause = sessionStorage.getItem("services-ribbon-paused") === "true"; } catch { /* Keep the in-memory preference. */ }
    const sync = () => {
      root.dataset.ribbonRunning = String(visible && !hover && !manualPause && activity.active());
      button.setAttribute("aria-disabled", String(!activity.active()));
      viewport.tabIndex = activity.reduced.matches ? 0 : -1;
      if (activity.reduced.matches) viewport.setAttribute("data-scroll-native", ""); else viewport.removeAttribute("data-scroll-native");
    };
    const activity = observeServicesActivity(root, sync);
    const label = () => {
      button.setAttribute("aria-pressed", String(manualPause));
      button.setAttribute("aria-label", manualPause ? "Play moving service labels" : "Pause moving service labels");
      button.querySelector("[data-ribbon-control-text]")!.textContent = manualPause ? "Play" : "Pause";
    };
    const toggle = () => {
      if (!activity.active()) return;
      manualPause = !manualPause;
      try { sessionStorage.setItem("services-ribbon-paused", String(manualPause)); } catch { /* The current choice still persists for this mount. */ }
      label(); sync();
    };
    const enter = (e: PointerEvent) => { if (e.pointerType === "touch" || !activity.fine.matches) return; hover = true; sync(); };
    const leave = () => { hover = false; sync(); };
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: 0 });
    intersection.observe(root); button.addEventListener("click", toggle);
    root.addEventListener("pointerenter", enter); root.addEventListener("pointerleave", leave);
    label(); sync(); root.dataset.ribbonEnhanced = "true";
    return () => {
      activity.dispose(); intersection.disconnect(); button.removeEventListener("click", toggle);
      root.removeEventListener("pointerenter", enter); root.removeEventListener("pointerleave", leave);
      delete root.dataset.ribbonEnhanced; delete root.dataset.ribbonRunning; button.setAttribute("aria-disabled", "true");
    };
  }, []);
  return null;
}
