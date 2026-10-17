import { test } from "node:test";
import assert from "node:assert/strict";
import { letterPose, nearestLetter } from "../../src/components/services/hero-geometry.ts";
test("Services ink geometry uses the baseline and falls back for unavailable/invalid metrics", () => {
  const fallback = { x: 15, y: 25, width: 60, height: 80, centre: 45 };
  assert.deepEqual(letterPose(20, 30, 50, 70, 100, 85), fallback);
  const ink = { actualBoundingBoxLeft: 0, actualBoundingBoxRight: 45, actualBoundingBoxAscent: 60, actualBoundingBoxDescent: 5, fontBoundingBoxAscent: 80, fontBoundingBoxDescent: 20 };
  assert.deepEqual(letterPose(20, 30, 50, 70, 100, 85, ink), { x: 15, y: 37.5, width: 55, height: 75, centre: 45 });
  assert.deepEqual(letterPose(20, 30, 50, 70, 100, 85, { ...ink, fontBoundingBoxAscent: NaN }), fallback);
});
test("Services nearest letter selects horizontal centres independently of glyph height", () => {
  const poses = [0, 80, 100].map(x => letterPose(x, 0, 20, 40, 50, 50));
  assert.equal(nearestLetter(poses, 79), 1);
  assert.equal(nearestLetter(poses, 105), 2);
  assert.equal(nearestLetter(poses, -10), 0);
});
