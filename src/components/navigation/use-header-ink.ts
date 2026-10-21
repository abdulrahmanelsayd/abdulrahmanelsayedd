import { useLayoutEffect, type RefObject } from "react";

/** Read the background regions at the header's baseline, without scroll-time layout reads. */
export function useHeaderInk(root: RefObject<HTMLElement | null>, pathname: string) {
  useLayoutEffect(() => {
    const header = root.current;
    const top = header?.querySelector<HTMLElement>("[data-header-top]");
    if (!header || !top) return;
    const regions = document.querySelectorAll<HTMLElement>(
      '[data-route="/work"], [data-section="selected-projects"], [data-section="commitments"], [data-services-hero]',
    );
    let observer: IntersectionObserver | undefined;
    let frame = 0;
    const connect = () => {
      observer?.disconnect();
      const intersecting = new Set<Element>();
      const bounds = top.getBoundingClientRect();
      const line = Math.min(innerHeight - 1, Math.max(0, bounds.top + bounds.height / 2));
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) intersecting.add(entry.target);
          else intersecting.delete(entry.target);
        }
        header.setAttribute("data-ink", intersecting.size ? "light" : "dark");
      }, { rootMargin: `-${line}px 0px -${Math.max(0, innerHeight - line - 1)}px 0px` });
      for (const region of regions) observer.observe(region);
      if (!regions.length) header.setAttribute("data-ink", "dark");
    };
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(connect);
    };
    header.setAttribute("data-ink", pathname === "/services" || pathname === "/work" ? "light" : "dark");
    connect();
    const size = new ResizeObserver(resize);
    size.observe(top);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      size.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [pathname, root]);
}
