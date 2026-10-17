import type { LenisOptions } from "lenis";

/** Duration is the only smoothing mode; zero explicitly disables the default lerp. */
export const scrollSettings = {
  smoothWheel: true,
  syncTouch: false,
  wheelMultiplier: 1,
  orientation: "vertical",
  gestureOrientation: "vertical",
  duration: 0.45,
  easing: (t: number) => 1 - Math.pow(1 - t, 3),
  lerp: 0,
  autoRaf: false,
  autoResize: true,
  autoToggle: false,
  allowNestedScroll: false,
  anchors: false,
} satisfies LenisOptions;

export const finePointerQuery = "(pointer: fine) and (hover: hover)";
export const mixedPointerQuery = "(any-pointer: fine) and (any-hover: hover)";
