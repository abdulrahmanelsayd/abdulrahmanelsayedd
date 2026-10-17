// One query owns preference changes for all About enhancements. A shared strong
// reference also keeps every subscriber in sync through rapid preference changes.
let preference: MediaQueryList | undefined;
const subscribers = new Set<() => void>();
const preferenceChanged = () => { subscribers.forEach(sync => sync()); };

/** Scoped lifecycle; no React renders on pointer movement. */
export function observeMotionActivity(element: HTMLElement, update: (active: boolean) => void) {
  if (!preference) {
    preference = matchMedia("(prefers-reduced-motion: reduce)");
    preference.addEventListener("change", preferenceChanged);
  }
  const application = element.closest<HTMLElement>("[data-page-content]");
  let away = false;
  const active = () => !preference?.matches && !document.hidden && !application?.inert && !away;
  const sync = () => update(active());
  const hide = () => { away = true; sync(); };
  const show = () => { away = false; sync(); };
  const lock = new MutationObserver(sync);
  if (application) lock.observe(application, { attributes: true, attributeFilter: ["inert"] });
  subscribers.add(sync); document.addEventListener("visibilitychange", sync);
  window.addEventListener("pagehide", hide); window.addEventListener("pageshow", show);
  sync();
  return { active, dispose: () => {
    lock.disconnect(); subscribers.delete(sync);
    if (!subscribers.size) { preference?.removeEventListener("change", preferenceChanged); preference = undefined; }
    document.removeEventListener("visibilitychange", sync);
    window.removeEventListener("pagehide", hide); window.removeEventListener("pageshow", show);
  } };
}
