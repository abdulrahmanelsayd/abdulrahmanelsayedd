"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { afterHomeEntry } from "../transitions/entry-layout";
import { marqueeSpeed, marqueeTiming } from "./introduction-geometry";

export function MarqueeMotion({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => afterHomeEntry(root.current, () => {
    const element = root.current!;
    const viewport = element.querySelector<HTMLElement>("[data-marquee-viewport]")!;
    const track = element.querySelector<HTMLElement>("[data-marquee-track]")!;
    const group = element.querySelector<HTMLElement>("[data-marquee-group]")!;
    const control = element.querySelector<HTMLElement>("[data-marquee-control]")!;
    const button = element.querySelector<HTMLButtonElement>("[data-marquee-toggle]")!;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined, clone: HTMLElement | undefined;
    let width = 0, offset = 0, visible = false, manualPause = false, live = true;
    let measureFrame = 0;
    const remember = () => {
      if (animation && width) offset = Number(animation.currentTime ?? 0) * marqueeSpeed / 1000 % width;
    };
    const synchronize = () => {
      const running = visible && !document.hidden && !manualPause && !preference.matches;
      if (animation) { if (running) animation.play(); else animation.pause(); }
      element.dataset.marqueeRunning = String(!!animation && running);
    };
    const measure = () => {
      measureFrame = 0;
      if (!live) return;
      if (preference.matches) {
        remember();
        animation?.cancel(); animation = undefined;
        clone?.remove(); clone = undefined;
        delete element.dataset.marqueeEnhanced;
        viewport.setAttribute("data-scroll-native", "");
        control.hidden = true; viewport.tabIndex = 0;
        if (document.activeElement === button) viewport.focus({ preventScroll: true });
        track.style.removeProperty("transform");
        synchronize(); return;
      }
      // Read before changing the track; font/resize notifications can repeat
      // without changing its width, so retain the running animation in that case.
      const nextWidth = group.getBoundingClientRect().width;
      if (!nextWidth) return;
      if (animation && width === nextWidth) { synchronize(); return; }
      remember();
      animation?.cancel(); animation = undefined;
      width = nextWidth;
      if (!clone) {
        clone = group.cloneNode(true) as HTMLElement;
        clone.removeAttribute("data-marquee-group"); clone.dataset.marqueeClone = "";
        clone.setAttribute("aria-hidden", "true"); clone.inert = true;
        track.append(clone);
      }
      const timing = marqueeTiming(width, offset);
      animation = track.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-width}px)` }], { duration: timing.duration, iterations: Infinity, easing: "linear" });
      animation.pause(); animation.currentTime = timing.currentTime;
      viewport.scrollLeft = 0; viewport.tabIndex = -1;
      element.dataset.marqueeEnhanced = "true"; control.hidden = false;
      // Only the horizontal native fallback owns its scroll events. The animated
      // viewport has no internal scroll and shares the page's vertical engine.
      viewport.removeAttribute("data-scroll-native");
      synchronize();
    };
    const scheduleMeasure = () => { if (!measureFrame) measureFrame = requestAnimationFrame(measure); };
    const toggle = () => {
      manualPause = !manualPause;
      button.setAttribute("aria-label", `${manualPause ? "Resume" : "Pause"} automatic capabilities scrolling`);
      button.querySelector<SVGElement>("[data-pause-icon]")!.style.display = manualPause ? "none" : "";
      button.querySelector<SVGElement>("[data-play-icon]")!.style.display = manualPause ? "" : "none";
      synchronize();
    };
    const intersection = new IntersectionObserver(entries => { visible = entries[0].intersectionRect.height > .5; synchronize(); }, { threshold: [0, .01] });
    intersection.observe(element);
    const resize = new ResizeObserver(scheduleMeasure); resize.observe(group); resize.observe(viewport);
    button.addEventListener("click", toggle);
    document.addEventListener("visibilitychange", synchronize);
    preference.addEventListener("change", scheduleMeasure);
    document.fonts.addEventListener("loadingdone", scheduleMeasure);
    void document.fonts.ready.then(() => { if (live) scheduleMeasure(); });
    measure();
    return () => {
      live = false; cancelAnimationFrame(measureFrame); animation?.cancel(); clone?.remove();
      resize.disconnect(); intersection.disconnect(); button.removeEventListener("click", toggle);
      document.removeEventListener("visibilitychange", synchronize);
      preference.removeEventListener("change", scheduleMeasure);
      document.fonts.removeEventListener("loadingdone", scheduleMeasure);
      delete element.dataset.marqueeEnhanced; delete element.dataset.marqueeRunning;
      control.hidden = true; viewport.tabIndex = 0;
      viewport.setAttribute("data-scroll-native", "");
    };
  }), []);
  return <div ref={root} className={className} data-capability-marquee data-home-deferred>{children}</div>;
}
