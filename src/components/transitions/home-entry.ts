import type { createTransitionClock } from "./transition-clock";

type Clock = ReturnType<typeof createTransitionClock>;
type Settings = { greetings: readonly string[]; times: readonly number[]; hold: number; deadline: number; easing: string };
type Elements = { viewport: HTMLElement; words: HTMLElement; text: HTMLElement };

/** Shared by the parser entry and the React fallback. No absolute-time catch-up. */
export async function homeGreetings(elements: Elements, settings: Settings, clock: Clock, signal: AbortSignal) {
  if (signal.aborted) return;
  elements.viewport.dataset.active = "true"; elements.viewport.dataset.phase = "greeting";
  elements.text.textContent = settings.greetings[0];
  performance.mark("tr03:greetings-start");
  const animation = elements.words.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 800, delay: 500, fill: "both", easing: CSS.supports("animation-timing-function", settings.easing) ? settings.easing : "cubic-bezier(.76,0,.24,1)",
  });
  let pausedByVisibility: object | undefined, disposed = false;
  const visibility = () => {
    if (disposed || signal.aborted) return;
    const state = animation.playState;
    if (state === "finished" || state === "idle") { pausedByVisibility = undefined; return; }
    if (document.hidden) {
      // A pending play is running; a pending pause already belongs to its caller.
      if (state === "running" && !pausedByVisibility) { pausedByVisibility = {}; animation.pause(); }
    } else if (pausedByVisibility) {
      const pause = pausedByVisibility;
      const resume = () => {
        if (disposed || signal.aborted || document.hidden || pausedByVisibility !== pause || animation.pending) return;
        pausedByVisibility = undefined;
        if (animation.playState === "paused" && animation.effect && animation.replaceState !== "removed") animation.play();
      };
      // Let a pending pause establish its hold time before resuming that same animation.
      if (animation.pending) void animation.ready.then(resume, () => { if (pausedByVisibility === pause) pausedByVisibility = undefined; });
      else resume();
    }
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true; pausedByVisibility = undefined;
    document.removeEventListener("visibilitychange", visibility); signal.removeEventListener("abort", dispose);
    animation.cancel();
  };
  document.addEventListener("visibilitychange", visibility);
  signal.addEventListener("abort", dispose, { once: true });
  visibility();
  for (let index = 1; index < settings.greetings.length; index++) {
    await clock.delay(settings.times[index] - settings.times[index - 1]);
    if (signal.aborted) return;
    elements.text.textContent = settings.greetings[index];
  }
  await clock.delay(settings.hold - settings.times[settings.times.length - 1]);
}

export type HomeEntry = {
  abort: AbortController; clock: Clock; greetings: Promise<void>; active: boolean;
  adopt: (cancel: (outcome: string) => void) => boolean; finish: (outcome?: string) => void;
};
declare global { interface Window { __homeEntry?: HomeEntry } }

/** Parser-only lease and greetings, not the router/reveal controller. Serialized once in the head. */
export function startHomeEntry(settings: Settings, makeClock: typeof createTransitionClock, greet: typeof homeGreetings) {
  if (window.__homeEntry) return;
  const root = document.documentElement, abort = new AbortController(), clock = makeClock(abort.signal);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"), owned = new Map<HTMLElement, boolean>();
  let cancelOwner: ((outcome: string) => void) | undefined, claimed = false, started = false;
  let resolveGreetings: () => void;
  const greetings = new Promise<void>(resolve => { resolveGreetings = resolve; });
  const finish = (outcome = "complete") => {
    if (!entry.active) return;
    entry.active = false; abort.abort(); observer.disconnect();
    document.removeEventListener("keydown", key, true); reduced.removeEventListener("change", preference);
    window.removeEventListener("pagehide", leave); window.removeEventListener("popstate", leave);
    owned.forEach((inert, element) => { element.inert = inert; }); owned.clear();
    delete root.dataset.pageEntry; delete root.dataset.pageTransition; delete root.dataset.homeEntry;
    root.dispatchEvent(new Event("home-entry-layout"));
    const viewport = document.querySelector<HTMLElement>("[data-page-curtain]");
    if (viewport) { delete viewport.dataset.active; viewport.dataset.phase = "idle"; }
    root.dataset.transitionOutcome = outcome;
    resolveGreetings(); performance.mark("tr03:unlock");
  };
  const cancel = (outcome: string) => { if (cancelOwner) cancelOwner(outcome); else finish(outcome); };
  const key = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); cancel("cancelled"); }
    else if (["Tab", "PageUp", "PageDown", " ", "Home", "End", "ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault();
  };
  const preference = () => { if (reduced.matches) cancel("cancelled"); };
  const leave = () => cancel("cancelled");
  const attach = () => {
    document.querySelectorAll<HTMLElement>("[data-transition-shell]").forEach(element => {
      if (!owned.has(element)) { owned.set(element, element.inert); element.inert = true; }
    });
    const viewport = document.querySelector<HTMLElement>("[data-page-curtain]");
    const words = viewport?.querySelector<HTMLElement>("[data-curtain-words]"), text = words?.querySelector<HTMLElement>("span");
    // Parser readiness is independent of application bundles and router initialization.
    if (started || !owned.size || !viewport || !words || !text || getComputedStyle(viewport).position !== "fixed") return;
    started = true; observer.disconnect();
    void greet({ viewport, words, text }, settings, clock, abort.signal).then(resolveGreetings, () => {});
  };
  const observer = new MutationObserver(attach);
  const entry: HomeEntry = { abort, clock, greetings, active: true, finish,
    adopt: callback => { if (!entry.active || claimed) return false; claimed = true; cancelOwner = callback; return true; },
  };
  window.__homeEntry = entry; root.dataset.pageEntry = "pending"; root.dataset.homeEntry = "pending";
  document.addEventListener("keydown", key, true); reduced.addEventListener("change", preference);
  window.addEventListener("pagehide", leave); window.addEventListener("popstate", leave);
  observer.observe(document, { childList: true, subtree: true });
  // This single visible-time budget survives adoption, image waits, and reveal.
  void clock.delay(settings.deadline).then(() => cancel("deadline"), () => {});
  attach();
}
