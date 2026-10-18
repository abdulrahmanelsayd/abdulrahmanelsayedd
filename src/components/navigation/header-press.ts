/** Keep native header targets still through a press during the bar's width transition. */
export function holdHeaderPress(header: HTMLElement): () => void {
  const bar = header.querySelector<HTMLElement>("[data-header-bar]")!;
  const top = header.querySelector<HTMLElement>("[data-header-top]")!;
  let pointer: number | undefined, timer = 0;
  let owned: Animation[] = [];
  const release = () => {
    clearTimeout(timer); timer = 0; pointer = undefined;
    owned.forEach(animation => {
      if (animation.playState === "paused" && animation.replaceState !== "removed") animation.play();
    });
    owned = [];
  };
  const down = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0 || pointer !== undefined || !(event.target instanceof Element) || !top.contains(event.target)) return;
    if (!event.target.closest("a,button")) return;
    pointer = event.pointerId;
    // Only this bar's active width transition belongs to this temporary owner.
    // Panel/content animations and externally paused effects continue untouched.
    owned = bar.getAnimations().filter(animation => animation.playState === "running");
    owned.forEach(animation => {
      const time = animation.currentTime;
      animation.pause(); if (time !== null) animation.currentTime = time;
    });
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    // Native click follows pointerup; do not resume moving its target beforehand.
    clearTimeout(timer); timer = window.setTimeout(release, 0);
  };
  const cancel = (event: PointerEvent) => { if (event.pointerId === pointer) release(); };
  const visibility = () => { if (document.hidden) release(); };
  header.addEventListener("pointerdown", down);
  header.addEventListener("click", release);
  window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel); window.addEventListener("blur", release);
  document.addEventListener("visibilitychange", visibility);
  return () => {
    release(); header.removeEventListener("pointerdown", down); header.removeEventListener("click", release);
    window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel); window.removeEventListener("blur", release);
    document.removeEventListener("visibilitychange", visibility);
  };
}
