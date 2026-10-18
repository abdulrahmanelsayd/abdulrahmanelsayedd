import { greetingTimes, greetings, motionEase, transitionTiming } from "./transition-settings";
import { createTransitionClock } from "./transition-clock";
import { homeGreetings } from "./home-entry";

export type CurtainElements = { viewport: HTMLElement; screen: HTMLElement; top: HTMLElement; bottom: HTMLElement; words: HTMLElement; text: HTMLElement };

export function abortableDelay(duration: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const cancel = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = window.setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, Math.max(0, duration));
    signal.addEventListener("abort", cancel, { once: true });
  });
}

export function waitForHeroImage(signal: AbortSignal) {
  const image = document.querySelector<HTMLImageElement>("[data-hero-photo]");
  if (!image) return Promise.resolve();
  return new Promise<void>(resolve => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true; clearTimeout(timer);
      image.removeEventListener("load", decode); image.removeEventListener("error", done);
      signal.removeEventListener("abort", done); resolve();
    };
    const decode = () => { void image.decode().then(done, done); };
    const timer = window.setTimeout(done, 4000);
    signal.addEventListener("abort", done, { once: true });
    if (image.complete) decode();
    else { image.addEventListener("load", decode, { once: true }); image.addEventListener("error", done, { once: true }); }
  });
}

/** Home cannot reveal an undecoded photograph or a hero whose controller is still absent. */
export function waitForHomeHero(signal: AbortSignal) {
  return new Promise<void>(resolve => {
    let decoded: HTMLImageElement | undefined, decoding: HTMLImageElement | undefined;
    const done = () => { observer.disconnect(); document.removeEventListener("load", check, true); signal.removeEventListener("abort", done); resolve(); };
    const check = () => {
      if (signal.aborted) { done(); return; }
      const hero = document.querySelector<HTMLElement>('main[data-route="/"] [data-section="hero"]');
      const image = hero?.querySelector<HTMLImageElement>("[data-hero-photo]");
      if (!image || !image.complete || !image.naturalWidth) return;
      if (decoded !== image) {
        if (decoding === image) return;
        decoding = image;
        void image.decode().then(() => { decoded = image; check(); }, () => {});
        return;
      }
      if (hero?.dataset.heroEntry !== "complete" || !hero.querySelector("[data-hero-location]") || !hero.querySelector("[data-hero-description]") || !hero.querySelector("#home-hero-heading")) return;
      performance.mark("tr03:hero-ready"); done();
    };
    const observer = new MutationObserver(check);
    observer.observe(document.querySelector("[data-transition-shell]") ?? document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-hero-entry", "src", "srcset"] });
    document.addEventListener("load", check, true); signal.addEventListener("abort", done, { once: true }); check();
  });
}

/** One finite owner; cancellation removes every effect and all temporary inline styles. */
export function createCurtainMotion(elements: CurtainElements, signal: AbortSignal, clock = createTransitionClock(signal)) {
  const animations = new Set<Animation>();
  const originals = new Map<HTMLElement, string | null>();
  const save = (element: HTMLElement) => { if (!originals.has(element)) originals.set(element, element.getAttribute("style")); };
  const play = (element: HTMLElement, frames: Keyframe[], duration: number, easing = "linear", delay = 0) => {
    const supported = CSS.supports("animation-timing-function", easing) ? easing : "cubic-bezier(.76,0,.24,1)";
    const animation = element.animate(frames, { duration, easing: supported, delay, fill: "both" });
    animations.add(animation);
    if (document.hidden) animation.pause();
    return animation.finished.then(() => {}, () => {});
  };
  const phase = (value: string) => { elements.viewport.dataset.phase = value; };
  const position = (element: HTMLElement, transform: string) => { save(element); element.style.transform = transform; };
  const label = (value: string) => { elements.text.textContent = value; };
  const show = (covered: boolean) => {
    elements.viewport.dataset.active = "true";
    position(elements.screen, covered ? "translateY(0)" : "translateY(100%)");
    position(elements.top, "scaleY(0)"); position(elements.bottom, "scaleY(1)");
  };
  const cover = async (name: string, history = false) => {
    show(history); phase("covering"); label(name);
    save(elements.words); elements.words.style.opacity = "0";
    if (!history) {
      await Promise.all([
        play(elements.screen, [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], 500, motionEase.cover),
        play(elements.top, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], 400, motionEase.cover),
      ]);
    }
    if (signal.aborted) return;
    phase("waiting");
    void play(elements.words, [{ opacity: 0, transform: "translate(-50%, 0)" }, { opacity: 1, transform: "translate(-50%, -50px)" }], 800, motionEase.words, history ? 0 : 50);
  };
  const introduction = async (home: boolean) => {
    if (home) return homeGreetings(elements, { greetings, times: greetingTimes, hold: transitionTiming.homeHold, deadline: transitionTiming.deadline, easing: motionEase.words }, clock, signal);
    show(true); phase("greeting"); label(home ? greetings[0] : elements.text.textContent ?? "Home");
    save(elements.words); elements.words.style.opacity = "1"; return clock.delay(500);
  };
  const reveal = async (initial: boolean, home: boolean) => {
    phase("revealing");
    // The top cap is no longer visible once the screen is fully covering the viewport.
    position(elements.top, "scaleY(0)");
    const content = document.querySelector<HTMLElement>("[data-page-content]");
    const hero = content?.querySelector<HTMLElement>('[data-section="hero"]');
    const targets = hero
      ? ["[data-hero-photo-layer]", "[data-hero-location]", "[data-hero-description]", "#home-hero-heading"].map(selector => hero.querySelector<HTMLElement>(selector)).filter((element): element is HTMLElement => !!element)
      : [...content?.querySelectorAll<HTMLElement>("main > :not(style):not(script):not(noscript)") ?? []].slice(0, 3);
    const distance = innerWidth > 540 ? "50vh" : initial ? "10vh" : "20vh";
    // Home must reach its final composition before the curtain leaves it exposed.
    // Child name/globe loops remain independent of this finite entrance.
    const delay = home ? 0 : initial ? 200 : 150;
    const duration = home ? transitionTiming.reveal : 1000;
    const stagger = home ? 0 : 50;
    const jobs = [
      play(elements.screen, [{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], 800, initial ? motionEase.initialReveal : motionEase.routeReveal),
      play(elements.bottom, [{ transform: "scaleY(1)" }, { transform: "scaleY(0)" }], initial ? 1000 : 850, initial ? motionEase.initialReveal : motionEase.routeReveal, initial ? 0 : 200),
      play(elements.words, [{ opacity: 1 }, { opacity: 0 }], initial ? 300 : 600, "linear", initial ? 200 : 0),
      ...targets.map((element, index) => play(element, [{ transform: `translate3d(0,${distance},0)` }, { transform: "translate3d(0,0,0)" }], duration, motionEase.content, delay + index * stagger)),
    ];
    await Promise.all(jobs);
  };
  const dispose = () => {
    document.removeEventListener("visibilitychange", visibility);
    animations.forEach(animation => animation.cancel()); animations.clear();
    originals.forEach((style, element) => { if (style === null) element.removeAttribute("style"); else element.setAttribute("style", style); });
    originals.clear(); delete elements.viewport.dataset.active; elements.viewport.dataset.phase = "idle";
  };
  const visibility = () => animations.forEach(animation => {
    if (animation.playState === "finished" || animation.playState === "idle") return;
    if (document.hidden) animation.pause(); else animation.play();
  });
  document.addEventListener("visibilitychange", visibility);
  signal.addEventListener("abort", dispose, { once: true });
  return { cover, introduction, reveal, dispose };
}
