"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { afterHomeEntry } from "../transitions/entry-layout";

export function ProjectStatementMotion({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => afterHomeEntry(root.current, () => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const paths = [...root.current!.querySelectorAll<SVGPathElement>("[data-statement-draw] path")];
    const animations = new Map<SVGPathElement, Animation>();
    const reset = () => { animations.forEach(animation => animation.cancel()); animations.clear(); paths.forEach(path => { path.style.removeProperty("stroke-dasharray"); path.style.removeProperty("stroke-dashoffset"); }); };
    const observer = new IntersectionObserver(entries => {
      if (preference.matches) return;
      for (const entry of entries) {
        const path = entry.target as SVGPathElement;
        if (entry.isIntersecting) {
          if (animations.has(path)) continue;
          path.style.strokeDasharray = "1";
          animations.set(path, path.animate([{strokeDashoffset:"1"},{strokeDashoffset:"0"}], {delay:100,duration:800,easing:"cubic-bezier(.25,.46,.45,.94)",fill:"both"}));
        } else if (entry.boundingClientRect.top >= innerHeight) {
          animations.get(path)?.cancel(); animations.delete(path); path.style.removeProperty("stroke-dasharray");
        }
      }
    });
    paths.forEach(path => observer.observe(path)); preference.addEventListener("change", reset);
    return () => { observer.disconnect(); preference.removeEventListener("change", reset); reset(); };
  }), []);
  return <div ref={root} className={className} data-project-statement>{children}</div>;
}
