export const modulo = (value: number, total: number) => ((value % total) + total) % total;

export function projectCardState(index: number, active: number, total: number) {
  let offset = modulo(index - active + total / 2, total) - total / 2;
  // Retain the reference's positive tie at the far (invisible) edge.
  if (offset === -total / 2 && index - active > 0) offset = total / 2;
  const sign = Math.sign(offset);
  switch (Math.abs(offset)) {
    case 0: return { xPercent: 0, yPercent: 0, rotation: 0, scale: 1, opacity: 1, zIndex: 5 };
    case 1: return { xPercent: sign * 25, yPercent: 1, rotation: sign * 10, scale: .9, opacity: 1, zIndex: 4 };
    case 2: return { xPercent: sign * 45, yPercent: 5, rotation: sign * 15, scale: .8, opacity: 1, zIndex: 3 };
    default: return { xPercent: sign * 55, yPercent: 5, rotation: sign * 20, scale: .6, opacity: 0, zIndex: 2 };
  }
}

/** The sole continuous coordinate drives every pose, also across the loop seam. */
export function projectCardPose(index: number, phase: number, total: number) {
  const lower = Math.floor(phase), progress = phase - lower;
  const from = projectCardState(index, modulo(lower, total), total);
  const to = projectCardState(index, modulo(lower + 1, total), total);
  const depth = projectCardState(index, modulo(Math.round(phase), total), total);
  return {
    xPercent: from.xPercent + (to.xPercent - from.xPercent) * progress,
    yPercent: from.yPercent + (to.yPercent - from.yPercent) * progress,
    rotation: from.rotation + (to.rotation - from.rotation) * progress,
    scale: from.scale + (to.scale - from.scale) * progress,
    opacity: from.opacity + (to.opacity - from.opacity) * progress,
    zIndex: depth.zIndex,
  };
}
export const power3Out = (progress: number) => 1 - Math.pow(1 - progress, 4);
export const settleDuration = (distance: number) => Math.min(480, 200 + Math.abs(distance) * 280);
export const nearestProjectPhase = (target: number, base: number, count: number) =>
  base + modulo(target - modulo(base, count) + count / 2, count) - count / 2;
