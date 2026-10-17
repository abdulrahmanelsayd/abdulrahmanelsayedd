/** A local follower sleeps when stationary and never runs for coarse pointers. */
export function projectCursor(element: HTMLElement, targets: HTMLElement[], blocked: () => boolean) {
  const cursor = element.querySelector<HTMLElement>("[data-project-cursor]")!;
  const label = element.querySelector<HTMLElement>("[data-project-cursor-label]")!;
  const media = matchMedia("(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)");
  type Bounds = {left: number; right: number; top: number; bottom: number};
  let frame = 0, measureFrame = 0, entered = false, x = 0, y = 0, tx = 0, ty = 0, lastTime = 0, bounds: Bounds | undefined;
  let target: HTMLElement | undefined, disposed = false;
  const hide = () => { entered = false; cancelAnimationFrame(frame); frame = 0; delete element.dataset.projectCursorVisible; };
  const stop = () => { hide(); target = undefined; bounds = undefined; cancelAnimationFrame(measureFrame); measureFrame = 0; };
  const inside = () => bounds && tx + scrollX >= bounds.left && tx + scrollX <= bounds.right && ty + scrollY >= bounds.top && ty + scrollY <= bounds.bottom && tx >= 0 && tx < innerWidth && ty >= 0 && ty < innerHeight;
  const tick = (time: number) => {
    frame = 0;
    if (!media.matches || document.hidden || blocked()) { stop(); return; }
    if (!target || !inside()) { hide(); return; }
    if (!entered) {
      entered = true; x = tx; y = ty;
      label.textContent = target.hasAttribute("data-project-stage") ? "Drag" : "Click";
      element.dataset.projectCursorVisible = "true";
    }
    const dt = lastTime ? Math.min(48, time - lastTime) : 16.67; lastTime = time;
    const amount = 1 - Math.pow(.85, dt / 16.67);
    x += (tx - x) * amount; y += (ty - y) * amount;
    cursor.style.transform = `translate(${x}px,${y}px)`;
    if (Math.abs(tx - x) + Math.abs(ty - y) > .1) frame = requestAnimationFrame(tick);
  };
  const schedule = () => { if (!disposed && target && !frame && !measureFrame) { lastTime = 0; frame = requestAnimationFrame(tick); } };
  const measure = () => {
    measureFrame = 0;
    if (disposed || !target || document.hidden || blocked() || !media.matches) { stop(); return; }
    const rect = target.getBoundingClientRect();
    // Cache document coordinates. Scrolling cannot invalidate their comparison with
    // client coordinates plus the current scroll offset, even before the next read.
    bounds = {left:rect.left + scrollX,right:rect.right + scrollX,top:rect.top + scrollY,bottom:rect.bottom + scrollY};
    schedule(); // Geometry reads and cursor writes happen in separate frames.
  };
  const scheduleMeasure = () => {
    if (disposed || !target || document.hidden || measureFrame) return;
    cancelAnimationFrame(frame); frame = 0;
    measureFrame = requestAnimationFrame(measure);
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || !media.matches || document.hidden || blocked()) return;
    if (!target) { target = event.currentTarget as HTMLElement; scheduleMeasure(); }
    // Pointer capture retains events outside the stage, so boundary events alone are insufficient.
    tx = event.clientX; ty = event.clientY;
    if (bounds && !inside()) { hide(); return; }
    // Retain the target during captured moves, so moving back inside can wake it.
    schedule();
  };
  const enter = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || !media.matches || document.hidden || blocked()) return;
    target = event.currentTarget as HTMLElement; bounds = undefined;
    x = tx = event.clientX; y = ty = event.clientY;
    scheduleMeasure();
  };
  const leave = (event: PointerEvent) => {
    if ((event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) { hide(); return; }
    stop();
  };
  const visibility = () => { if (document.hidden) stop(); };
  const resize = new ResizeObserver(scheduleMeasure);
  resize.observe(element); resize.observe(document.body); targets.forEach(target => resize.observe(target));
  targets.forEach(target => { target.addEventListener("pointerenter", enter); target.addEventListener("pointerleave", leave); target.addEventListener("pointermove", move); target.addEventListener("transitionend",scheduleMeasure); });
  window.addEventListener("scroll",scheduleMeasure,{passive:true}); window.addEventListener("resize",scheduleMeasure); window.addEventListener("pageshow",scheduleMeasure);
  document.fonts.addEventListener("loadingdone",scheduleMeasure);
  media.addEventListener("change", stop); document.addEventListener("visibilitychange", visibility);
  return { stop, dispose() {
    disposed = true; stop(); resize.disconnect(); cursor.style.removeProperty("transform");
    targets.forEach(target => { target.removeEventListener("pointerenter", enter); target.removeEventListener("pointerleave", leave); target.removeEventListener("pointermove", move); target.removeEventListener("transitionend",scheduleMeasure); });
    window.removeEventListener("scroll",scheduleMeasure); window.removeEventListener("resize",scheduleMeasure); window.removeEventListener("pageshow",scheduleMeasure);
    document.fonts.removeEventListener("loadingdone",scheduleMeasure);
    media.removeEventListener("change", stop); document.removeEventListener("visibilitychange", visibility);
  } };
}
