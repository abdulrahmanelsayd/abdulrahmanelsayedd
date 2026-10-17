"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { modulo, nearestProjectPhase, power3Out, projectCardPose, settleDuration } from "../../lib/project-card-state";
import { projectCursor } from "./project-cursor";

type Gesture = { id: number; x: number; y: number; dx: number; horizontal: boolean; phase: number; anchor: number; distance: number };
type Transition = { from: number; to: number; start: number; duration: number };

export function ProjectGalleryMotion({ children, className, count }: { children: ReactNode; className: string; count: number }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current!, stage = element.querySelector<HTMLElement>("[data-project-stage]")!;
    const collection = element.querySelector<HTMLElement>("[data-project-cards]")!;
    const originals = [...collection.querySelectorAll<HTMLElement>("[data-project-card]")];
    const captions = [...element.querySelectorAll<HTMLElement>("[data-project-info]")];
    const previous = element.querySelector<HTMLButtonElement>("[data-project-previous]")!;
    const next = element.querySelector<HTMLButtonElement>("[data-project-next]")!;
    const status = element.querySelector<HTMLOutputElement>("[data-project-status]")!;
    const application = element.closest<HTMLElement>("[data-page-content]");
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const blocked = () => Boolean(application?.inert);
    // Only the visual is copied. No links or extra accessible projects are created.
    // Identical srcsets and sizes share the canonical images' browser requests.
    const copies = originals.map(original => {
      const copy = document.createElement("div");
      copy.className = original.className; copy.dataset.projectCopy = "";
      copy.dataset.projectId = original.dataset.projectId;
      copy.setAttribute("aria-hidden", "true"); copy.inert = true;
      copy.append(original.querySelector("[data-project-visual]")!.cloneNode(true));
      collection.append(copy); return copy;
    });
    const cards = [...originals, ...copies], total = cards.length;
    let phase = 0, destination = 0, paintedActive = -1, frame = 0, gesture: Gesture | undefined, transition: Transition | undefined;
    let disposed = false, reduced = preference.matches, suppressClick = false, measureFrame = 0;
    element.dataset.projectEnhanced = "true";
    stage.tabIndex = 0; stage.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight Home End");
    stage.setAttribute("aria-label", "Featured projects. Drag or use the left and right arrow keys to change project.");
    originals.forEach(card => { card.inert = true; card.setAttribute("aria-hidden", "true"); });
    let cardWidth = originals[0].offsetWidth, width = element.offsetWidth;

    const paint = () => {
      const active = modulo(Math.round(phase), total), logical = modulo(active, count);
      cards.forEach((card, index) => {
        const pose = projectCardPose(index, phase, total);
        card.style.transform = `translate(${pose.xPercent}%,${pose.yPercent}%) rotate(${pose.rotation}deg) scale(${pose.scale})`;
        card.style.opacity = String(pose.opacity); card.style.zIndex = String(pose.zIndex);
        if (paintedActive !== active) card.dataset.projectState = index === active ? "active" : pose.zIndex === 4 ? (pose.xPercent < 0 ? "before" : "after") : "hidden";
      });
      if (paintedActive !== active) {
        const focusInCaption = captions.some(caption => caption.contains(document.activeElement));
        captions.forEach((caption, index) => {
          caption.dataset.projectState = index === logical ? "active" : modulo(index - logical, count) === 1 ? "after" : "before";
          caption.inert = index !== logical; caption.setAttribute("aria-hidden", String(index !== logical));
          // Visibility's CSS transition can otherwise defer focusability for a frame.
          caption.style.visibility = index === logical ? "visible" : "hidden";
          if (index === logical && focusInCaption) {
            caption.style.transition = "none"; caption.style.opacity = "1"; caption.style.transform = "none";
          } else ["transition","opacity","transform"].forEach(property=>caption.style.removeProperty(property));
        });
        if (focusInCaption) captions[logical].querySelector<HTMLAnchorElement>("a")!.focus({preventScroll:true});
        element.dataset.projectActive = String(logical);
        status.textContent = `${String(logical + 1).padStart(2,"0")} / ${String(count).padStart(2,"0")} — ${originals[logical].dataset.projectName}`;
        paintedActive = active;
      }
    };
    const cancelFrame = () => { cancelAnimationFrame(frame); frame = 0; };
    const advance = (time: number) => {
      if (!transition) return;
      const progress = Math.min(1, Math.max(0,(time - transition.start) / transition.duration));
      phase = transition.from + (transition.to - transition.from) * power3Out(progress);
      if (progress === 1) { phase = destination = modulo(transition.to, total); transition = undefined; }
    };
    const render = (time: number) => {
      frame = 0; if (disposed || document.hidden) return;
      advance(time); paint();
      if (transition) frame = requestAnimationFrame(render);
    };
    const schedule = () => { if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(render); };
    const settle = (target: number, immediate = false) => {
      advance(performance.now()); cancelFrame(); transition = undefined; destination = target;
      const distance = Math.abs(target - phase);
      if (immediate || reduced || distance < .0001) { phase = destination = modulo(target,total); paint(); }
      else { transition = {from:phase,to:target,start:performance.now(),duration:settleDuration(distance)}; schedule(); }
    };
    const clearGesture = () => {
      const ended = gesture; gesture = undefined; delete element.dataset.projectDragging;
      if (ended && stage.hasPointerCapture(ended.id)) stage.releasePointerCapture(ended.id);
      return ended;
    };
    const cancelGesture = (immediate = false) => { const ended = clearGesture(); settle(ended?.horizontal ? ended.anchor : destination, immediate); };
    const move = (value: number, absolute = false) => {
      if (blocked()) return;
      const base = gesture?.anchor ?? destination; clearGesture();
      settle(absolute ? nearestProjectPhase(value,base,count) : base + value);
    };
    const previousProject = () => move(-1), nextProject = () => move(1);
    previous.disabled = next.disabled = false;
    previous.addEventListener("click",previousProject); next.addEventListener("click",nextProject);
    const cursor = projectCursor(element,[stage,...captions],blocked);

    const start = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || gesture || blocked()) return;
      suppressClick = false; advance(performance.now()); cancelFrame(); transition = undefined;
      gesture = {id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,horizontal:false,phase,anchor:Math.round(phase),distance:Math.max(1,cardWidth)};
      try { stage.setPointerCapture(event.pointerId); } catch { clearGesture(); settle(destination); }
    };
    const drag = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
      if (!gesture.horizontal && Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) { clearGesture(); settle(destination); return; }
      if (!gesture.horizontal && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { gesture.horizontal = true; element.dataset.projectDragging = "true"; }
      if (!gesture.horizontal) return;
      if (event.cancelable) event.preventDefault(); gesture.dx = dx;
      if (reduced) return;
      phase = Math.max(gesture.anchor - 1,Math.min(gesture.anchor + 1,gesture.phase - dx / gesture.distance)); schedule();
    };
    const end = (event: PointerEvent) => {
      if (event.type === "lostpointercapture" && event.target !== stage) return;
      if (!gesture || event.pointerId !== gesture.id) return;
      const ended = clearGesture()!;
      if (!ended.horizontal) { settle(destination); return; }
      suppressClick = event.type === "pointerup";
      const commit = event.type === "pointerup" && Math.abs(ended.dx) >= ended.distance * .18;
      settle(commit ? ended.anchor + (ended.dx > 0 ? -1 : 1) : ended.anchor);
    };
    const click = (event: MouseEvent) => { if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; } };
    const nativeDrag = (event: DragEvent) => event.preventDefault();
    const keyboard = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || !["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Home" || event.key === "End") move(event.key === "Home" ? 0 : count - 1,true);
      else move(event.key === "ArrowRight" ? 1 : -1);
    };
    const interrupted = () => { cancelGesture(true); cursor.stop(); };
    const visibility = () => { if (document.hidden) interrupted(); };
    const motionChanged = () => { reduced = preference.matches; interrupted(); if(reduced){drawing?.cancel();drawing=undefined;draw.style.removeProperty("stroke-dasharray");} };
    const lock = new MutationObserver(() => { if (blocked()) interrupted(); });
    if (application) lock.observe(application,{attributes:true,attributeFilter:["inert"]});
    const resize = new ResizeObserver(() => {
      if (measureFrame) return;
      measureFrame = requestAnimationFrame(() => {
        measureFrame = 0; if (disposed) return;
        const nextWidth = element.offsetWidth, nextCardWidth = originals[0].offsetWidth;
        if (width === nextWidth && cardWidth === nextCardWidth) return;
        width = nextWidth; cardWidth = nextCardWidth;
        // Percentage poses adapt to the new dimensions without resetting the phase.
        const ended = clearGesture(); if (ended) settle(ended.horizontal ? ended.anchor : destination); else { paint(); schedule(); }
        cursor.stop();
      });
    });
    resize.observe(element); resize.observe(originals[0]);
    const draw = element.querySelector<SVGPathElement>("[data-project-draw]")!;
    let drawing: Animation | undefined;
    const entrance = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) { cancelGesture(true); cursor.stop(); return; }
      if (!drawing && !reduced) {
        draw.style.strokeDasharray = "1";
        drawing = draw.animate([{strokeDashoffset:"1"},{strokeDashoffset:"0"}],{duration:1200,easing:"cubic-bezier(.215,.61,.355,1)",fill:"both"});
      }
    },{rootMargin:"40px 0px"});
    entrance.observe(stage);
    stage.addEventListener("pointerdown",start); stage.addEventListener("pointermove",drag,{passive:false});
    stage.addEventListener("pointerup",end); stage.addEventListener("pointercancel",end); stage.addEventListener("lostpointercapture",end);
    stage.addEventListener("click",click,true); stage.addEventListener("dragstart",nativeDrag); element.addEventListener("keydown",keyboard);
    window.addEventListener("blur",interrupted); document.addEventListener("visibilitychange",visibility); preference.addEventListener("change",motionChanged);
    paint();
    return () => {
      disposed = true; cancelFrame(); cancelAnimationFrame(measureFrame); clearGesture(); transition = undefined;
      resize.disconnect(); entrance.disconnect(); lock.disconnect(); cursor.dispose(); drawing?.cancel(); draw.style.removeProperty("stroke-dasharray");
      preference.removeEventListener("change",motionChanged); window.removeEventListener("blur",interrupted); document.removeEventListener("visibilitychange",visibility);
      stage.removeEventListener("pointerdown",start); stage.removeEventListener("pointermove",drag); stage.removeEventListener("pointerup",end); stage.removeEventListener("pointercancel",end); stage.removeEventListener("lostpointercapture",end);
      stage.removeEventListener("click",click,true); stage.removeEventListener("dragstart",nativeDrag); element.removeEventListener("keydown",keyboard);
      previous.removeEventListener("click",previousProject); next.removeEventListener("click",nextProject); previous.disabled = next.disabled = true;
      stage.removeAttribute("tabindex"); stage.removeAttribute("aria-keyshortcuts"); stage.setAttribute("aria-label","Featured projects");
      ["projectEnhanced","projectActive","projectDragging"].forEach(key => delete element.dataset[key]);
      copies.forEach(copy => copy.remove());
      originals.forEach(card => { card.inert = false; card.removeAttribute("aria-hidden"); card.style.removeProperty("transform"); card.style.removeProperty("opacity"); card.style.removeProperty("z-index"); delete card.dataset.projectState; });
      captions.forEach(caption => { caption.inert = true; caption.setAttribute("aria-hidden","true"); ["visibility","transition","opacity","transform"].forEach(property=>caption.style.removeProperty(property)); delete caption.dataset.projectState; });
    };
  },[count]);
  return <div ref={root} className={className} data-project-gallery>{children}</div>;
}
