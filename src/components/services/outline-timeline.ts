import type { LetterPose } from "./hero-geometry.ts";

type Point = { x: number; y: number };
const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const curve = [ { x: 0, y: 0 }, { x: .42, y: 0 }, { x: .58, y: 1 }, { x: 1, y: 1 } ];
function prefix(progress: number) {
  // ease-in-out's time coordinate is not its Bezier parameter. Invert x,
  // then split the actual curve with de Casteljau, preserving its prefix.
  let lo = 0, hi = 1;
  for (let i = 0; i < 45; i++) {
    const t = (lo + hi) / 2;
    const a = mix(curve[0], curve[1], t), b = mix(curve[1], curve[2], t), c = mix(curve[2], curve[3], t);
    if (mix(mix(a, b, t), mix(b, c, t), t).x < progress) lo = t; else hi = t;
  }
  const t = (lo + hi) / 2;
  const a = mix(curve[0], curve[1], t), b = mix(curve[1], curve[2], t), c = mix(curve[2], curve[3], t);
  const d = mix(a, b, t), end = mix(d, mix(b, c, t), t);
  return { amount: end.y, easing: `cubic-bezier(${a.x / end.x},${a.y / end.y},${d.x / end.x},${d.y / end.y})` };
}
export function interruptedPose(from: LetterPose, to: LetterPose, progress: number): LetterPose {
  const amount = progress >= 1 ? 1 : progress <= 0 ? 0 : prefix(progress).amount;
  return Object.fromEntries(Object.keys(from).map(key => [key, from[key as keyof LetterPose] + (to[key as keyof LetterPose] - from[key as keyof LetterPose]) * amount])) as LetterPose;
}
const frame = (p: LetterPose, time: number, easing = "linear"): Keyframe => ({
  transform: `translate(${p.x}px,${p.y}px)`, width: `${p.width}px`, height: `${p.height}px`, offset: time / 1620, easing,
});
/** One owner for all outline properties, including interrupted transitions. */
export function outlineTimeline(poses: readonly LetterPose[], initial: LetterPose): Keyframe[] {
  const keys = [frame(initial, 0)];
  let current = initial;
  poses.forEach((target, index) => {
    const start = 80 + index * 170;
    const duration = index < poses.length - 1 ? 170 : 220;
    const part = duration < 220 ? prefix(duration / 220) : { amount: 1, easing: "ease-in-out" };
    keys.push(frame(current, start, part.easing));
    current = interruptedPose(current, target, duration / 220);
    // Intermediate endpoints are supplied by the following transition start.
    if (index === poses.length - 1) keys.push(frame(current, start + duration));
  });
  keys.push(frame(current, 1120, "ease-in-out"), frame(poses[0], 1620));
  return keys;
}
