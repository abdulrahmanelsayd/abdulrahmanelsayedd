"use client";

import { useEffect } from "react";
import { observeServicesActivity } from "./motion-activity";
import { letterPose, nearestLetter, type LetterPose } from "./hero-geometry";
import { outlineTimeline } from "./outline-timeline";

const ease = "cubic-bezier(.22,1,.36,1)";
const frame = (p: LetterPose) => ({ transform: `translate(${p.x}px,${p.y}px)`, width: `${p.width}px`, height: `${p.height}px` });

export function ServicesHeroInteraction() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-services-hero]")!;
    const stage = root.querySelector<HTMLButtonElement>("[data-services-hero-play]")!;
    const outline = root.querySelector<HTMLElement>("[data-services-hero-outline]")!;
    const letters = [...root.querySelectorAll<HTMLElement>("[data-services-hero-letter]")];
    const pupils = root.querySelector<SVGGElement>("[data-services-hero-pupils]")!;
    const eyes = root.querySelector<SVGGElement>("[data-services-hero-eyes]")!;
    const dot = root.querySelector<HTMLElement>("[data-services-hero-dot]")!;
    let poses: LetterPose[] = [], bounds = { left: 0, top: 0, width: 0, height: 0 };
    let live = true, ready = false, playing = false, measuredRAF = 0, selected = 0;
    const animations = new Set<Animation>();
    const pose = (index: number) => { if (poses[index]) Object.assign(outline.style, frame(poses[index])); };
    const stop = () => {
      animations.forEach(a => a.cancel()); animations.clear();
      playing = false; selected = 0; root.dataset.servicesHeroPlaying = "false"; pose(0);
      pupils.style.transform = "";
    };
    const sync = () => {
      if (activity.reduced.matches) stop();
      const active = ready && activity.active();
      stage.setAttribute("aria-disabled", String(!active));
      root.dataset.servicesHeroReady = String(ready && !activity.reduced.matches);
      for (const a of animations) { if (active && a.playState === "paused") a.play(); else if (!active && a.playState === "running") a.pause(); }
    };
    const activity = observeServicesActivity(root, sync);
    const measure = () => {
      measuredRAF = 0; if (!live || !stage.isConnected) return;
      if (playing) stop();
      const b = stage.getBoundingClientRect(); bounds = { left: b.left, top: b.top, width: b.width, height: b.height };
      let context: CanvasRenderingContext2D | null = null;
      try { context = document.createElement("canvas").getContext("2d"); } catch { /* Offset geometry is always available. */ }
      poses = letters.map(letter => {
        const word = letter.offsetParent as HTMLElement, style = getComputedStyle(letter);
        const size = parseFloat(style.fontSize), line = parseFloat(style.lineHeight);
        let ink: Parameters<typeof letterPose>[6];
        if (context) {
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const m = context.measureText(letter.firstChild?.textContent ?? "");
          ink = { actualBoundingBoxLeft: m.actualBoundingBoxLeft, actualBoundingBoxRight: m.actualBoundingBoxRight, actualBoundingBoxAscent: m.actualBoundingBoxAscent, actualBoundingBoxDescent: m.actualBoundingBoxDescent, fontBoundingBoxAscent: m.fontBoundingBoxAscent, fontBoundingBoxDescent: m.fontBoundingBoxDescent };
        }
        return letterPose(word.offsetLeft + letter.offsetLeft, word.offsetTop + letter.offsetTop, letter.offsetWidth, letter.offsetHeight, size, line, ink);
      });
      ready = !!b.width && poses.every(p => Object.values(p).every(Number.isFinite) && p.width > 0 && p.height > 0);
      pose(selected); sync();
    };
    const schedule = () => { if (live && !measuredRAF) measuredRAF = requestAnimationFrame(measure); };
    const look = (x: number, y: number) => {
      pupils.style.transform = `translate(${x}px,${y}px)`;
    };
    const move = (event: PointerEvent) => {
      if (!ready || !activity.active() || !activity.fine.matches || event.pointerType === "touch" || playing) return;
      const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
      look(Math.max(-3, Math.min(3, (x / bounds.width - .5) * 9)), Math.max(-2, Math.min(2, (y / bounds.height - .5) * 7)));
      selected = nearestLetter(poses, x); pose(selected);
    };
    const reset = () => { if (!activity.active() || playing) return; look(0, 0); selected = 0; pose(0); };
    const animate = (element: Element, keys: Keyframe[], options: KeyframeAnimationOptions) => {
      const a = element.animate(keys, options); animations.add(a); return a;
    };
    const play = () => {
      if (!ready || !activity.active() || playing) return;
      // Capture the displayed CSS transition before the playing flag removes it.
      const style = getComputedStyle(outline), matrix = new DOMMatrixReadOnly(style.transform);
      const width = parseFloat(style.width), height = parseFloat(style.height);
      const initial: LetterPose = { x: matrix.m41, y: matrix.m42, width, height, centre: matrix.m41 + width / 2 };
      playing = true; root.dataset.servicesHeroPlaying = "true";
      const spread = Math.min(16, bounds.width * .02), total = 1620;
      letters.forEach((letter, i) => {
        const start = 220 + i * 60, end = start + 460;
        animate(letter, [{ transform: "translateX(0)", offset: 0, easing: "cubic-bezier(0,0,.2,1)" }, { transform: `translateX(${(i - 2) * spread}px)`, offset: 200 / end }, { transform: `translateX(${(i - 2) * spread}px)`, offset: start / end, easing: ease }, { transform: "translateX(0)", offset: 1 }], { duration: end, easing: "linear" });
      });
      eyes.style.transformOrigin = "50px 20px";
      animate(eyes, [{ transform: "scaleY(1)" }, { transform: "scaleY(.05)", offset: .5 }, { transform: "scaleY(1)" }], { delay: 360, duration: 160, easing: "ease-in-out" });
      animate(dot, [{ transform: "scale(1)" }, { transform: "scale(.72)", offset: .5 }, { transform: "scale(1)" }], { delay: 730, duration: 240, easing: "ease-in-out" });
      const last = animate(outline, outlineTimeline(poses, initial), { duration: total, easing: "linear", fill: "forwards" });
      void last.finished.then(() => { if (live) stop(); }, () => {});
    };
    const resize = new ResizeObserver(schedule); resize.observe(stage);
    // Scroll only updates cached viewport coordinates, never the pointer handler.
    const scroll = () => { const b = stage.getBoundingClientRect(); bounds.left = b.left; bounds.top = b.top; };
    stage.addEventListener("pointermove", move); stage.addEventListener("pointerleave", reset); stage.addEventListener("click", play);
    window.addEventListener("scroll", scroll, { passive: true }); window.addEventListener("resize", schedule);
    document.fonts.addEventListener("loadingdone", schedule);
    void document.fonts.ready.then(() => { if (live) measure(); });
    sync();
    return () => {
      live = false; cancelAnimationFrame(measuredRAF); stop(); activity.dispose(); resize.disconnect();
      stage.removeEventListener("pointermove", move); stage.removeEventListener("pointerleave", reset); stage.removeEventListener("click", play);
      window.removeEventListener("scroll", scroll); window.removeEventListener("resize", schedule); document.fonts.removeEventListener("loadingdone", schedule);
      stage.setAttribute("aria-disabled", "true"); delete root.dataset.servicesHeroReady; delete root.dataset.servicesHeroPlaying;
    };
  }, []);
  return null;
}
