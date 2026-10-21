import { useEffect, type RefObject } from "react";

/** Move the visual layers while the native button keeps a stationary hit area. */
export function useMenuHover(trigger: RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    const button = trigger.current;
    const surface = button?.querySelector<HTMLElement>("[data-header-menu-surface]");
    const label = button?.querySelector<HTMLElement>("[data-header-menu-label]");
    if (!button || !surface || !label) return;
    const media = matchMedia("(min-width:541px) and (hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)");
    let frame = 0, bounds: DOMRect | undefined, x = 0, y = 0, tracking = false;
    const paint = () => {
      frame = 0;
      surface.style.transform = `translate(${x * 20}px,${y * 20}px)`;
      label.style.transform = `translate(${x * 10}px,${y * 10}px)`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType !== "mouse" || event.buttons) return;
      bounds ??= button.getBoundingClientRect();
      if (!tracking) { button.setAttribute("data-menu-hover", "tracking"); tracking = true; }
      x = Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - .5));
      y = Math.max(-.5, Math.min(.5, (event.clientY - bounds.top) / bounds.height - .5));
      schedule();
    };
    const enter = (event: PointerEvent) => {
      if (media.matches && event.pointerType === "mouse") bounds = button.getBoundingClientRect();
    };
    const reset = () => {
      bounds = undefined; x = y = 0; tracking = false;
      button.removeAttribute("data-menu-hover");
      schedule();
    };
    const clear = () => {
      cancelAnimationFrame(frame); frame = 0;
      bounds = undefined; x = y = 0; tracking = false;
      button.removeAttribute("data-menu-hover");
      surface.style.removeProperty("transform"); label.style.removeProperty("transform");
    };
    const visibility = () => { if (document.hidden) clear(); };
    button.addEventListener("pointerenter", enter); button.addEventListener("pointermove", move);
    button.addEventListener("pointerleave", reset); button.addEventListener("pointercancel", reset);
    button.addEventListener("pointerdown", reset); button.addEventListener("blur", reset); button.addEventListener("keydown", reset);
    window.addEventListener("blur", reset); window.addEventListener("resize", reset);
    document.addEventListener("visibilitychange", visibility); media.addEventListener("change", clear);
    return () => {
      clear();
      button.removeEventListener("pointerenter", enter); button.removeEventListener("pointermove", move);
      button.removeEventListener("pointerleave", reset); button.removeEventListener("pointercancel", reset);
      button.removeEventListener("pointerdown", reset); button.removeEventListener("blur", reset); button.removeEventListener("keydown", reset);
      window.removeEventListener("blur", reset); window.removeEventListener("resize", reset);
      document.removeEventListener("visibilitychange", visibility); media.removeEventListener("change", clear);
    };
  }, [trigger]);
}
