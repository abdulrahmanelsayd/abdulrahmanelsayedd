import { routes } from "../../content/routes.ts";

export const greetings = ["Hello", "Bonjour", "स्वागत हे", "Ciao", "Olá", "おい", "Hallå", "Guten tag", "Hallo"] as const;
export const greetingTimes = [0, 1050, 1200, 1350, 1500, 1650, 1800, 1950, 2110] as const;
export const transitionTiming = { cover: 500, homeHold: 2320, routeHold: 1150, reveal: 800, deadline: 9000 } as const;

export function pageLabel(pathname: string) {
  return routes.find(route => route.href === pathname.replace(/\/$/, "") || route.href === pathname)?.label ?? "Page not found";
}

/** Same-page fragments and non-HTTP links retain the browser's native behavior. */
export function transitionDestination(href: string, current: string) {
  const from = new URL(current), to = new URL(href, from);
  if (!/^https?:$/.test(to.protocol) || to.origin !== from.origin ||
      to.pathname === from.pathname) return null;
  return to;
}

function sampledEase(curve: (value: number) => number) {
  return `linear(${Array.from({ length: 81 }, (_, index) => curve(index / 80).toFixed(6)).join(",")})`;
}
const powerInOut = (power: number) => (value: number) => value < .5
  ? Math.pow(2 * value, power) / 2 : 1 - Math.pow(2 * (1 - value), power) / 2;

// Sampled once; the browser interpolates these curves without a JavaScript frame loop.
export const motionEase = {
  cover: sampledEase(value => Math.pow(value, 5)),
  initialReveal: sampledEase(powerInOut(5)),
  routeReveal: sampledEase(powerInOut(4)),
  words: sampledEase(value => 1 - Math.pow(1 - value, 5)),
  content: sampledEase(value => value === 1 ? 1 : 1 - Math.pow(2, -10 * value)),
};
