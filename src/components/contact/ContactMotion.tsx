"use client";

import { useEffect } from "react";

/** Enhancement only: SSR content is visible even when hydration is delayed. */
export function ContactMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('main[data-route="/contact"]');
    if (!root) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Map<HTMLElement, Animation>();
    let observer: IntersectionObserver | undefined;
    const finish = (event: FocusEvent) => {
      for (const [item, animation] of animations) if (item.contains(event.target as Node)) animation.cancel();
    };
    const clear = () => { observer?.disconnect(); animations.forEach(animation => animation.cancel()); animations.clear(); };
    const reveal = (item: HTMLElement, delay = 0, hello = false) => {
      // Focused controls must stay visible; form geometry never moves.
      if (item.contains(document.activeElement)) return;
      const stationary = !!item.querySelector("form"), distance = item.hasAttribute("data-contact-reveal") ? 24 : 18;
      const animation = item.animate([
        { opacity: 0, ...(stationary ? {} : { transform: hello ? "translateY(8px) scale(.96)" : `translateY(${distance}px)` }) },
        { opacity: 1, ...(stationary ? {} : { transform: "none" }) },
      ], { duration: 720, delay, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
      animations.set(item, animation);
      animation.onfinish = () => { animations.delete(item); };
    };
    const setup = () => {
      clear();
      if (media.matches) return;
      // Avoid replaying an entrance over content the user has already been reading.
      if (performance.now() < 1500) {
        root.querySelectorAll<HTMLElement>("[data-contact-enter]").forEach((item, index) => reveal(item, index * 55));
        const hello = root.querySelector<HTMLElement>("[data-contact-hello]");
        if (hello) reveal(hello, 120, true);
      }
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) { observer?.unobserve(entry.target); reveal(entry.target as HTMLElement); }
      }, { rootMargin: "0px 0px -8% 0px" });
      root.querySelectorAll<HTMLElement>("[data-contact-reveal]").forEach(item => {
        const box = item.getBoundingClientRect();
        if (performance.now() >= 1500 && box.top < innerHeight * .92 && box.bottom > 0) return;
        observer?.observe(item);
      });
    };
    setup();
    root.addEventListener("focusin", finish, true);
    media.addEventListener("change", setup);
    return () => { clear(); root.removeEventListener("focusin", finish, true); media.removeEventListener("change", setup); };
  }, []);
  return null;
}
