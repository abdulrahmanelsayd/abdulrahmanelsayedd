/** All finite motion and its watchdog spend visible time, never background time. */
export function createTransitionClock(signal: AbortSignal) {
  let elapsed = 0, since = performance.now(), hidden = document.hidden;
  const listeners = new Set<() => void>();
  const now = () => elapsed + (hidden ? 0 : performance.now() - since);
  const visibility = () => {
    elapsed = now(); since = performance.now(); hidden = document.hidden;
    listeners.forEach(listener => listener());
  };
  document.addEventListener("visibilitychange", visibility);
  signal.addEventListener("abort", () => {
    document.removeEventListener("visibilitychange", visibility);
  }, { once: true });
  const delay = (duration: number) => new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const end = now() + Math.max(0, duration);
    let timer = 0;
    const cleanup = () => { clearTimeout(timer); listeners.delete(schedule); signal.removeEventListener("abort", cancel); };
    const cancel = () => { cleanup(); reject(signal.reason); };
    const schedule = () => {
      clearTimeout(timer);
      if (hidden) return;
      const remaining = end - now();
      if (remaining <= 0) { cleanup(); resolve(); }
      else timer = window.setTimeout(schedule, remaining);
    };
    listeners.add(schedule); signal.addEventListener("abort", cancel, { once: true }); schedule();
  });
  return { now, delay };
}
