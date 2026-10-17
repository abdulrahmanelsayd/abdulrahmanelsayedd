import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { entryBootstrap } from "../../src/components/transitions/entry-bootstrap.ts";

function boot(reduced = false, history = false, fragment = false) {
  const dataset: Record<string, string> = {}, listeners = new Map<string, () => void>();
  const shell = { inert: false }, alreadyInert = { inert: true };
  let deadline: (() => void) | undefined, observing = false;
  const root = { dataset, removeAttribute: () => { delete dataset.pageEntry; },
    addEventListener: (name: string, callback: () => void) => listeners.set(name, callback), removeEventListener: (name: string) => listeners.delete(name) };
  runInNewContext(entryBootstrap, {
    document: { hidden: false, addEventListener() {}, removeEventListener() {}, documentElement: root, querySelectorAll: () => [shell, alreadyInert] },
    matchMedia: () => ({ matches: reduced }), performance: { now: () => 0, getEntriesByType: () => [{ type: history ? "back_forward" : "navigate" }] },
    location: { hash: fragment ? "#services-studio" : "" },
    MutationObserver: class { observe() { observing = true; } disconnect() { observing = false; } },
    setTimeout: (callback: () => void) => { deadline = callback; return 1; }, clearTimeout: () => { deadline = undefined; },
    window: { addEventListener() {}, removeEventListener() {} },
  });
  return { dataset, shell, alreadyInert, release: () => listeners.get("page-entry-release")?.(), expire: () => deadline?.(), observing: () => observing };
}
test("missing hydration fails open and preserves pre-existing inertness", () => {
  const state = boot();
  assert.equal(state.dataset.pageEntry, "pending"); assert.equal(state.shell.inert, true);
  state.expire();
  assert.equal(state.dataset.pageEntry, undefined); assert.equal(state.shell.inert, false);
  assert.equal(state.alreadyInert.inert, true); assert.equal(state.observing(), false);
});
test("hydration takes over once without a second deadline unlocking its shell", () => {
  const state = boot(); state.release(); state.shell.inert = true; state.expire();
  assert.equal(state.shell.inert, true); assert.equal(state.observing(), false);
});
test("reduced motion, restored documents and fragments never acquire the initial cover", () => {
  for (const state of [boot(true), boot(false, true), boot(false, false, true)]) {
    assert.equal(state.dataset.pageEntry, undefined); assert.equal(state.shell.inert, false); assert.equal(state.observing(), false);
  }
});
