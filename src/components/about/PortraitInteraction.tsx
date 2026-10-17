"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { observeMotionActivity } from "./motion-activity";

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
const ease = (progress: number) => 1 - (1 - Math.min(1, Math.max(0, progress))) ** 3;

export function PortraitInteraction({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const card = root.current!, photo = card.querySelector<HTMLElement>("[data-about-photo]")!;
    const face = card.querySelector<HTMLButtonElement>("[data-about-face]")!;
    const pupils = [...card.querySelectorAll<SVGGElement>("[data-about-pupil]")];
    const eye = card.querySelector<SVGGElement>("[data-about-wink]")!;
    const mouth = card.querySelector<SVGPathElement>("[data-about-mouth]")!;
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0, dirty = true, pointer: { x: number; y: number } | undefined;
    let bounds: { x: number; y: number; faceX: number; faceY: number } | undefined;
    let current = [0, 0, 0, 0], from = [...current], target = [...current], trackingStart = -Infinity;
    let smileStart: number | undefined;
    const stop = () => {
      cancelAnimationFrame(frame); frame = 0; pointer = undefined; smileStart = undefined;
      current = [0, 0, 0, 0]; from = [...current]; target = [...current]; trackingStart = -Infinity;
      photo.style.removeProperty("transform"); pupils.forEach(pupil => pupil.removeAttribute("transform"));
      eye.style.removeProperty("transform"); mouth.setAttribute("d", "M14 29Q24 41 34 29"); dirty = true;
    };
    const activity = observeMotionActivity(card, active => {
      face.setAttribute("aria-disabled", String(!active)); if (!active) stop();
    });
    const setTarget = (next: number[], now: number) => {
      if (next.every((value, i) => value === target[i])) return;
      from = [...current]; target = next; trackingStart = now;
    };
    const paint = (now: number) => {
      frame = 0;
      if (!activity.active()) { stop(); return; }
      current = target.map((value, i) => from[i] + (value - from[i]) * ease((now - trackingStart) / (i < 2 ? 450 : 280)));
      if (pointer) {
        if (dirty || !bounds) {
          // Cache document coordinates. Scroll only invalidates the cache; pointermove
          // itself never reads layout. ResizeObserver covers image/font/layout changes.
          const box = card.getBoundingClientRect(), mark = face.getBoundingClientRect();
          bounds = { x: box.left + scrollX + box.width / 2, y: box.top + scrollY + box.height / 2,
            faceX: mark.left + scrollX + mark.width / 2, faceY: mark.top + scrollY + mark.height / 2 };
          dirty = false;
        }
        setTarget([clamp((pointer.x - bounds.x) * .02, 4), clamp((pointer.y - bounds.y) * .015, 4),
          clamp((pointer.x - bounds.faceX) * .03, 2.2), clamp((pointer.y - bounds.faceY) * .03, 1.8)], now);
        pointer = undefined;
      }
      photo.style.transform = `translate(${current[0]}px,${current[1]}px)`;
      pupils.forEach(pupil => pupil.setAttribute("transform", `translate(${current[2]} ${current[3]})`));
      if (smileStart !== undefined) {
        const time = now - smileStart;
        const wink = time < 120 ? 1 - .92 * ease(time / 120) : time < 200 ? .08 : .08 + .92 * ease((time - 200) / 200);
        eye.style.transform = `scaleY(${wink})`;
        const half = time <= 210 ? time / 210 : (420 - time) / 210;
        const smile = Math.max(0, Math.min(1, half));
        const smooth = smile * smile * (3 - 2 * smile);
        mouth.setAttribute("d", `M14 29Q24 ${41 + 4 * smooth} 34 29`);
        if (time >= 420) { smileStart = undefined; eye.style.removeProperty("transform"); mouth.setAttribute("d", "M14 29Q24 41 34 29"); }
      }
      if (now - trackingStart < 450 || smileStart !== undefined) schedule();
    };
    const schedule = () => { if (!frame && activity.active()) frame = requestAnimationFrame(paint); };
    const move = (event: PointerEvent) => {
      if (!activity.active() || !fine.matches || !["mouse", "pen"].includes(event.pointerType)) return;
      pointer = { x: event.pageX, y: event.pageY }; schedule();
    };
    const leave = () => { pointer = undefined; setTarget([0, 0, 0, 0], performance.now()); schedule(); };
    const invalidate = () => { dirty = true; };
    const modality = () => { if (!fine.matches) leave(); };
    const smile = () => {
      if (!activity.active() || smileStart !== undefined) return;
      smileStart = performance.now(); schedule();
    };
    const resize = new ResizeObserver(invalidate); resize.observe(card); resize.observe(face);
    card.addEventListener("pointerenter", invalidate); card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave); card.addEventListener("pointercancel", leave);
    face.addEventListener("click", smile); fine.addEventListener("change", modality);
    window.addEventListener("resize", invalidate); window.addEventListener("scroll", invalidate, { passive: true });
    return () => {
      activity.dispose(); stop(); resize.disconnect();
      card.removeEventListener("pointerenter", invalidate); card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave); card.removeEventListener("pointercancel", leave);
      face.removeEventListener("click", smile); fine.removeEventListener("change", modality);
      window.removeEventListener("resize", invalidate); window.removeEventListener("scroll", invalidate);
    };
  }, []);
  return <figure ref={root} className={className} data-about-portrait>{children}</figure>;
}
