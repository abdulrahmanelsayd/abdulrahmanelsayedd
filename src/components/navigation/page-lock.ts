import { pauseScrollForMenu } from "../scroll/scroll-controller";

let owners = 0;
let restoreBody: (() => void) | undefined;

/** Independent owners share one body snapshot. Neither can release the other's lock. */
export function lockScroll() {
  const first = owners++ === 0;
  const body = document.body;
  const html = document.documentElement;
  const properties = ["overflow", "width", "padding-right"];
  const previous = first ? properties.map(name => ({ name, value: body.style.getPropertyValue(name), priority: body.style.getPropertyPriority(name) })) : [];
  const gutter = { value: html.style.getPropertyValue("--navigation-gutter"), priority: html.style.getPropertyPriority("--navigation-gutter") };
  // Collect geometry before pausing Lenis mutates root classes. All lock writes
  // then share the menu commit instead of forcing a style pass between them.
  const scrollbar = first ? Math.max(0, window.innerWidth - html.clientWidth) : 0;
  const padding = first && scrollbar > 0 ? parseFloat(getComputedStyle(body).paddingRight) || 0 : 0;
  const resumeScroll = pauseScrollForMenu();
  if (first) {
    body.style.setProperty("overflow", "hidden");
    // Overlay scrollbars consume no width. Avoid invalidating the root custom
    // property and body geometry when there is no gutter to compensate.
    if (scrollbar > 0) {
      html.style.setProperty("--navigation-gutter", `${scrollbar}px`);
      body.style.setProperty("width", "100%");
      body.style.setProperty("padding-right", `${padding + scrollbar}px`);
    }
    restoreBody = () => {
      previous.forEach(({ name, value, priority }) => {
        if (value) body.style.setProperty(name, value, priority); else body.style.removeProperty(name);
      });
      if (gutter.value) html.style.setProperty("--navigation-gutter", gutter.value, gutter.priority);
      else html.style.removeProperty("--navigation-gutter");
    };
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--owners === 0) { restoreBody?.(); restoreBody = undefined; }
    resumeScroll();
  };
}

/** Menu owns application inertness and its original focus/scroll position. */
export function lockPage(application: HTMLElement) {
  const x = window.scrollX, y = window.scrollY;
  const inert = application.getAttribute("inert");
  const releaseScroll = lockScroll();
  application.inert = true;
  let released = false;
  return (restoreScroll = true) => {
    if (released) return;
    released = true;
    if (inert === null) application.removeAttribute("inert"); else application.setAttribute("inert", inert);
    releaseScroll();
    if (restoreScroll) window.scrollTo({ left: x, top: y, behavior: "instant" });
  };
}
