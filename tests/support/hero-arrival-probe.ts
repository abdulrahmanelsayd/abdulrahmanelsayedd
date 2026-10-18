type Pose = {
  at: number;
  phase: string | null;
  clientWidth: number;
  heroWidth: number;
  targets: Array<{ selector: string; x: number; y: number; width: number; height: number; translationY: number; running: number }>;
};

declare global {
  interface Window {
    __heroArrival: { first?: Pose; after?: Pose; beforeUnlock?: Pose };
  }
}

/** Diagnostic geometry only: never use this frame sampler for performance scoring. */
export function installHeroArrivalProbe() {
  const probe = window.__heroArrival = {} as Window["__heroArrival"];
  let revealed = false;
  const sample = (hero: Element, phase: string | null): Pose => ({
    at: performance.now(), phase, clientWidth: document.documentElement.clientWidth,
    heroWidth: hero.getBoundingClientRect().width,
    targets: ["[data-hero-photo-layer]", "[data-hero-location]", "[data-hero-description]", "#home-hero-heading"].map(selector => {
      const element = hero.querySelector(selector)!;
      const rect = element.getBoundingClientRect();
      const transform = getComputedStyle(element).transform;
      return { selector, x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        translationY: transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42,
        running: element.getAnimations().filter(animation => animation.playState === "running" || animation.pending).length };
    }),
  });
  const frame = () => {
    const hero = document.querySelector('main[data-route="/"] [data-section="hero"]');
    const phase = document.querySelector("[data-page-curtain]")?.getAttribute("data-phase") ?? null;
    if (hero && phase === "revealing") revealed = true;
    if (hero && revealed) {
      const covers = ["[data-curtain-screen]", "[data-curtain-bottom]"]
        .flatMap(selector => document.querySelector(selector)?.getAnimations() ?? []);
      const uncovered = phase === "idle" || covers.length > 0 && covers.every(animation => animation.playState === "finished");
      if (uncovered && !probe.first) probe.first = sample(hero, phase);
      if (phase === "revealing") probe.beforeUnlock = sample(hero, phase);
      if (probe.first && phase === "idle" && performance.now() - probe.first.at >= 450) {
        probe.after = sample(hero, phase);
        return;
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
