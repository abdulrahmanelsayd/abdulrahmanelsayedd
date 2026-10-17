"use client";

import { useEffect } from "react";

type StyleOwner = HTMLElement | SVGElement;
type SavedStyle = { element: StyleOwner; name: string; value: string; priority: string };

/** Owns only an About footer press. Disclosure HTML remains server rendered. */
export function AboutPressGuard() {
  useEffect(() => {
    const main = document.querySelector<HTMLElement>('main[data-route="/about"]');
    const footer = document.querySelector<HTMLElement>('footer[data-footer-from="about"]');
    const accordion = main?.querySelector<HTMLElement>("[data-about-accordion]");
    if (!main || !footer || !accordion) return;
    const details = [...accordion.querySelectorAll<HTMLDetailsElement>("details")];
    const application = main.closest<HTMLElement>("[data-page-content]");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const ready = main.getAttribute("data-about-guard-ready");
    let pointer: number | undefined, pressed: HTMLElement | undefined, releaseFrame = 0, cancelFrame = 0;
    let canceled: { pointer: number; target: HTMLElement } | undefined;
    let styles: SavedStyle[] = [], attributes: { element: Element; name: string; value: string | null }[] = [];
    let stylePresence: { element: StyleOwner; present: boolean }[] = [];
    let paused: Animation[] = [];
    const save = (element: StyleOwner, name: string) => ({ element, name, value: element.style.getPropertyValue(name), priority: element.style.getPropertyPriority(name) });
    const release = () => {
      cancelAnimationFrame(releaseFrame); releaseFrame = 0; pointer = undefined; pressed = undefined;
      // Restore exact values and priorities, including absent inline properties.
      styles.forEach(({ element, name, value, priority }) => {
        if (value) element.style.setProperty(name, value, priority); else element.style.removeProperty(name);
      });
      attributes.forEach(({ element, name, value }) => {
        if (value === null) element.removeAttribute(name); else element.setAttribute(name, value);
      });
      stylePresence.forEach(({ element, present }) => { if (!present && !element.style.length) element.removeAttribute("style"); });
      stylePresence = [];
      styles = []; attributes = [];
      paused.forEach(animation => {
        if (animation.playState !== "paused") return;
        if (reduced.matches || document.hidden || application?.inert) animation.cancel(); else animation.play();
      });
      paused = [];
      footer.dispatchEvent(new Event("about-footer-release"));
    };
    const clearCanceled = () => { cancelAnimationFrame(cancelFrame); cancelFrame = 0; canceled = undefined; };
    const begin = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || application?.inert || document.hidden) return;
      clearCanceled();
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('a,button,input,select,textarea,[tabindex]') : null;
      if (!target || !footer.contains(target)) return;
      if (pointer !== undefined || releaseFrame) release();

      // All geometry/computed-style reads precede every write or animation pause.
      const targetRect = target.getBoundingClientRect();
      if (!targetRect.width || !targetRect.height) return;
      const height = accordion.getBoundingClientRect().height;
      const content = details.map(element => {
        const computed = getComputedStyle(element, "::details-content");
        return { element, height: computed.blockSize, opacity: computed.opacity, visibility: computed.contentVisibility };
      });
      const moving = [target, ...target.querySelectorAll<StyleOwner>("[data-footer-button-text], [data-footer-arrow] svg")];
      const transforms = moving.map(element => ({ element, transform: getComputedStyle(element).transform }));
      const animations = target.getAnimations({ subtree: true }).filter(animation => animation.playState === "running")
        .map(animation => ({ animation, time: animation.currentTime }));
      styles = [save(accordion, "block-size"), ...content.flatMap(({ element }) => ["--about-held-size", "--about-held-opacity", "--about-held-visibility"].map(name => save(element, name))),
        ...moving.flatMap(element => ["transform", "transition"].map(name => save(element, name)))];
      attributes = [{ element: footer, name: "data-about-footer-held", value: footer.getAttribute("data-about-footer-held") },
        ...details.map(element => ({ element, name: "data-about-held", value: element.getAttribute("data-about-held") }))];
      stylePresence = [...new Set(styles.map(style => style.element))].map(element => ({ element, present: element.hasAttribute("style") }));

      pointer = event.pointerId; pressed = target;
      footer.setAttribute("data-about-footer-held", "");
      accordion.style.setProperty("block-size", `${height}px`, "important");
      content.forEach(({ element, height, opacity, visibility }) => {
        element.style.setProperty("--about-held-size", height);
        element.style.setProperty("--about-held-opacity", opacity);
        element.style.setProperty("--about-held-visibility", visibility);
        element.setAttribute("data-about-held", "");
      });
      // Pause rolling-label keyframes too. CSS transform transitions are pinned
      // to their current rendered matrices, not their magnetic destination.
      const keyframes = animations.filter(({ animation }) => !(animation instanceof CSSTransition));
      paused = keyframes.map(({ animation }) => animation);
      keyframes.forEach(({ animation, time }) => { animation.pause(); animation.currentTime = time; });
      transforms.forEach(({ element, transform }) => {
        element.style.setProperty("transition", "none", "important");
        element.style.setProperty("transform", transform, "important");
      });
    };
    const end = (event: PointerEvent) => {
      if (event.pointerId === canceled?.pointer && !cancelFrame) cancelFrame = requestAnimationFrame(clearCanceled);
      if (event.pointerId !== pointer || releaseFrame) return;
      // The native pointerup, click and Link's navigation decision all complete
      // before this frame. Removing the pin transitions from its rendered size.
      releaseFrame = requestAnimationFrame(release);
    };
    const cancel = () => {
      if (pointer !== undefined && pressed) canceled = { pointer, target: pressed };
      if (pointer !== undefined || releaseFrame) release();
    };
    const click = (event: MouseEvent) => {
      // Blur, a menu lock or a preference change can cancel the interaction
      // without the browser canceling its mouse gesture. Discard only that
      // gesture's eventual native activation; a new down or keyboard click is
      // independent. No replacement click, focus change or capture is used.
      if (!canceled || event.detail === 0 || !(event.target instanceof Node) || !canceled.target.contains(event.target)) return;
      if (event instanceof PointerEvent && event.pointerId !== canceled.pointer) return;
      event.preventDefault(); event.stopPropagation();
    };
    const pointerCancel = (event: PointerEvent) => { if (event.pointerId === pointer) cancel(); };
    const exit = (event: PointerEvent) => { if (event.relatedTarget === null && !releaseFrame) pointerCancel(event); };
    const visibility = () => { if (document.hidden) cancel(); };
    const lock = new MutationObserver(() => { if (application?.inert) cancel(); });
    if (application) lock.observe(application, { attributes: true, attributeFilter: ["inert"] });
    document.addEventListener("pointerdown", begin, true);
    document.addEventListener("pointerup", end, true);
    document.addEventListener("pointercancel", pointerCancel, true);
    document.addEventListener("pointerout", exit, true);
    document.addEventListener("click", click, true);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", cancel); window.addEventListener("pagehide", cancel); window.addEventListener("resize", cancel);
    reduced.addEventListener("change", cancel);
    // Enhance only after every guard is installed; [open] stays visible.
    main.setAttribute("data-about-guard-ready", "");
    return () => {
      cancel(); clearCanceled(); lock.disconnect();
      document.removeEventListener("pointerdown", begin, true); document.removeEventListener("pointerup", end, true);
      document.removeEventListener("pointercancel", pointerCancel, true); document.removeEventListener("pointerout", exit, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", cancel); window.removeEventListener("pagehide", cancel); window.removeEventListener("resize", cancel);
      reduced.removeEventListener("change", cancel);
      if (ready === null) main.removeAttribute("data-about-guard-ready"); else main.setAttribute("data-about-guard-ready", ready);
    };
  }, []);
  return null;
}
