"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { afterHomeEntry } from "../transitions/entry-layout";
import { clamp, characterOpacity, readingGeometry } from "./introduction-geometry";

/** One event-driven controller; all letter poses use the same cached scroll range. */
export function IntroductionMotion({ children, className, entryFonts }: { children: ReactNode; className: string; entryFonts: string[] }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => afterHomeEntry(root.current, () => {
    const element = root.current!;
    const stage = element.querySelector<HTMLElement>("[data-intro-stage]")!;
    const content = element.querySelector<HTMLElement>("[data-intro-content]")!;
    const ring = element.querySelector<SVGSVGElement>("[data-intro-ring]")!;
    const letters = Array.from(element.querySelectorAll<HTMLElement>("[data-intro-letter]:not([data-intro-lead])"));
    const header = document.querySelector<HTMLElement>("[data-site-header]")!;
    // Reserve the entire closed bar independently of button travel and menu
    // expansion, so gathering never reflows the reading stage.
    const headerTop = header.querySelector<HTMLElement>("[data-header-corners]")!;
    const application = element.closest<HTMLElement>("[data-page-content]");
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const storageKey = "s01-reading-position";
    const entryKey = (window as Window & { navigation?: { currentEntry?: { key?: string } } }).navigation?.currentEntry?.key;
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    let restored: { y: number; progress: number; width: number; height: number; entryKey?: string } | undefined;
    try {
      const saved = sessionStorage.getItem(storageKey);
      const position = saved ? JSON.parse(saved) as typeof restored : undefined;
      if (navigation?.type === "reload" || navigation?.type === "back_forward" || (entryKey && position?.entryKey === entryKey)) restored = position;
    } catch { /* Storage is optional. */ }
    let live = true, enabled = false, everEnhanced = false, visible = false;
    let frame = 0, measureFrame = 0, start = 0, distance = 0, headerReserve = 0, lastY = scrollY;
    let measurementNeeded = true;
    let fontsReady = document.fonts.status === "loaded";
    const last = letters.map(() => -1);
    const reset = () => {
      enabled = false; delete element.dataset.readingEnhanced;
      element.style.removeProperty("height"); element.style.removeProperty("--reading-top"); stage.style.removeProperty("height");
      letters.forEach((letter, index) => { letter.style.removeProperty("opacity"); last[index] = -1; });
    };
    const paint = (y: number) => {
      const travelled = y - start;
      const progress = travelled >= distance - 1 ? 1 : clamp(travelled / distance);
      letters.forEach((letter, index) => {
        const opacity = characterOpacity(progress, index, letters.length);
        if (last[index] !== opacity) { letter.style.opacity = String(opacity); last[index] = opacity; }
      });
    };
    const render = () => {
      frame = 0;
      if (!live || !enabled || !visible || document.hidden || application?.inert) return;
      lastY = scrollY;
      paint(lastY);
    };
    const schedule = () => { if (live && enabled && visible && !document.hidden && !application?.inert && !frame) frame = requestAnimationFrame(render); };
    const measure = () => {
      measureFrame = 0;
      if (!live || document.hidden || application?.inert) return;
      measurementNeeded = false;
      try {
        if (preference.matches || !fontsReady) { reset(); return; }
        const bounds = element.getBoundingClientRect();
        const currentY = scrollY;
        // Delayed hydration/fonts keep a natural paragraph stable under its reader.
        if (!everEnhanced && !restored && scrollY > 100 && bounds.top < innerHeight && bounds.bottom > 0) return;
        // Collect layout reads before writing styles; the root's document top
        // and natural padding do not change when its sticky height is updated.
        const contentBounds = content.getBoundingClientRect();
        const decorationOverflow = Math.max(0, contentBounds.top - ring.getBoundingClientRect().top);
        headerReserve = headerTop.getBoundingClientRect().bottom + 12 + decorationOverflow;
        const sectionStyle = getComputedStyle(element);
        const paddingTop = parseFloat(sectionStyle.paddingTop);
        const paddingBottom = parseFloat(sectionStyle.paddingBottom);
        const contentHeight = contentBounds.height;
        const decorationBottom = Math.max(0, ring.getBoundingClientRect().bottom - contentBounds.bottom);
        const geometry = readingGeometry({ viewportHeight: innerHeight, headerReserve, contentHeight, decorationBottom, characters: letters.length });
        if (!geometry.enabled) { reset(); return; }
        distance = geometry.distance;
        start = bounds.top + currentY + paddingTop - headerReserve;
        element.style.setProperty("--reading-top", `${headerReserve}px`);
        element.style.height = `${geometry.height + paddingTop + paddingBottom}px`; stage.style.height = `${geometry.stageHeight}px`;
        element.dataset.readingEnhanced = "true"; enabled = true; everEnhanced = true;
        lastY = currentY;
        if (restored) {
          const y = restored.width === innerWidth && restored.height === innerHeight ? restored.y : start + restored.progress * distance;
          restored = undefined; lastY = y; scrollTo(0, y);
        }
        paint(lastY);
      } catch {
        // No enhancement failure may leave faded text or an empty sticky journey.
        reset();
      }
    };
    const scheduleMeasure = () => {
      measurementNeeded = true;
      if (live && !document.hidden && !application?.inert && !measureFrame) measureFrame = requestAnimationFrame(measure);
    };
    const remember = () => {
      if (!enabled) return;
      const y = location.pathname === "/" ? scrollY : lastY;
      try { sessionStorage.setItem(storageKey, JSON.stringify({ y, progress: clamp((y - start) / distance), width: innerWidth, height: innerHeight, entryKey })); }
      catch { /* Native navigation and readable content do not require storage. */ }
    };
    const visibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); cancelAnimationFrame(measureFrame); frame = 0; measureFrame = 0; }
      else if (measurementNeeded) scheduleMeasure();
      else schedule();
    };
    const onFonts = () => { fontsReady = true; scheduleMeasure(); };
    let intersection: IntersectionObserver | undefined, resize: ResizeObserver | undefined, pageLock: MutationObserver | undefined;
    try {
    intersection = new IntersectionObserver(entries => {
      visible = entries[0].intersectionRect.height > 0;
      if (visible) schedule(); else if (!enabled && fontsReady) scheduleMeasure();
      if (!visible) { cancelAnimationFrame(frame); frame = 0; }
    }, { threshold: [0, .01] });
    resize = new ResizeObserver(scheduleMeasure);
    pageLock = new MutationObserver(() => {
      if (application?.inert) {
        cancelAnimationFrame(frame); cancelAnimationFrame(measureFrame); frame = 0; measureFrame = 0;
        measurementNeeded = true;
      } else if (measurementNeeded) scheduleMeasure();
    });
    intersection.observe(element); resize.observe(content); resize.observe(headerTop);
    resize.observe(element.previousElementSibling!); resize.observe(document.querySelector('[data-section="hero"]')!);
    if (application) pageLock.observe(application, { attributes: true, attributeFilter: ["inert"] });
    } catch {
      intersection?.disconnect(); resize?.disconnect(); pageLock?.disconnect(); reset();
      return;
    }
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", scheduleMeasure); window.addEventListener("pageshow", scheduleMeasure);
    window.addEventListener("pagehide", remember); document.addEventListener("visibilitychange", visibility);
    preference.addEventListener("change", scheduleMeasure); document.fonts.addEventListener("loadingdone", onFonts);
    void document.fonts.ready.then(() => { if (live) onFonts(); });
    measure();
    return () => {
      remember(); live = false; cancelAnimationFrame(frame); cancelAnimationFrame(measureFrame);
      resize?.disconnect(); intersection?.disconnect(); pageLock?.disconnect();
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("pageshow", scheduleMeasure); window.removeEventListener("pagehide", remember);
      document.removeEventListener("visibilitychange", visibility); preference.removeEventListener("change", scheduleMeasure);
      document.fonts.removeEventListener("loadingdone", onFonts); reset();
    };
  }), []);
  return <section ref={root} id="home-introduction" className={className} data-section="introduction-reading" data-home-deferred data-entry-fonts={JSON.stringify(entryFonts)} aria-labelledby="home-introduction-heading">{children}</section>;
}
