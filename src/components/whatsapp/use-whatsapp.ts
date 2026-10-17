"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

const desktopQuery = "(hover: hover) and (pointer: fine) and (min-width: 720px) and (min-height: 480px)";
const subscribe = (notify: () => void) => {
  const media = matchMedia(desktopQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const desktopSnapshot = () => matchMedia(desktopQuery).matches;
const serverSnapshot = () => false;
type Mode = "closed" | "hover" | "pinned";

export function useWhatsApp(blocked: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const ignoreHoverRef = useRef(false);
  const pointerWithinRef = useRef(false);
  const desktop = useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
  const [state, setState] = useState<{ desktop: boolean; blocked: boolean; mode: Mode }>({ desktop, blocked, mode: "closed" });
  const changed = state.desktop !== desktop || state.blocked !== blocked;
  if (changed) setState({ desktop, blocked, mode: "closed" });
  const mode = changed ? "closed" : state.mode;
  const open = desktop && !blocked && mode !== "closed";
  const setMode = (mode: Mode | ((previous: Mode) => Mode)) => setState(previous => ({ desktop, blocked, mode: typeof mode === "function" ? mode(previous.mode) : mode }));
  const dismiss = () => { ignoreHoverRef.current = true; setMode("closed"); };
  const toggle = () => { if (!blocked) { if (mode === "pinned") dismiss(); else setMode("pinned"); } };
  useLayoutEffect(() => {
    if (!desktop && rootRef.current?.contains(document.activeElement) && document.activeElement !== triggerRef.current) triggerRef.current?.focus({ preventScroll: true });
    // A modality change starts a fresh interaction instead of reopening a stale panel.
    ignoreHoverRef.current = false; pointerWithinRef.current = false;
  }, [desktop, blocked]);
  useEffect(() => {
    if (!open) return;
    const close = (restoreFocus: boolean) => {
      ignoreHoverRef.current = true;
      setState({ desktop, blocked, mode: "closed" });
      if (restoreFocus && rootRef.current?.contains(document.activeElement)) triggerRef.current?.focus({ preventScroll: true });
    };
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !rootRef.current?.contains(event.target)) close(true); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (rootRef.current?.contains(document.activeElement)) event.preventDefault();
      close(true);
    };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open, desktop, blocked]);
  return { rootRef, triggerRef, ignoreHoverRef, pointerWithinRef, desktop, mode, open, setMode, toggle };
}
