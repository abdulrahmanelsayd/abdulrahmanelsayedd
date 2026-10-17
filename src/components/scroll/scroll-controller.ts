import type Lenis from "lenis";
import { finePointerQuery, mixedPointerQuery, scrollSettings } from "./scroll-settings";

type Controller = { synchronize: () => void; menu: (locked: boolean) => void; destroy: () => void };
let current: Controller | undefined;
let menuLocked = false;
let lockOwners = 0;

/** Called synchronously by page-lock, before it captures the real page position. */
export function pauseScrollForMenu() {
  lockOwners++;
  menuLocked = true;
  current?.menu(true);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    menuLocked = --lockOwners > 0;
    current?.menu(menuLocked);
  };
}

export function synchronizePageScroll() { current?.synchronize(); }

/** One window-based engine, one demand-driven RAF, and no React updates while scrolling. */
export function createScrollController(load: () => Promise<typeof Lenis>): Controller {
  current?.destroy();
  const fine = matchMedia(finePointerQuery), mixed = matchMedia(mixedPointerQuery);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let engine: Lenis | undefined, Constructor: typeof Lenis | undefined;
  let frame = 0, live = true, loading = false, failed = false;
  let lastWritten = window.scrollY, direction = 0;
  const eligible = () => !reduced.matches && (fine.matches || mixed.matches);
  const cancelFrame = () => { cancelAnimationFrame(frame); frame = 0; };
  // stop/start resets the internal target to actualScroll without writing a scroll position.
  const synchronize = () => {
    cancelFrame(); direction = 0;
    if (!engine) return;
    engine.stop();
    engine.time = 0;
    if (!menuLocked && !document.hidden) engine.start();
    lastWritten = window.scrollY;
  };
  const render = (time: number) => {
    frame = 0;
    if (!live || !engine || menuLocked || document.hidden) return;
    // Native focus, scrollIntoView, browser restoration, or a scrollbar drag owns its position.
    if (Math.abs(window.scrollY - lastWritten) > 1) { synchronize(); return; }
    engine.raf(time);
    lastWritten = window.scrollY;
    if (engine.isScrolling === "smooth") frame = requestAnimationFrame(render);
  };
  const schedule = () => {
    if (frame || !live || !engine || menuLocked || document.hidden || engine.isScrolling !== "smooth") return;
    engine.time = performance.now();
    lastWritten = window.scrollY;
    frame = requestAnimationFrame(render);
  };
  const disposeEngine = () => {
    synchronize(); engine?.destroy(); engine = undefined;
  };
  const configure = () => {
    if (!live) return;
    if (!eligible()) { disposeEngine(); return; }
    if (engine || loading || failed) return;
    if (!Constructor) {
      loading = true;
      void load().then(value => { Constructor = value; loading = false; configure(); }).catch(() => { loading = false; failed = true; });
      return;
    }
    const started = performance.now();
    try {
      engine = new Constructor({
        ...scrollSettings,
        wrapper: window,
        content: document.documentElement,
        // Known internal scrollers opt out individually; the gallery remains on the page.
        prevent: node => node.hasAttribute("data-scroll-native") || node.matches("input,textarea,select,[contenteditable]:not([contenteditable=false])"),
        virtualScroll: ({ event, deltaY }) => {
          if (event.type !== "wheel" || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) { synchronize(); return false; }
          if (menuLocked || document.hidden) return true;
          const nextDirection = Math.sign(deltaY);
          if (direction && nextDirection && nextDirection !== direction) synchronize();
          direction = nextDirection;
          // Lenis starts the animation after this hook; wake the loop only once it exists.
          queueMicrotask(schedule);
          return true;
        },
      });
      synchronize();
      performance.measure("sc01:engine-init", { start: started, end: performance.now() });
    } catch { engine?.destroy(); engine = undefined; failed = true; }
  };
  const nativeScroll = () => {
    if (engine?.isScrolling === "smooth" && Math.abs(window.scrollY - lastWritten) > 1) synchronize();
  };
  const key = (event: KeyboardEvent) => {
    if (["Tab", "PageUp", "PageDown", " ", "Home", "End", "ArrowUp", "ArrowDown"].includes(event.key)) synchronize();
  };
  const click = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest("a[href]")) synchronize();
  };
  const visibility = () => { synchronize(); };
  const mediaChanged = () => { synchronize(); configure(); };
  const pointer = () => { synchronize(); };
  for (const query of [fine, mixed, reduced]) query.addEventListener("change", mediaChanged);
  document.addEventListener("keydown", key, true);
  document.addEventListener("focusin", synchronize, true);
  document.addEventListener("pointerdown", pointer, true);
  document.addEventListener("click", click, true);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("scroll", nativeScroll, { passive: true });
  window.addEventListener("popstate", synchronize);
  window.addEventListener("hashchange", synchronize);
  window.addEventListener("pageshow", synchronize);
  window.addEventListener("pagehide", synchronize);
  window.addEventListener("blur", synchronize);
  const controller: Controller = {
    synchronize,
    menu: () => { synchronize(); },
    destroy: () => {
      if (!live) return;
      live = false; disposeEngine();
      for (const query of [fine, mixed, reduced]) query.removeEventListener("change", mediaChanged);
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("focusin", synchronize, true);
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("scroll", nativeScroll);
      window.removeEventListener("popstate", synchronize);
      window.removeEventListener("hashchange", synchronize);
      window.removeEventListener("pageshow", synchronize);
      window.removeEventListener("pagehide", synchronize);
      window.removeEventListener("blur", synchronize);
      if (current === controller) current = undefined;
    },
  };
  current = controller;
  configure();
  return controller;
}
