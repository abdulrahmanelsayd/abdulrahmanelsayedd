"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { footerProgress, footerLetterOffset } from "./footer-geometry";

/** Shared black-section-to-contact reveal; gesture guards also apply to About. */
export function FooterMotion({ children, className, from = "projects" }: { children: ReactNode; className: string; from?: "projects" | "about" }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const enhance = (activation?: FocusEvent | PointerEvent) => {
    const element = root.current!, panel = element.querySelector<HTMLElement>("[data-footer-panel]")!, curve = element.querySelector<HTMLElement>("[data-footer-curve]")!;
    const travel = element.querySelector<HTMLElement>("[data-footer-travel]")!, arrow = element.querySelector<HTMLElement>("[data-footer-arrow]")!;
    const letters = [...element.querySelectorAll<HTMLElement>("[data-footer-letter]")];
    const paths = [...element.querySelectorAll<SVGPathElement>("[data-footer-draw] path")];
    const pathLengths = paths.map(path=>path.getAttribute("pathLength"));
    paths.forEach(path=>path.setAttribute("pathLength","1"));
    const sticker = element.querySelector<HTMLElement>("[data-footer-sticker]")!;
    const application = element.closest<HTMLElement>("[data-page-content]");
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, measureFrame = 0, live = true, visible = false, top = 0, height = 1, viewport = innerHeight, desktop = innerWidth >= 721, forced = false, drawn = false;
    let keyboardTarget: HTMLElement | undefined, paintedProgress = 1, keyboardFocusNeedsSync = from === "about" && element.contains(document.activeElement);
    let pointerActivation: number | undefined, pointerProgress: number | undefined, releaseFrame = 0;
    let pointerTarget: Element | undefined;
    if (activation instanceof PointerEvent && activation.isPrimary && activation.button === 0) {
      const control = activation.target instanceof Element ? activation.target.closest('a,button,input,select,textarea,[tabindex]') : null;
      if (control && element.contains(control)) { pointerTarget = control; pointerActivation = activation.pointerId; pointerProgress = 1; }
    }
    let fontsReady = document.fonts.status === "loaded";
    let animations: Animation[] = [];
    const clearDrawings = () => { animations.forEach(animation => animation.cancel()); animations = []; drawn = false; paths.forEach(path => { path.style.removeProperty("stroke-dasharray"); path.style.removeProperty("stroke-dashoffset"); }); sticker.style.removeProperty("opacity"); sticker.style.removeProperty("transform"); };
    const reset = () => {
      panel.style.removeProperty("transform"); curve.style.removeProperty("height"); travel.style.removeProperty("transform"); arrow.style.removeProperty("transform");
      letters.forEach(letter => letter.style.removeProperty("transform")); clearDrawings(); delete element.dataset.footerEnhanced;
    };
    const draw = () => {
      if (drawn) return; drawn = true;
      paths.forEach(path => { path.style.strokeDasharray = "1"; animations.push(path.animate([{strokeDashoffset:"1"},{strokeDashoffset:"0"}],{delay:100,duration:800,easing:"cubic-bezier(.25,.46,.45,.94)",fill:"both"})); });
      animations.push(sticker.animate([{transform:"scale(.88)",opacity:0},{transform:"scale(1)",opacity:1}],{duration:650,easing:"cubic-bezier(.22,1,.36,1)",fill:"both"}));
    };
    const paint = () => {
      frame = 0;
      if (!live || document.hidden || application?.inert || !fontsReady || element.hasAttribute("data-about-footer-held")) return;
      if (preference.matches) { reset(); return; }
      const y = scrollY, revealed = forced || pointerActivation !== undefined;
      const progress = forced ? 1 : pointerActivation !== undefined ? (pointerProgress ?? 1) : footerProgress(y,top,height,viewport);
      paintedProgress = progress;
      element.dataset.footerEnhanced = "true";
      curve.style.height = `${viewport * .1 * (1 - progress)}px`;
      panel.style.transform = desktop ? `translateY(${-40 * (1 - progress)}%)` : "none";
      travel.style.transform = desktop ? `translateX(${-height * .1 * (1 - progress)}px)` : "none";
      arrow.style.transform = desktop ? `rotate(${15 * (1 - progress)}deg)` : "none";
      letters.forEach((letter,index) => { letter.style.transform = `translateY(${footerLetterOffset(progress,index)}%)`; });
      if (revealed || y + viewport * .8 >= top) draw(); else {
        if (drawn) clearDrawings();
        paths.forEach(path=>{path.style.strokeDasharray="1";path.style.strokeDashoffset="1";});
        sticker.style.opacity="0";sticker.style.transform="scale(.88)";
      }
    };
    const schedule = () => { if (live && visible && !document.hidden && !frame) frame = requestAnimationFrame(paint); };
    const measure = () => {
      measureFrame = 0;
      if (!live || document.hidden || application?.inert || element.hasAttribute("data-about-footer-held")) return;
      top = element.getBoundingClientRect().top + scrollY; height = panel.offsetHeight; viewport = innerHeight; desktop = innerWidth >= 721;
      if (keyboardFocusNeedsSync && fontsReady) { keyboardFocusNeedsSync = false; updateKeyboardReveal(); }
      paint();
    };
    const scheduleMeasure = () => { if (live && !document.hidden && !measureFrame) measureFrame = requestAnimationFrame(measure); };
    const updateKeyboardReveal = () => {
      const target = document.activeElement;
      // Chromium may retain :focus-visible after pressing an already-focused link.
      // That pointer focus must not revive a canceled gesture on window/tab return.
      keyboardTarget = target instanceof HTMLElement && element.contains(target) && target !== pointerTarget && target.matches(":focus-visible") ? target : undefined;
      forced = false;
      if (!keyboardTarget) return;
      // Check the target in the scroll-driven pose, even during an internal focus transfer.
      // Read before revealing; pointer focus only retains an in-progress reveal.
      const progress = footerProgress(scrollY,top,height,viewport), rect = keyboardTarget.getBoundingClientRect();
      const dy = desktop && !preference.matches ? height * .4 * (progress - paintedProgress) : 0;
      const dx = desktop && travel.contains(keyboardTarget) && !preference.matches ? height * .1 * (progress - paintedProgress) : 0;
      const clipTop = Math.max(0,top - scrollY + (preference.matches ? 0 : viewport * .1 * (1 - progress)));
      forced = rect.top + dy < clipTop + 6 || rect.bottom + dy > Math.min(viewport,top - scrollY + height) - 6 || rect.left + dx < 6 || rect.right + dx > innerWidth - 6;
    };
    const focus = () => {
      if (document.activeElement !== pointerTarget) pointerTarget = undefined;
      updateKeyboardReveal();
      paint();
      keyboardTarget?.scrollIntoView({block:"nearest",behavior:"instant"});
    };
    const focusOut = () => {
      // focusout precedes focusin. Defer release until the new active element is known,
      // so moving between footer controls cannot paint a hidden intermediate pose.
      queueMicrotask(() => {
        if (!live || element.contains(document.activeElement)) return;
        pointerTarget = undefined; keyboardTarget = undefined; forced = false; scheduleMeasure();
      });
    };
    const releasePointer = () => {
      cancelAnimationFrame(releaseFrame); releaseFrame = 0;
      pointerActivation = undefined; pointerProgress = undefined; schedule();
    };
    const pointerFocus = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      const control = event.target instanceof Element ? event.target.closest('a,button,input,select,textarea,[tabindex]') : null;
      pointerTarget = control && element.contains(control) ? control : undefined;
      // Transfer the keyboard reveal to this gesture before mouse focus clears it.
      // No capture or replacement click: the link keeps its native activation.
      const retain = (forced || pointerActivation !== undefined) && control && element.contains(control);
      cancelAnimationFrame(releaseFrame); releaseFrame = 0;
      // About reaches this shared footer from disclosures with changing heights.
      // Keep its current pose through an ordinary native press as well as the
      // existing full keyboard reveal; never move a link under a held pointer.
      const aboutPress = from === "about" && control && element.contains(control);
      pointerActivation = retain || aboutPress ? event.pointerId : undefined;
      pointerProgress = aboutPress && !retain ? paintedProgress : undefined;
      keyboardTarget = undefined; forced = false; schedule();
    };
    const pointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== pointerActivation || releaseFrame) return;
      // pointerup precedes the browser's click. Keep the pose through that event
      // and its default action, including when release outside produces no click.
      releaseFrame = requestAnimationFrame(releasePointer);
    };
    const pointerCancel = (event: PointerEvent) => { if (event.pointerId === pointerActivation) releasePointer(); };
    const pointerExit = (event: PointerEvent) => { if (event.relatedTarget === null) pointerCancel(event); };
    const cancelInteraction = () => { keyboardFocusNeedsSync = false; keyboardTarget = undefined; forced = false; releasePointer(); };
    // Resume only the current keyboard focus, after refreshing geometry. A canceled
    // pointer gesture stays canceled; no focus or scroll is synthesized on return.
    const resume = () => { keyboardFocusNeedsSync = true; scheduleMeasure(); };
    const keyboard = (event: KeyboardEvent) => {
      if (pointerTarget && !event.altKey && !event.ctrlKey && !event.metaKey && !["Shift","Control","Alt","Meta"].includes(event.key)) { pointerTarget = undefined; resume(); }
    };
    const visibility = () => {
      if (document.hidden) { cancelInteraction(); cancelAnimationFrame(frame); cancelAnimationFrame(measureFrame); frame = measureFrame = 0; animations.forEach(animation => animation.pause()); }
      else { animations.forEach(animation => animation.play()); resume(); }
    };
    const fonts = () => { fontsReady = true; scheduleMeasure(); };
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting; if (visible) schedule(); else { releasePointer(); cancelAnimationFrame(frame); frame = 0; }
    },{rootMargin:"10% 0px"}); observer.observe(element);
    const resize = new ResizeObserver(scheduleMeasure);
    const resumeAbout = () => { releasePointer(); scheduleMeasure(); };
    element.addEventListener("about-footer-release", resumeAbout);
    resize.observe(panel); if (element.previousElementSibling) resize.observe(element.previousElementSibling);
    const lock = new MutationObserver(() => {
      if (application?.inert) {
        cancelInteraction(); cancelAnimationFrame(frame); frame = 0;
        if (from === "about") animations.forEach(animation => animation.pause());
      } else {
        if (from === "about" && !document.hidden) animations.forEach(animation => animation.play());
        scheduleMeasure();
      }
    });
    if (application) lock.observe(application,{attributes:true,attributeFilter:["inert"]});
    window.addEventListener("scroll",schedule,{passive:true}); window.addEventListener("resize",scheduleMeasure); window.addEventListener("pageshow",resume); window.addEventListener("focus",resume);
    document.addEventListener("visibilitychange",visibility); document.fonts.addEventListener("loadingdone",fonts); preference.addEventListener("change",scheduleMeasure);
    element.addEventListener("focusin",focus); element.addEventListener("focusout",focusOut); document.addEventListener("pointerdown",pointerFocus,true);
    document.addEventListener("keydown",keyboard,true);
    document.addEventListener("pointerup",pointerEnd,true); document.addEventListener("pointercancel",pointerCancel,true); document.addEventListener("pointerout",pointerExit,true);
    window.addEventListener("blur",cancelInteraction); window.addEventListener("pagehide",cancelInteraction);
    void document.fonts.ready.then(()=>{if(live)fonts();}); measure();
    return () => {
      live = false; cancelAnimationFrame(frame); cancelAnimationFrame(measureFrame); cancelAnimationFrame(releaseFrame); observer.disconnect(); resize.disconnect(); lock.disconnect();
      element.removeEventListener("about-footer-release", resumeAbout);
      window.removeEventListener("scroll",schedule); window.removeEventListener("resize",scheduleMeasure); window.removeEventListener("pageshow",resume); window.removeEventListener("focus",resume);
      document.removeEventListener("visibilitychange",visibility); document.fonts.removeEventListener("loadingdone",fonts); preference.removeEventListener("change",scheduleMeasure);
      element.removeEventListener("focusin",focus); element.removeEventListener("focusout",focusOut); document.removeEventListener("pointerdown",pointerFocus,true); reset();
      document.removeEventListener("keydown",keyboard,true);
      document.removeEventListener("pointerup",pointerEnd,true); document.removeEventListener("pointercancel",pointerCancel,true); document.removeEventListener("pointerout",pointerExit,true);
      window.removeEventListener("blur",cancelInteraction); window.removeEventListener("pagehide",cancelInteraction);
      paths.forEach((path,index)=>{if(pathLengths[index]===null)path.removeAttribute("pathLength");else path.setAttribute("pathLength",pathLengths[index]!);});
    };
    };
    if (from !== "about") return enhance();
    // Keep the shared footer's offscreen layout out of About's initial paint.
    // Native HTML and content-visibility still work before hydration or without JS.
    const element = root.current!;
    let started = false, dispose: (() => void) | undefined;
    const start = (event?: FocusEvent | PointerEvent) => {
      if (started) return;
      started = true; gate.disconnect(); dispose = enhance(event);
    };
    const gate = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) start(); }, { rootMargin: "100% 0px" });
    gate.observe(element);
    element.addEventListener("focusin", start, true); element.addEventListener("pointerdown", start, true);
    return () => { gate.disconnect(); element.removeEventListener("focusin", start, true); element.removeEventListener("pointerdown", start, true); dispose?.(); };
  },[from]);
  return <footer ref={root} className={className} data-section="footer" data-footer-from={from}>{children}</footer>;
}
