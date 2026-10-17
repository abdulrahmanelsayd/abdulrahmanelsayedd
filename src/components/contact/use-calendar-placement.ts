"use client";

import { useLayoutEffect, type RefObject } from "react";

export function keepCalendarFocusVisible(panel: HTMLElement, target: HTMLElement) {
  const box = panel.getBoundingClientRect(), item = target.getBoundingClientRect();
  if (item.top < box.top + 6) panel.scrollTop -= box.top + 6 - item.top;
  else if (item.bottom > box.bottom - 6) panel.scrollTop += item.bottom - box.bottom + 6;
}

/** Geometry and listeners exist only while the panel is open. */
export function useCalendarPlacement(open: boolean, anchorRef: RefObject<HTMLInputElement | null>, panelRef: RefObject<HTMLDivElement | null>, month: string) {
  useLayoutEffect(() => {
    const panel = panelRef.current, anchor = anchorRef.current;
    if (!open || !panel || !anchor) return;
    let frame = 0;
    const place = () => {
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? innerWidth, height = viewport?.height ?? innerHeight;
      const panelWidth = Math.min(300, Math.max(0, width - 40));
      panel.style.width = `${panelWidth}px`;
      const rect = anchor.getBoundingClientRect();
      const x = Math.max(left + 20, Math.min(rect.left, left + width - 20 - panelWidth));
      const header = document.querySelector<HTMLElement>("[data-header-bar]")?.getBoundingClientRect();
      const underHeader = header && x < header.right && x + panelWidth > header.left;
      const safeTop = Math.max(top + 20, underHeader ? header.bottom + 12 : top + 20);
      const safeBottom = top + height - 20;
      const naturalHeight = panel.scrollHeight + 2;
      const below = rect.bottom + 8, above = rect.top - naturalHeight - 8;
      const fitsBelow = below >= safeTop && below + naturalHeight <= safeBottom;
      const fitsAbove = above >= safeTop && rect.top - 8 <= safeBottom;
      const bounded = !fitsBelow && !fitsAbove;
      panel.style.position = bounded ? "fixed" : "absolute";
      const parent = panel.offsetParent?.getBoundingClientRect();
      Object.assign(panel.style, {
        left: `${bounded ? x : x - (parent?.left ?? 0)}px`,
        top: `${bounded ? safeTop : (fitsBelow ? below : above) - (parent?.top ?? 0)}px`,
        maxHeight: `${Math.max(0, safeBottom - safeTop)}px`,
      });
      panel.dataset.placement = bounded ? "bounded" : fitsBelow ? "below" : "above";
      if (panel.contains(document.activeElement)) keepCalendarFocusVisible(panel, document.activeElement as HTMLElement);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; place(); }); };
    const focus = (event: FocusEvent) => keepCalendarFocusVisible(panel, event.target as HTMLElement);
    const observer = new ResizeObserver(schedule);
    observer.observe(panel); observer.observe(anchor);
    place();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    panel.addEventListener("focusin", focus);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener("resize", schedule); window.removeEventListener("scroll", schedule);
      window.visualViewport?.removeEventListener("resize", schedule); window.visualViewport?.removeEventListener("scroll", schedule);
      panel.removeEventListener("focusin", focus);
    };
  }, [open, anchorRef, panelRef, month]);
}
