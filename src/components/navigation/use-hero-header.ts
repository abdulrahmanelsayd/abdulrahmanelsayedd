"use client";

import { useLayoutEffect, useRef } from "react";
import { headerMotion, heroHeaderState, type HeroHeaderState } from "./hero-header-geometry";

type Phase = "closed" | "open" | "closing";
type Point = { x: number; y: number };

/** Cached scroll geometry, two states, finite motion from the current visible pose. */
export function useHeroHeader(pathname: string, phase: Phase) {
  const root = useRef<HTMLElement>(null);
  const changePhase = useRef<((next: Phase) => void) | null>(null);
  useLayoutEffect(() => {
    const header = root.current!;
    if (pathname !== "/") return;
    const hero = document.querySelector<HTMLElement>("[data-section=hero]");
    if (!hero) return;
    const menu = header.querySelector<HTMLElement>("[data-menu-toggle]")!;
    const actions = header.querySelector<HTMLElement>("[data-header-actions]")!;
    const brand = header.querySelector<HTMLElement>("[data-brand-interactive]")!;
    const back = header.querySelector<HTMLElement>("[data-header-back]")!;
    const top = header.querySelector<HTMLElement>("[data-header-top]")!;
    const corners = header.querySelector<HTMLElement>("[data-header-corners]")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Map<HTMLElement, Animation>();
    let paused: Animation[] = [];
    let frame = 0, measureFrame = 0, releaseTimer = 0;
    let live = true, initialized = false, needsMeasure = false, needsPaint = false;
    let openingPose: DOMRect[] | undefined;
    let pressed: number | null = null, currentPhase: Phase = "closed", pendingPhase: Phase = "closed";
    let state: HeroHeaderState = "corners", bottom = 0;
    let menuCorner: Point = { x: 0, y: 0 }, actionsCorner: Point = { x: 0, y: 0 };
    // Native/history restoration may follow hydration by a frame.
    let restoreUntil = performance.now() + 500;
    const transform = ({ x, y }: Point) => `translate3d(${x}px,${y}px,0)`;
    const stop = (element: HTMLElement) => { animations.get(element)?.cancel(); animations.delete(element); };
    const tween = (element: HTMLElement, property: "transform" | "opacity", value: string, immediate: boolean, duration: number = headerMotion.duration, delay = 0, from?: string) => {
      const start = from ?? getComputedStyle(element)[property];
      stop(element);
      element.style[property] = value;
      if (immediate || reduced.matches || start === value) return;
      const animation = element.animate([{ [property]: start }, { [property]: value }], {
        duration, delay, easing: headerMotion.easing, fill: "backwards",
      });
      animations.set(element, animation);
      void animation.finished.then(() => { if (animations.get(element) === animation) { animations.delete(element); animation.cancel(); } }).catch(() => {});
    };
    const paintBrand = (immediate: boolean) => {
      const focused = brand.contains(document.activeElement);
      const visible = focused || currentPhase !== "closed" || (innerWidth >= 640 && state === "docked");
      brand.inert = !visible;
      tween(brand, "opacity", visible ? "1" : "0", immediate || focused, headerMotion.logo,
        visible && currentPhase === "closed" && !focused ? headerMotion.duration - headerMotion.logo : 0);
    };
    const paint = (immediate = false, from?: DOMRect[]) => {
      if (!live || currentPhase !== "closed") return;
      if (pressed !== null) { needsPaint = true; return; }
      needsPaint = false;
      const docked = state === "docked";
      // Only remeasurement supplies `from`; scroll state changes read no bounds.
      const bases = from ? [menu.getBoundingClientRect(), actions.getBoundingClientRect()] : undefined;
      tween(menu, "transform", transform(docked ? { x: 0, y: 0 } : menuCorner), immediate, headerMotion.duration, 0,
        from && bases ? transform({ x: from[0].left - bases[0].left, y: from[0].top - bases[0].top }) : undefined);
      tween(actions, "transform", transform(docked ? { x: 0, y: 0 } : actionsCorner), immediate, headerMotion.duration, 0,
        from && bases ? transform({ x: from[1].left - bases[1].left, y: from[1].top - bases[1].top }) : undefined);
      tween(back, "opacity", docked ? "1" : "0", immediate, headerMotion.background,
        docked ? headerMotion.duration - headerMotion.background : 0);
      paintBrand(immediate);
      header.dataset.heroHeaderState = state;
      header.dataset.scrolled = String(docked);
    };
    const read = (immediate = false) => {
      frame = 0;
      // A 92svh mobile Hero reaches the return threshold at scroll zero.
      const next = scrollY <= 1 ? "corners" : heroHeaderState(bottom - scrollY, innerHeight, state);
      if (next !== state) { state = next; paint(immediate || performance.now() < restoreUntil); }
    };
    const schedule = () => { if (live && !frame) frame = requestAnimationFrame(() => read()); };
    const measure = (immediate = false, previousPose?: DOMRect[]) => {
      measureFrame = 0;
      if (!live) return;
      if (pressed !== null || currentPhase !== "closed") { needsMeasure = true; return; }
      needsMeasure = false;
      const previous = previousPose ?? (initialized ? [menu.getBoundingClientRect(), actions.getBoundingClientRect()] : undefined);
      stop(menu); stop(actions);
      menu.style.transform = "none"; actions.style.transform = "none";
      const h = hero.getBoundingClientRect(), m = menu.getBoundingClientRect(), a = actions.getBoundingClientRect(), edge = corners.getBoundingClientRect();
      bottom = h.bottom + scrollY;
      menuCorner = { x: edge.left - m.left, y: edge.top - m.top };
      actionsCorner = { x: edge.right - a.right, y: edge.top - a.top };
      state = scrollY <= 1 ? "corners" : heroHeaderState(h.bottom, innerHeight, immediate ? undefined : state);
      paint(immediate || !initialized, previous);
      initialized = true;
    };
    const resize = () => { if (!measureFrame) measureFrame = requestAnimationFrame(() => measure()); };
    const applyPhase = (next: Phase) => {
      pendingPhase = next;
      if (pressed !== null || next === currentPhase) return;
      const wasClosed = currentPhase === "closed";
      currentPhase = next;
      if (next === "closing") return; // Preserve the expanded panel's closing timeline.
      if (next === "closed") {
        const previous = [menu.getBoundingClientRect(), actions.getBoundingClientRect()];
        header.dataset.homeLayout = "closed";
        stop(menu); stop(actions); menu.style.transform = "none"; actions.style.transform = "none";
        measure(false, previous);
      } else if (wasClosed) {
        // Captured in the native click before React invalidates menu styles.
        const previous = openingPose ?? [menu.getBoundingClientRect(), actions.getBoundingClientRect()];
        openingPose = undefined;
        stop(menu); stop(actions); menu.style.transform = "none"; actions.style.transform = "none";
        header.dataset.homeLayout = "menu";
        const bases = [menu.getBoundingClientRect(), actions.getBoundingClientRect()];
        [menu, actions].forEach((element, index) => tween(element, "transform", "translate3d(0px,0px,0)", false, headerMotion.duration, 0,
          transform({ x: previous[index].left - bases[index].left, y: previous[index].top - bases[index].top })));
        tween(back, "opacity", "1", false, headerMotion.background);
        paintBrand(false);
      }
    };
    const release = () => {
      if (!live || pressed === null) return;
      pressed = null;
      paused.forEach(animation => { if (animation.playState === "paused") animation.play(); }); paused = [];
      applyPhase(pendingPhase);
      if (needsMeasure) measure();
      read();
      if (currentPhase === "closed" && needsPaint) paint();
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || pressed !== null || !(event.target instanceof Node) ||
          ![menu, actions, brand].some(element => element.contains(event.target as Node))) return;
      restoreUntil = 0;
      pressed = event.pointerId;
      paused = [...animations.values()].filter(animation => animation.playState === "running" || animation.pending);
      paused.forEach(animation => { const time = animation.currentTime; animation.pause(); if (time !== null) animation.currentTime = time; });
    };
    // Once native click has its target, capture the held pose and release before
    // React commits. Cancelled/outside pointerups still use the fallback task.
    const click = () => {
      openingPose = [menu.getBoundingClientRect(), actions.getBoundingClientRect()];
      clearTimeout(releaseTimer); release();
    };
    const up = (event: PointerEvent) => { if (event.pointerId === pressed) { clearTimeout(releaseTimer); releaseTimer = window.setTimeout(release, 0); } };
    const cancel = () => { clearTimeout(releaseTimer); release(); };
    const focus = () => { if (pressed === null) paintBrand(true); };
    const restore = () => { restoreUntil = performance.now() + 500; measure(true); };
    const intent = () => { restoreUntil = 0; };
    const preference = () => { if (reduced.matches) { animations.forEach(animation => animation.finish()); if (pressed === null) { if (currentPhase === "closed") measure(true); else paintBrand(true); } } };
    header.dataset.heroHeader = "true";
    header.dataset.homeLayout = "closed";
    changePhase.current = applyPhase;
    const observer = new ResizeObserver(resize);
    observer.observe(hero); observer.observe(top); observer.observe(menu); observer.observe(actions); observer.observe(corners);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", resize); window.visualViewport?.addEventListener("resize", resize);
    window.addEventListener("pageshow", restore); window.addEventListener("popstate", restore);
    window.addEventListener("wheel", intent, { passive: true }); window.addEventListener("keydown", intent);
    header.addEventListener("pointerdown", down); header.addEventListener("click", click);
    window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up); window.addEventListener("blur", cancel);
    header.addEventListener("focusin", focus); header.addEventListener("focusout", focus);
    reduced.addEventListener("change", preference); document.fonts.addEventListener("loadingdone", resize);
    measure(true);
    return () => {
      live = false; changePhase.current = null;
      cancelAnimationFrame(frame); cancelAnimationFrame(measureFrame); clearTimeout(releaseTimer); observer.disconnect();
      animations.forEach(animation => animation.cancel()); paused.forEach(animation => { if (animation.playState === "paused") animation.play(); });
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", resize); window.visualViewport?.removeEventListener("resize", resize);
      window.removeEventListener("pageshow", restore); window.removeEventListener("popstate", restore);
      window.removeEventListener("wheel", intent); window.removeEventListener("keydown", intent);
      header.removeEventListener("pointerdown", down); header.removeEventListener("click", click); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); window.removeEventListener("blur", cancel);
      header.removeEventListener("focusin", focus); header.removeEventListener("focusout", focus);
      reduced.removeEventListener("change", preference); document.fonts.removeEventListener("loadingdone", resize);
      [menu, actions].forEach(element => element.style.removeProperty("transform"));
      brand.style.removeProperty("opacity"); back.style.removeProperty("opacity"); brand.inert = false;
      delete header.dataset.heroHeader; delete header.dataset.heroHeaderState;
    };
  }, [pathname]);
  useLayoutEffect(() => { changePhase.current?.(phase); }, [phase, pathname]);
  return root;
}
