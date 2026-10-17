/** Each island owns its observers and releases them on route removal. */
export function observeServicesActivity(element: HTMLElement, update: () => void) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const application = element.closest<HTMLElement>("[data-page-content]");
  let away = false;
  const available = () => !document.hidden && !application?.inert && !away;
  const active = () => available() && !reduced.matches;
  const hide = () => { away = true; update(); };
  const show = () => { away = false; update(); };
  const lock = new MutationObserver(update);
  if (application) lock.observe(application, { attributes: true, attributeFilter: ["inert"] });
  document.addEventListener("visibilitychange", update);
  window.addEventListener("pagehide", hide); window.addEventListener("pageshow", show);
  reduced.addEventListener("change", update); fine.addEventListener("change", update);
  return { active, available, reduced, fine, dispose() {
    lock.disconnect(); document.removeEventListener("visibilitychange", update);
    window.removeEventListener("pagehide", hide); window.removeEventListener("pageshow", show);
    reduced.removeEventListener("change", update); fine.removeEventListener("change", update);
  } };
}
