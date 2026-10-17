import assert from "node:assert/strict";
import test from "node:test";
import { greetings, greetingTimes, pageLabel, transitionDestination, transitionTiming, motionEase } from "../../src/components/transitions/transition-settings.ts";

test("only a different same-origin HTTP page owns a transition", () => {
  const current = "https://abdulrahmanelsayed.xyz/work?view=grid";
  assert.equal(transitionDestination("/about", current)?.pathname, "/about");
  assert.equal(transitionDestination("/about#experience", current)?.hash, "#experience");
  for (const href of ["#projects", "/work", "/work?view=list", "mailto:test@example.com", "tel:+201111111111", "https://elsewhere.example/about", "javascript:alert(1)"]) {
    assert.equal(transitionDestination(href, current), null, href);
  }
});
test("every site page has its own label and an unknown page remains a 404", () => {
  for (const [path, label] of [["/", "Home"], ["/work", "Work"], ["/about", "About"], ["/services", "Services"], ["/contact", "Contact"], ["/missing", "Page not found"]]) assert.equal(pageLabel(path), label);
});
test("the greeting sequence ends before the reveal and leaves a bounded escape path", () => {
  assert.equal(greetings.length, greetingTimes.length);
  assert.equal(greetings[0], "Hello"); assert.equal(greetings.at(-1), "Hallo");
  assert.ok(greetingTimes.every((time, index) => !index || time > greetingTimes[index - 1]));
  assert.ok(transitionTiming.homeHold > greetingTimes.at(-1)!);
  assert.ok(transitionTiming.deadline > transitionTiming.homeHold + 2000);
});
test("sampled compositor easing is finite, monotonic and has exact endpoints", () => {
  for (const easing of Object.values(motionEase)) {
    const values = easing.slice(7, -1).split(",").map(Number);
    assert.equal(values[0], 0); assert.equal(values.at(-1), 1);
    assert.ok(values.every((value, index) => Number.isFinite(value) && value >= 0 && value <= 1 && (!index || value >= values[index - 1])));
  }
});
