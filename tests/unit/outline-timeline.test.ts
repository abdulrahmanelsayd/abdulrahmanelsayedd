import { test } from "node:test";
import assert from "node:assert/strict";
import { outlineTimeline, interruptedPose } from "../../src/components/services/outline-timeline.ts";
import type { LetterPose } from "../../src/components/services/hero-geometry.ts";

for (const width of [1440, 390]) test(`outline interrupted ease-in-out prefix ${width}`, () => {
  const poses: LetterPose[] = Array.from({ length: 5 }, (_, i) => ({ x: i * width / 6, y: i * 3, width: 60 + i * 8, height: 120 - i * 5, centre: i * width / 6 + 30 }));
  const keys = outlineTimeline(poses, poses[0]);
  assert.deepEqual(keys.map(k => Math.round(Number(k.offset) * 1620)), [0, 80, 250, 420, 590, 760, 980, 1120, 1620]);
  let pose = poses[0];
  for (let i = 0; i < 4; i++) {
    pose = interruptedPose(pose, poses[i], 170 / 220);
    assert.equal(keys[i + 2].transform, `translate(${pose.x}px,${pose.y}px)`);
    assert.equal(keys[i + 2].width, `${pose.width}px`);
    assert.equal(keys[i + 2].height, `${pose.height}px`);
    if (i) assert.notEqual(pose.x, poses[i].x);
  }
  // Independently tabulated CSS ease-in-out progress at 170/220.
  const unit = interruptedPose(poses[0], { ...poses[0], x: 1 }, 170 / 220);
  assert.ok(Math.abs(unit.x - .89379087936) < .00000001, String(unit.x));
});
