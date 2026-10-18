/** Delay below-Hero controllers only while the parser's initial Home cover owns them. */
export function afterHomeEntry(element: HTMLElement | null, setup: () => void | (() => void)): () => void {
  const root = document.documentElement;
  let disposed = false, started = false, cleanup: void | (() => void);
  const start = () => {
    if (disposed || started || root.dataset.homeEntry === "pending" || !element?.isConnected) return;
    started = true;
    root.removeEventListener("home-entry-layout", start);
    cleanup = setup();
  };
  root.addEventListener("home-entry-layout", start);
  start();
  return () => {
    if (disposed) return;
    disposed = true; root.removeEventListener("home-entry-layout", start); cleanup?.();
  };
}

/** Abort releases each owned listener/frame, including a font request that cannot be canceled. */
function untilSettled(task: Promise<unknown>, signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    const finish = () => { signal.removeEventListener("abort", finish); resolve(); };
    if (signal.aborted) { finish(); return; }
    signal.addEventListener("abort", finish, { once: true });
    void task.then(finish, finish);
  });
}
function parsedHome(signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (signal.aborted || document.querySelector("[data-home-content-ready]")) { resolve(); return; }
    const finish = () => { observer.disconnect(); signal.removeEventListener("abort", finish); resolve(); };
    const observer = new MutationObserver(() => { if (document.querySelector("[data-home-content-ready]")) finish(); });
    signal.addEventListener("abort", finish, { once: true });
    observer.observe(document, { childList: true, subtree: true });
  });
}
function nextFrame(signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (signal.aborted) { resolve(); return; }
    const finish = () => { cancelAnimationFrame(frame); signal.removeEventListener("abort", finish); resolve(); };
    const frame = requestAnimationFrame(finish);
    signal.addEventListener("abort", finish, { once: true });
  });
}

/** Fonts and geometry must settle while covered, never on the visitor's first scroll. */
export async function prepareHomeLayout(signal: AbortSignal): Promise<void> {
  const root = document.documentElement;
  if (signal.aborted || root.dataset.homeEntry !== "pending") return;
  performance.mark("home-entry:layout-start");
  await parsedHome(signal);
  if (signal.aborted) return;
  const source = document.querySelector<HTMLElement>("[data-entry-fonts]");
  const fonts: unknown = JSON.parse(source?.dataset.entryFonts ?? "[]");
  if (Array.isArray(fonts)) {
    await untilSettled(Promise.allSettled(fonts.filter((font): font is string => typeof font === "string").map(font => document.fonts.load(font))), signal);
  }
  if (signal.aborted) return;
  root.dataset.homeEntry = "preparing";
  root.dispatchEvent(new Event("home-entry-layout"));
  await nextFrame(signal);
  await nextFrame(signal);
  if (!signal.aborted) performance.mark("home-entry:layout-ready");
}
