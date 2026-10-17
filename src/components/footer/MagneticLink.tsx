"use client";

import { TransitionLink as Link } from "../transitions/TransitionLink";
import { useEffect, useRef, type ComponentProps } from "react";

/** Pointer events only update a target; one frame writes the cached elements. */
export function MagneticLink(props: ComponentProps<typeof Link>) {
  const root = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const button = root.current;
    if (!button) return;
    const text = button.querySelector<HTMLElement>("[data-footer-button-text]");
    const aboutFooter = button.closest<HTMLElement>('[data-footer-from="about"]');
    const media = matchMedia("(min-width:541px) and (hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)");
    let frame = 0, bounds: DOMRect | undefined, x = 0, y = 0;
    const paint = () => {
      frame = 0;
      if (aboutFooter?.hasAttribute("data-about-footer-held")) return;
      button.style.transform = 'translate(' + x * 7.5 + 'px,' + y * 7.5 + 'px)';
      if (text) text.style.transform = 'translate(' + x * 4.8 + 'px,' + y * 4.8 + 'px)';
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const enter = () => { bounds = button.getBoundingClientRect(); };
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType !== "mouse" || !bounds) return;
      x = (event.clientX - bounds.left) / bounds.width - .5;
      y = (event.clientY - bounds.top) / bounds.height - .5;
      schedule();
    };
    const reset = () => { x = y = 0; schedule(); };
    const clear = () => {
      cancelAnimationFrame(frame); frame = 0; bounds = undefined;
      if (aboutFooter?.hasAttribute("data-about-footer-held")) return;
      button.style.removeProperty('transform'); text?.style.removeProperty('transform');
    };
    const resume = () => { schedule(); };
    button.addEventListener("pointerenter", enter); button.addEventListener("pointermove", move);
    button.addEventListener("pointerleave", reset); button.addEventListener("blur", reset);
    media.addEventListener("change", clear); window.addEventListener('resize', clear);
    aboutFooter?.addEventListener("about-footer-release", resume);
    return () => {
      clear(); button.removeEventListener("pointerenter", enter); button.removeEventListener("pointermove", move);
      button.removeEventListener("pointerleave", reset); button.removeEventListener("blur", reset);
      media.removeEventListener("change", clear); window.removeEventListener('resize', clear);
      aboutFooter?.removeEventListener("about-footer-release", resume);
    };
  }, []);
  return <Link {...props} ref={root} />;
}

