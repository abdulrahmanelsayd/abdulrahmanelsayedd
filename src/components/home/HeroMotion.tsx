"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

const cycle = 18000;

/** Enhance the existing server track without replacing or hiding its first pose. */
export function HeroMotion({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const hero = root.current!;
    const track = hero.querySelector<HTMLElement>("[data-hero-track]")!;
    const copy = hero.querySelector<HTMLElement>("[data-hero-name-copy]")!;
    const application = hero.closest<HTMLElement>("[data-page-content]");
    const shell = hero.closest<HTMLElement>("[data-transition-shell]");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    let visible = false, live = true, lastY = scrollY, direction = 1, width = 0;
    const sync = () => {
      const entering = document.documentElement.dataset.pageTransition === "revealing";
      const running = visible && !document.hidden && !application?.inert && (!shell?.inert || entering) && !reduced.matches;
      if (running) animation?.play(); else animation?.pause();
      hero.dataset.heroRunning = String(running);
    };
    const measure = () => {
      if (!live) return;
      if (reduced.matches) { animation?.cancel(); animation = undefined; width = 0; sync(); return; }
      const next = copy.getBoundingClientRect().width;
      if (next === width && animation) return;
      const time = ((Number(animation?.currentTime ?? 0) % cycle) + cycle) % cycle;
      animation?.cancel(); width = next;
      animation = track.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-width}px)` }], { duration: cycle, iterations: Infinity, easing: "linear", direction: direction > 0 ? "normal" : "reverse" });
      animation.currentTime = cycle + time;
      sync();
    };
    const onScroll = () => {
      const delta = scrollY - lastY; lastY = scrollY;
      if (Math.abs(delta) <= .5 || !animation) return;
      const next = delta > 0 ? 1 : -1;
      if (next === direction) return;
      const time = ((Number(animation.currentTime) % cycle) + cycle) % cycle;
      direction = next;
      animation.effect?.updateTiming({ direction: direction > 0 ? "normal" : "reverse" });
      animation.currentTime = cycle + (cycle - time) % cycle;
    };
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
    const resize = new ResizeObserver(measure);
    const menu = new MutationObserver(sync);
    intersection.observe(hero); resize.observe(copy);
    if (application) menu.observe(application, { attributes: true, attributeFilter: ["inert"] });
    if (shell) menu.observe(shell, { attributes: true, attributeFilter: ["inert"] });
    menu.observe(document.documentElement, { attributes: true, attributeFilter: ["data-page-transition"] });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", measure);
    measure();
    hero.dataset.heroEntry = "complete";
    return () => {
      live = false; animation?.cancel(); intersection.disconnect(); resize.disconnect(); menu.disconnect();
      window.removeEventListener("scroll", onScroll); document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", measure); delete hero.dataset.heroRunning;
    };
  }, []);
  return <section ref={root} className={className} data-section="hero" aria-labelledby="home-hero-heading">{children}</section>;
}
