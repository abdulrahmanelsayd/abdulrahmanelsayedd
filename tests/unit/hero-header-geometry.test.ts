import { test } from "node:test";
import assert from "node:assert/strict";
import { heroHeaderState } from "../../src/components/navigation/hero-header-geometry.ts";

test("gathers at 80%, returns only beyond 92%, and holds either state between", () => {
  for (const height of [400, 740, 900, 1024]) {
    assert.equal(heroHeaderState(.8 * height, height, "corners"), "docked");
    assert.equal(heroHeaderState(.8 * height + 1, height, "corners"), "corners");
    assert.equal(heroHeaderState(.92 * height, height, "docked"), "docked");
    assert.equal(heroHeaderState(.92 * height + 1, height, "docked"), "corners");
    for (const state of ["corners", "docked"] as const) assert.equal(heroHeaderState(.86 * height, height, state), state);
    assert.equal(heroHeaderState(-100, height), "docked");
    assert.equal(heroHeaderState(height, height), "corners");
  }
});
