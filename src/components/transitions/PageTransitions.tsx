"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { lockScroll } from "../navigation/page-lock";
import { pauseScrollForMenu, synchronizePageScroll } from "../scroll/scroll-controller";
import { createCurtainMotion, waitForHeroImage, waitForHomeHero, type CurtainElements } from "./transition-motion";
import { pageLabel, transitionDestination, transitionTiming } from "./transition-settings";
import styles from "./PageTransitions.module.css";
import { createTransitionClock } from "./transition-clock";
import type { HomeEntry } from "./home-entry";

type Options = { replace?: boolean; scroll?: boolean; onCovered?: () => void };
type Navigate = (href: string, options?: Options) => boolean;
type Owner = { abort: AbortController; release: () => void; entry?: HomeEntry; destination?: URL; ready: () => void; initial: boolean; history: boolean; scroll: boolean; positioned: boolean; started: number; focus: HTMLElement | null };
const Context = createContext<Navigate | null>(null);
export function usePageTransition() { return useContext(Context); }

export function PageTransitions({ children }: { children: ReactNode }) {
  const router = useRouter(), pathname = usePathname();
  const shell = useRef<HTMLDivElement>(null), viewport = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null), top = useRef<HTMLDivElement>(null), bottom = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLDivElement>(null), text = useRef<HTMLSpanElement>(null);
  const announcement = useRef<HTMLDivElement>(null), lastPath = useRef(pathname);
  // The controller owns this text for its entire lifetime, including route commits.
  const [initialLabel] = useState(() => pathname === "/" ? "Hello" : pageLabel(pathname));
  const owner = useRef<Owner | null>(null), start = useRef<Navigate | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const navigate = useCallback<Navigate>((href, options) => start.current?.(href, options) ?? false, []);

  useLayoutEffect(() => {
    performance.mark("tr03:react-ready");
    const elements: CurtainElements = { viewport: viewport.current!, screen: screen.current!, top: top.current!, bottom: bottom.current!, words: words.current!, text: text.current! };
    const application = shell.current!, root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let live = true;
    const releaseEntry = () => root.dispatchEvent(new Event("page-entry-release"));
    const destinationTarget = (job: Owner) => {
      let hash = job.destination?.hash.slice(1) ?? "";
      try { hash = decodeURIComponent(hash); } catch { /* Invalid fragments retain the page's normal starting point. */ }
      return document.getElementById(hash || "main-content");
    };
    const positionDestination = (job: Owner) => {
      if (job.initial || job.history || !job.scroll || job.positioned || location.pathname !== job.destination?.pathname) return;
      job.positioned = true;
      const anchor = job.destination.hash ? destinationTarget(job) : null;
      window.scrollTo({ left: 0, top: anchor ? window.scrollY + anchor.getBoundingClientRect().top : 0, behavior: "instant" });
      synchronizePageScroll();
    };
    const finish = (job: Owner, focus: boolean, outcome = "complete") => {
      if (owner.current !== job) return;
      positionDestination(job);
      owner.current = null;
      if (job.entry) job.entry.finish(outcome);
      job.abort.abort(); job.release();
      if (announcement.current) announcement.current.textContent = "";
      delete root.dataset.pageTransition; releaseEntry(); synchronizePageScroll();
      root.dataset.transitionOutcome = outcome;
      if (focus) destinationTarget(job)?.focus({ preventScroll: true });
      else if (!job.initial && !job.history && job.focus?.isConnected) job.focus.focus({ preventScroll: true });
    };
    const acquire = (initial: boolean, history: boolean, destination?: URL, scroll = true): Owner => {
      const abort = new AbortController();
      // Bootstrap releases its own inert snapshot before this independent owner acquires it.
      const previousInert = application.inert;
      const previousBusy = application.getAttribute("aria-busy");
      const previousCursor = root.style.cursor;
      const unlock = lockScroll(); application.inert = true; application.setAttribute("aria-busy", "true"); root.style.cursor = "wait";
      if (announcement.current) announcement.current.textContent = `Loading ${pageLabel(destination?.pathname ?? location.pathname)}`;
      root.dataset.pageTransition = initial ? "initial" : "route";
      const job: Owner = { abort, destination, initial, history, scroll, positioned: false, started: performance.now(), ready: () => {}, focus: document.activeElement instanceof HTMLElement ? document.activeElement : null,
        release: () => {
          application.inert = previousInert; root.style.cursor = previousCursor; unlock();
          if (previousBusy === null) application.removeAttribute("aria-busy"); else application.setAttribute("aria-busy", previousBusy);
        } };
      owner.current = job;
      delete root.dataset.transitionOutcome;
      return job;
    };
    const run = async (job: Owner, options?: Options) => {
      const signal = job.abort.signal, clock = job.entry?.clock ?? createTransitionClock(signal), motion = createCurtainMotion(elements, signal, clock);
      if (!job.entry) void clock.delay(transitionTiming.deadline).then(() => {
        if (owner.current !== job) return;
        const missing = !job.initial && job.destination && location.pathname !== job.destination.pathname;
        finish(job, false, "deadline");
        if (missing && live) setFailure(job.destination!.pathname + job.destination!.search + job.destination!.hash);
      }, () => {});
      try {
        if (job.initial) {
          await Promise.all([job.entry?.greetings ?? motion.introduction(location.pathname === "/"), job.entry ? waitForHomeHero(signal) : waitForHeroImage(signal)]);
        } else {
          await motion.cover(pageLabel(job.destination!.pathname), job.history);
          if (signal.aborted) return;
          const ready = new Promise<void>(resolve => {
            // usePathname alone can commit while a streamed page still shows old content.
            const observer = new MutationObserver(check);
            function check() {
              if (location.pathname !== job.destination!.pathname || document.querySelector("main[data-route]")?.getAttribute("data-route") !== job.destination!.pathname) return;
              observer.disconnect(); resolve();
            }
            signal.addEventListener("abort", () => { observer.disconnect(); resolve(); }, { once: true });
            observer.observe(application, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-route"] });
            job.ready = check; check();
          });
          if (job.history) {
            if (document.querySelector("main[data-route]")?.getAttribute("data-route") === job.destination!.pathname) job.ready();
          } else {
            options?.onCovered?.();
            // Next still owns eventual positioning if Escape cancels only the visual layer.
            const href = job.destination!.pathname + job.destination!.search + job.destination!.hash;
            if (options?.replace) router.replace(href, { scroll: job.scroll });
            else router.push(href, { scroll: job.scroll });
          }
          await Promise.all([ready, clock.delay(transitionTiming.routeHold - clock.now())]);
          if (signal.aborted) return;
          positionDestination(job);
          await waitForHeroImage(signal);
        }
        if (signal.aborted) return;
        // A deliberate Home intro reveals the Hero, while history and fragment links keep their native position.
        if (job.initial && location.pathname === "/" && !location.hash) {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" }); synchronizePageScroll();
        }
        root.dataset.pageTransition = "revealing";
        if (job.entry) performance.mark("tr03:reveal-start");
        await motion.reveal(job.initial, location.pathname === "/");
        if (signal.aborted) return;
        if (job.entry) performance.mark("tr03:reveal-complete");
        finish(job, !job.initial && !job.history);
      } catch {
        if (!signal.aborted) finish(job, false, "error");
      }
    };
    const begin: Navigate = (href, options) => {
      let destination: URL | null;
      try { destination = transitionDestination(href, location.href); } catch { return false; }
      if (!destination || reduced.matches) return false;
      if (owner.current) return true;
      setFailure(null);
      const job = acquire(false, false, destination, options?.scroll !== false);
      // Fetch only after an actual navigation intent, while the curtain covers.
      // Visible/hovered links must not preload another page's images or styles.
      router.prefetch(destination.pathname + destination.search);
      void run(job, options);
      return true;
    };
    const history = () => {
      if (owner.current) finish(owner.current, false, "history");
      if (reduced.matches) return;
      const destination = new URL(location.href);
      if (destination.pathname === lastPath.current) return;
      const job = acquire(false, true, destination);
      void run(job);
    };
    const leave = () => { if (owner.current) finish(owner.current, false, "cancelled"); };
    const preference = () => { if (reduced.matches) leave(); };
    const key = (event: KeyboardEvent) => {
      if (!owner.current) return;
      if (owner.current.entry) return; // The adopted lease keeps its single key listener.
      if (event.key === "Escape") { event.preventDefault(); finish(owner.current, false, "cancelled"); }
      else if (event.key === "Tab") event.preventDefault();
    };
    start.current = begin;
    window.addEventListener("popstate", history); window.addEventListener("pagehide", leave);
    reduced.addEventListener("change", preference); document.addEventListener("keydown", key, true);
    if (root.dataset.pageEntry === "pending") {
      const entry = window.__homeEntry;
      if (entry?.active) {
        const job: Owner = { abort: entry.abort, entry, release: () => {}, ready: () => {}, initial: true, history: false, scroll: true, positioned: false, started: performance.now(), focus: null };
        if (entry.adopt(outcome => finish(job, false, outcome))) {
          job.release = pauseScrollForMenu(); owner.current = job;
          root.dataset.pageTransition = "initial"; delete root.dataset.transitionOutcome;
          void run(job);
        }
      } else {
        releaseEntry();
        if (!reduced.matches && !entry) { const job = acquire(true, false); void run(job); }
      }
    }
    return () => {
      live = false; start.current = null; leave(); releaseEntry();
      window.removeEventListener("popstate", history); window.removeEventListener("pagehide", leave);
      reduced.removeEventListener("change", preference); document.removeEventListener("keydown", key, true);
    };
  }, [router]);

  useLayoutEffect(() => {
    lastPath.current = pathname;
    const job = owner.current;
    if (job?.destination?.pathname === pathname) job.ready();
  }, [pathname]);
  return <Context value={navigate}>
    {/* The parser must receive the cover before any page content can paint. */}
    <div ref={viewport} className={styles.viewport} data-page-curtain data-phase="idle" aria-hidden="true" suppressHydrationWarning>
      <div ref={screen} className={styles.screen} data-curtain-screen>
        <div ref={top} className={`${styles.edge} ${styles.top}`} data-curtain-top><div className={styles.ellipse} /></div>
        <div ref={words} className={styles.words} data-curtain-words><span ref={text} className={styles.word} suppressHydrationWarning>{initialLabel}</span></div>
        <div ref={bottom} className={`${styles.edge} ${styles.bottom}`} data-curtain-bottom><div className={styles.ellipse} /></div>
      </div>
    </div>
    <div ref={shell} data-transition-shell suppressHydrationWarning>{children}</div>
    <div ref={announcement} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
    {failure && <div className={styles.status} role="status">That page didn’t open. <a href={failure}>Try again</a></div>}
  </Context>;
}
