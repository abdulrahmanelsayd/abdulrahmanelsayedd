"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Animate only when a card enters the scene; CSS/SSR never hides pending cards. */
export function WorkGalleryMotion({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const gallery = root.current;
    if (!gallery) return;
    const cards = [...gallery.querySelectorAll<HTMLElement>("[data-work-card]")];
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const seen = new Set<HTMLElement>();
    const active = new Map<HTMLElement, Animation>();
    const finish = (card: HTMLElement) => {
      active.get(card)?.cancel();
      active.delete(card);
      seen.add(card);
      observer?.unobserve(card);
    };
    let observer: IntersectionObserver | undefined;
    const cancel = () => { for (const card of active.keys()) finish(card); };
    const observe = () => {
      observer?.disconnect();
      cancel();
      if (media.matches || !window.IntersectionObserver) return;
      observer = new IntersectionObserver(entries => {
        const columns = getComputedStyle(gallery).gridTemplateColumns.split(" ").length;
        for (const entry of entries) {
          const card = entry.target as HTMLElement;
          if (!entry.isIntersecting || seen.has(card)) continue;
          seen.add(card);
          observer?.unobserve(card);
          if (card.contains(document.activeElement)) continue;
          const animation = card.animate([
            { opacity: 0, transform: "translateY(24px) scale(.985)" },
            { opacity: 1, transform: "none" },
          ], { duration: 720, delay: (cards.indexOf(card) % columns) * 55, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
          active.set(card, animation);
          animation.onfinish = () => finish(card);
        }
      }, { rootMargin: "0px 0px -8% 0px" });
      for (const card of cards) if (!seen.has(card)) observer.observe(card);
    };
    const focus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const card = target.closest<HTMLElement>("[data-work-card]");
      if (!card) return;
      finish(card);
      if (target.matches(":focus-visible")) {
        // In a short landscape viewport the whole card cannot fit. Keep its name
        // and destination in view while the anchor retains keyboard focus.
        const caption = card.querySelector<HTMLElement>("[data-work-caption]");
        if (caption && target.getBoundingClientRect().height > innerHeight - 120)
          caption.scrollIntoView({ block: "center", behavior: "instant" });
        else target.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
    };
    let previousWidth = gallery.getBoundingClientRect().width;
    const resize = new ResizeObserver(() => {
      const width = gallery.getBoundingClientRect().width;
      if (width !== previousWidth) { previousWidth = width; cancel(); }
    });
    resize.observe(gallery);
    gallery.addEventListener("focusin", focus);
    media.addEventListener("change", observe);
    observe();
    return () => {
      observer?.disconnect();
      resize.disconnect();
      gallery.removeEventListener("focusin", focus);
      media.removeEventListener("change", observe);
      cancel();
    };
  }, []);
  return <ul ref={root} className={className} data-work-gallery>{children}</ul>;
}
