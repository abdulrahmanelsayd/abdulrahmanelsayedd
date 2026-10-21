"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { lockPage } from "./page-lock";

type Phase = "closed" | "open" | "closing";
export function useNavigationMenu() {
  const pathname = usePathname();
  const [state, setState] = useState<{ pathname: string; phase: Phase }>({ pathname, phase: "closed" });
  // History or an unrelated route change cannot retain an old route's menu state.
  if (state.pathname !== pathname) setState({ pathname, phase: "closed" });
  const phase = state.pathname === pathname ? state.phase : "closed";
  const active = phase !== "closed";
  const application = useRef<HTMLDivElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const release = useRef<((restoreScroll?: boolean) => void) | null>(null);
  const returnFocus = useRef(false);
  const finish = useCallback(() => setState({ pathname, phase: "closed" }), [pathname]);
  const close = useCallback((navigation = false) => {
    returnFocus.current = !navigation;
    if (navigation) {
      // Unlock before Next performs its native scroll/focus work.
      release.current?.(false);
      release.current = null;
      finish();
    } else setState(current => current.phase === "closed" ? current : { pathname, phase: "closing" });
  }, [finish, pathname]);
  const toggle = () => {
    if (phase === "open") close();
    else {
      returnFocus.current = false;
      // Snapshot/lock before React changes menu styles; the layout effect reuses
      // this owner instead of forcing a second full style pass after the commit.
      if (!release.current && application.current) release.current = lockPage(application.current);
      setState({ pathname, phase: "open" });
    }
  };
  useLayoutEffect(() => {
    if (!active || !application.current) return;
    const unlock = release.current ?? lockPage(application.current);
    release.current = unlock;
    return () => { unlock(false); if (release.current === unlock) release.current = null; };
  }, [active]);
  useLayoutEffect(() => {
    if (active || !returnFocus.current) return;
    returnFocus.current = false;
    trigger.current?.focus({ preventScroll: true });
  }, [active]);
  useEffect(() => {
    if (phase !== "closing") return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const complete = () => {
      release.current?.(true);
      release.current = null;
      finish();
    };
    const timer = setTimeout(complete, reduced.matches ? 0 : 1100);
    const changed = () => { if (reduced.matches) { clearTimeout(timer); complete(); } };
    reduced.addEventListener("change", changed);
    return () => { clearTimeout(timer); reduced.removeEventListener("change", changed); };
  }, [phase, finish]);
  useEffect(() => {
    if (!active) return;
    const controls = () => [...scope.current?.querySelectorAll<HTMLElement>("a[href], button") ?? []]
      .filter(el => el.tabIndex >= 0 && el.getClientRects().length > 0 && !el.closest("[inert]") && !el.matches(":disabled") && getComputedStyle(el).visibility !== "hidden");
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key !== "Tab") return;
      event.preventDefault();
      const items = controls();
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = index < 0 ? (event.shiftKey ? items.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + items.length) % items.length;
      items[next]?.focus({ preventScroll: false });
    };
    const focus = () => {
      if (!scope.current?.contains(document.activeElement)) trigger.current?.focus({ preventScroll: true });
    };
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!controls().includes(document.activeElement as HTMLElement)) trigger.current?.focus({ preventScroll: true });
      });
    };
    const history = () => close(true);
    trigger.current?.focus({ preventScroll: true });
    document.addEventListener("keydown", key);
    document.addEventListener("focusin", focus);
    window.addEventListener("resize", resize);
    window.addEventListener("popstate", history);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", key); document.removeEventListener("focusin", focus);
      window.removeEventListener("resize", resize); window.removeEventListener("popstate", history);
    };
  }, [active, close]);
  return { application, scope, trigger, phase, toggle, close };
}
