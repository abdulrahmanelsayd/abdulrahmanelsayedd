export type HeroHeaderState = "corners" | "docked";

/** Viewport thresholds with a dead band that retains the previous state. */
export function heroHeaderState(bottom: number, viewportHeight: number, current: HeroHeaderState = "corners"): HeroHeaderState {
  if (bottom <= .8 * viewportHeight) return "docked";
  if (bottom > .92 * viewportHeight) return "corners";
  return current;
}

export const headerMotion = { duration: 420, easing: "cubic-bezier(.22,1,.36,1)", background: 140, logo: 120 } as const;
