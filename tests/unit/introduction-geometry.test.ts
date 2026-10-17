import assert from "node:assert/strict";
import test from "node:test";
import { introduction, capabilities } from "../../src/content/home-introduction.ts";
import { readingGeometry, marqueeTiming, characterOpacity } from "../../src/components/home/introduction-geometry.ts";

test("the approved sentence and capability order remain complete", () => {
  assert.equal(introduction, "Helping brands to stand out in the digital era. Together we will set the new status quo. No nonsense, always on the cutting edge.");
  assert.equal(capabilities.length, 12);
  assert.equal(capabilities[0], "Clean code"); assert.equal(capabilities.at(-1), "Reliable interactions");
});
test("reading distance uses character count and available height with both bounds", () => {
  const input = { viewportHeight: 900, headerReserve: 80, contentHeight: 340, characters: 100 };
  assert.equal(readingGeometry(input).distance, 1230);
  assert.equal(readingGeometry({ ...input, characters: 20 }).distance, 984);
  assert.equal(readingGeometry({ ...input, characters: 300 }).distance, 1968);
  assert.equal(readingGeometry(input).height, 1570);
  assert.equal(readingGeometry({ ...input, decorationBottom: 12 }).height, 1582);
  assert.equal(readingGeometry({ ...input, decorationBottom: 12 }).stageHeight, 352);
});
test("content that exceeds reading space has no pin or extra journey", () => {
  const result = readingGeometry({ viewportHeight: 390, headerReserve: 72, contentHeight: 420, characters: 100 });
  assert.equal(result.enabled, false); assert.equal(result.distance, 0); assert.equal(result.height, 420);
});
test("marquee remeasurement preserves pixel position at constant speed including seams", () => {
  assert.equal(marqueeTiming(2400, 720).duration, 100000);
  assert.equal(marqueeTiming(3000, 720).currentTime, 30000);
  assert.equal(marqueeTiming(2400, 2400).currentTime, 0);
  assert.equal(marqueeTiming(1800, 2000).currentTime * 24 / 1000, 200);
});
test("characters reveal in reading order with overlapping intermediate opacity and exact endpoints", () => {
  for (let index = 0; index < 100; index++) {
    assert.equal(characterOpacity(0, index, 100), .22);
    assert.equal(characterOpacity(1, index, 100), 1);
    assert.ok(characterOpacity(.6, index, 100) >= characterOpacity(.4, index, 100));
    if (index) assert.ok(characterOpacity(.5, index - 1, 100) >= characterOpacity(.5, index, 100));
  }
  assert.ok(characterOpacity(.5, 50, 100) > .22 && characterOpacity(.5, 50, 100) < 1);
});
