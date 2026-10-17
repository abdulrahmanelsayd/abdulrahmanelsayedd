export type LetterPose = { x: number; y: number; width: number; height: number; centre: number };
type Ink = Pick<TextMetrics, "actualBoundingBoxLeft" | "actualBoundingBoxRight" | "actualBoundingBoxAscent" | "actualBoundingBoxDescent" | "fontBoundingBoxAscent" | "fontBoundingBoxDescent">;
export function letterPose(x: number, y: number, width: number, height: number, size: number, lineHeight: number, ink?: Ink): LetterPose {
  if (ink && Object.values(ink).every(Number.isFinite) && ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent > 0) {
    const padding = Math.max(5, size * .025);
    const baseline = y + (lineHeight - ink.fontBoundingBoxAscent - ink.fontBoundingBoxDescent) / 2 + ink.fontBoundingBoxAscent;
    return { x: x - ink.actualBoundingBoxLeft - padding, y: baseline - ink.actualBoundingBoxAscent - padding, width: ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight + padding * 2, height: ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent + padding * 2, centre: x + width / 2 };
  }
  return { x: x - 5, y: y - 5, width: width + 10, height: height + 10, centre: x + width / 2 };
}
export const nearestLetter = (poses: readonly LetterPose[], x: number) => poses.reduce((closest, pose, i) => Math.abs(pose.centre - x) < Math.abs(poses[closest].centre - x) ? i : closest, 0);
