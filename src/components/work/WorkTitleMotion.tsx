"use client";

import { useEffect, useRef, type ReactNode } from "react";

const ease = "cubic-bezier(.22,1,.36,1)";
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Owns title effects only. Pointer tracking uses one frame loop; clicks share one wave. */
export function WorkTitleMotion({ children, className }: { children: ReactNode; className: string }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const hero = root.current;
    const stage = hero?.querySelector<HTMLButtonElement>("[data-work-playground]");
    const cursor = hero?.querySelector<HTMLElement>("[data-work-cursor]");
    if (!hero || !stage || !cursor) return;
    const letters = [...hero.querySelectorAll<HTMLElement>("[data-work-letter]")];
    const pupils = [...hero.querySelectorAll<SVGGElement>("[data-work-pupil]")];
    const eyes = [...hero.querySelectorAll<SVGGElement>("[data-work-eye]")];
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const entrances = new Set<Animation>();
    const wave = new Set<Animation>();
    let live = true;
    let frame = 0;
    let lastTime = 0;
    let width = 0;
    let height = 0;
    let centres: number[] = [];
    let home = { x: 0, y: 0 };
    const current = { x: 0, y: 0, eyeX: 0, eyeY: 0, lifts: letters.map(() => 0) };
    const target = { ...current, lifts: [...current.lifts] };
    const animate = (element: Element, keys: Keyframe[], options: KeyframeAnimationOptions, group?: Set<Animation>) => {
      const animation = element.animate(keys, options);
      animations.add(animation);
      group?.add(animation);
      animation.onfinish = () => {
        animation.cancel();
        animations.delete(animation);
        group?.delete(animation);
      };
    };
    const cancelGroup = (group: Set<Animation>) => {
      for (const animation of group) { animation.cancel(); animations.delete(animation); }
      group.clear();
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; lastTime = 0; };
    const clear = () => {
      stop();
      cancelGroup(animations);
      entrances.clear(); wave.clear();
      for (const letter of letters) letter.style.removeProperty("transform");
      for (const pupil of pupils) pupil.style.removeProperty("transform");
      current.eyeX = current.eyeY = target.eyeX = target.eyeY = 0;
      current.lifts.fill(0); target.lifts.fill(0);
    };
    const draw = (time: number) => {
      frame = 0;
      if (!live || media.matches) return;
      const dt = lastTime ? Math.min(time - lastTime, 64) : 16.7;
      lastTime = time;
      const amount = 1 - Math.exp(-dt / 75);
      let unsettled = false;
      for (const key of ["x", "y", "eyeX", "eyeY"] as const) {
        const delta = target[key] - current[key];
        current[key] = Math.abs(delta) < .05 ? target[key] : current[key] + delta * amount;
        unsettled ||= Math.abs(delta) >= .05;
      }
      cursor.style.translate = `${current.x}px ${current.y}px`;
      for (const pupil of pupils) pupil.style.transform = `translate(${current.eyeX}px,${current.eyeY}px)`;
      if (!wave.size) letters.forEach((letter, index) => {
        const delta = target.lifts[index] - current.lifts[index];
        current.lifts[index] = Math.abs(delta) < .05 ? target.lifts[index] : current.lifts[index] + delta * amount;
        if (current.lifts[index] === 0) letter.style.removeProperty("transform");
        else letter.style.transform = `translateY(${current.lifts[index]}px)`;
        unsettled ||= Math.abs(delta) >= .05;
      });
      if (unsettled) frame = requestAnimationFrame(draw);
      else lastTime = 0;
    };
    const schedule = () => { if (!frame && !media.matches) frame = requestAnimationFrame(draw); };
    const measure = () => {
      if (!live) return;
      clear();
      const rect = stage.getBoundingClientRect();
      width = rect.width; height = rect.height;
      centres = letters.map(letter => letter.offsetLeft + letter.offsetWidth / 2);
      const first = letters[0];
      home = { x: first.offsetLeft + first.offsetWidth - 26, y: first.offsetTop + first.offsetHeight * .72 };
      current.x = target.x = home.x; current.y = target.y = home.y;
      // CSS supplies a useful static cursor before hydration and with JS disabled.
      cursor.style.left = "0px"; cursor.style.top = "0px";
      cursor.style.translate = `${home.x}px ${home.y}px`;
    };
    const finishEntrance = () => cancelGroup(entrances);
    const move = (event: PointerEvent) => {
      if (media.matches || (event.pointerType !== "mouse" && event.pointerType !== "pen")) return;
      finishEntrance();
      const rect = stage.getBoundingClientRect();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      target.x = clamp(x + 12, 8, width - cursor.scrollWidth - 8);
      target.y = clamp(y + 12, 8, height - cursor.scrollHeight - 8);
      target.eyeX = clamp((x / width - .5) * 12, -4, 4);
      target.eyeY = clamp((y / height - .5) * 12, -4, 4);
      if (!wave.size) target.lifts = centres.map(centre => -Math.max(0, 1 - Math.abs(x - centre) / (width * .22)) * Math.min(10, width * .012));
      schedule();
    };
    const reset = () => {
      target.x = home.x; target.y = home.y;
      target.eyeX = target.eyeY = 0; target.lifts.fill(0);
      schedule();
    };
    const play = () => {
      finishEntrance();
      if (media.matches || wave.size) return;
      current.lifts.fill(0); target.lifts.fill(0);
      letters.forEach((letter, index) => {
        letter.style.removeProperty("transform");
        animate(letter, [
          { transform: "none", offset: 0 },
          { transform: `translateY(${-Math.min(22, width * .026)}px) scaleY(1.012)`, offset: .308 },
          { transform: "none", offset: 1 },
        ], { duration: 650, delay: index * 70, easing: ease }, wave);
      });
      for (const eye of eyes) animate(eye, [{ transform: "scaleY(1)" }, { transform: "scaleY(.05)" }, { transform: "scaleY(1)" }], { duration: 180, delay: 200 }, wave);
      animate(cursor, [{ scale: "1" }, { scale: ".85" }, { scale: "1" }], { duration: 260, easing: "ease-in-out" }, wave);
    };
    const availability = () => {
      stage.setAttribute("aria-disabled", String(media.matches));
      hero.dataset.workTitleReady = String(!media.matches);
    };
    const preference = () => {
      measure();
      // ARIA exposes availability while the native button keeps keyboard focus.
      availability();
    };
    measure();
    if (!media.matches && !stage.contains(document.activeElement)) {
      letters.forEach((letter, index) => animate(letter, [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 720, delay: index * 55, easing: ease, fill: "backwards" }, entrances));
      animate(cursor, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 450, fill: "backwards" }, entrances);
      const intro = hero.querySelector("[data-work-intro]");
      if (intro) animate(intro, [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 720, delay: 120, easing: ease, fill: "backwards" }, entrances);
      for (const path of hero.querySelectorAll<SVGPathElement>("[data-work-arrow] path")) {
        const length = path.getTotalLength();
        animate(path, [{ strokeDasharray: String(length), strokeDashoffset: String(length) }, { strokeDasharray: String(length), strokeDashoffset: "0" }], { duration: 1100, delay: 200, easing: "ease-out", fill: "backwards" }, entrances);
      }
    }
    // ResizeObserver's initial notification should not cancel the entry choreography.
    const resize = new ResizeObserver(() => {
      const rect = stage.getBoundingClientRect();
      if (Math.abs(rect.width - width) > .5 || Math.abs(rect.height - height) > .5) measure();
    });
    resize.observe(stage);
    void document.fonts.ready.then(() => {
      const first = letters[0];
      if (live && (Math.abs(first.offsetLeft + first.offsetWidth - 26 - home.x) > .5 || Math.abs(first.offsetTop + first.offsetHeight * .72 - home.y) > .5)) measure();
    });
    availability();
    stage.disabled = false;
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerleave", reset);
    stage.addEventListener("pointercancel", reset);
    stage.addEventListener("blur", reset);
    stage.addEventListener("focus", finishEntrance);
    stage.addEventListener("pointerdown", finishEntrance);
    stage.addEventListener("click", play);
    media.addEventListener("change", preference);
    return () => {
      live = false;
      clear();
      resize.disconnect();
      media.removeEventListener("change", preference);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerleave", reset);
      stage.removeEventListener("pointercancel", reset);
      stage.removeEventListener("blur", reset);
      stage.removeEventListener("focus", finishEntrance);
      stage.removeEventListener("pointerdown", finishEntrance);
      stage.removeEventListener("click", play);
      for (const property of ["translate", "left", "top"]) cursor.style.removeProperty(property);
      stage.disabled = true;
      stage.removeAttribute("aria-disabled");
      delete hero.dataset.workTitleReady;
    };
  }, []);
  return <section ref={root} className={className} data-section="work-title" aria-labelledby="work-title">{children}</section>;
}
