import assert from "node:assert/strict";
import test from "node:test";
import { afterHomeEntry, prepareHomeLayout } from "../../src/components/transitions/entry-layout.ts";

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function fixture(pending = true, parsed = true) {
  const root = Object.assign(new EventTarget(), { dataset: {} as Record<string, string> });
  if (pending) root.dataset.homeEntry = "pending";
  const frames = new Map<number, FrameRequestCallback>(); let id = 0, observing = 0;
  let mutation: (() => void) | undefined, resolveFont!: () => void;
  const font = new Promise<void>(resolve => { resolveFont = resolve; });
  const loads: string[] = [], source = { dataset: { entryFonts: JSON.stringify(['900 16px "Test"', 'italic 400 16px "Serif"']) } };
  const doc = { documentElement: root, fonts: { load: (spec: string) => { loads.push(spec); return font; } },
    querySelector: (selector: string) => selector === "[data-home-content-ready]" ? parsed ? {} : null : source };
  const globals = { document: doc, requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: (frame: number) => { frames.delete(frame); },
    MutationObserver: class { constructor(callback: () => void) { mutation = callback; } observe() { observing++; } disconnect() { observing--; } } };
  const descriptors = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
  return { root, loads, frames, source, resolveFont, observers: () => observing,
    parse: () => { parsed = true; mutation?.(); },
    frame: async () => { const batch = [...frames]; frames.clear(); batch.forEach(([, callback]) => callback(0)); await flush(); },
    restore: () => { for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } } };
}
const connected = () => ({ isConnected: true }) as HTMLElement;

test("ordinary pages initialize immediately and dispose exactly once", () => {
  const f = fixture(false); let starts = 0, stops = 0;
  try { const dispose = afterHomeEntry(connected(), () => { starts++; return () => { stops++; }; });
    assert.equal(starts, 1); f.root.dispatchEvent(new Event("home-entry-layout")); assert.equal(starts, 1);
    dispose(); dispose(); assert.equal(stops, 1);
  } finally { f.restore(); }
});
test("covered controllers wait, start once when preparing, and release their cleanup", () => {
  const f = fixture(); let starts = 0, stops = 0;
  try { const dispose = afterHomeEntry(connected(), () => { starts++; return () => { stops++; }; });
    f.root.dispatchEvent(new Event("home-entry-layout")); assert.equal(starts, 0);
    f.root.dataset.homeEntry = "preparing"; f.root.dispatchEvent(new Event("home-entry-layout"));
    delete f.root.dataset.homeEntry; f.root.dispatchEvent(new Event("home-entry-layout"));
    assert.equal(starts, 1); dispose(); dispose(); assert.equal(stops, 1);
  } finally { f.restore(); }
});
test("canceling the cover starts fallback controllers; unmounted owners never start", () => {
  const f = fixture(); let active = 0, unmounted = 0;
  try { const first = afterHomeEntry(connected(), () => { active++; });
    const cancel = afterHomeEntry(connected(), () => { unmounted++; }); cancel();
    const element = connected(); const detached = afterHomeEntry(element, () => { unmounted++; });
    Object.assign(element, { isConnected: false });
    delete f.root.dataset.homeEntry; f.root.dispatchEvent(new Event("home-entry-layout"));
    assert.equal(active, 1); assert.equal(unmounted, 0); first(); detached();
  } finally { f.restore(); }
});
test("preparation waits for the complete SSR page and fonts, then two layout frames", async () => {
  const f = fixture(true, false), abort = new AbortController(); let started = 0, done = false;
  try { const dispose = afterHomeEntry(connected(), () => { started++; });
    const task = prepareHomeLayout(abort.signal).then(() => { done = true; });
    await flush(); assert.equal(f.observers(), 1); assert.equal(f.loads.length, 0);
    f.parse(); await flush(); assert.equal(f.observers(), 0); assert.equal(f.loads.length, 2); assert.equal(started, 0);
    f.resolveFont(); await flush(); assert.equal(started, 1); assert.equal(f.root.dataset.homeEntry, "preparing"); assert.equal(done, false);
    await f.frame(); assert.equal(done, false); await f.frame(); await task; assert.equal(done, true);
    assert.equal(f.frames.size, 0); dispose();
  } finally { abort.abort(); f.restore(); }
});
test("abort during parsing disconnects the observer without starting layout", async () => {
  const f = fixture(true, false), abort = new AbortController();
  try { const task = prepareHomeLayout(abort.signal); abort.abort(); await task;
    assert.equal(f.observers(), 0); assert.equal(f.frames.size, 0); assert.equal(f.root.dataset.homeEntry, "pending");
  } finally { f.restore(); }
});
test("abort while fonts load releases the wait and cannot start a late controller", async () => {
  const f = fixture(), abort = new AbortController(); let starts = 0;
  try { const dispose = afterHomeEntry(connected(), () => { starts++; }); const task = prepareHomeLayout(abort.signal);
    await flush(); assert.equal(f.loads.length, 2); abort.abort(); await task; f.resolveFont(); await flush();
    assert.equal(starts, 0); assert.equal(f.frames.size, 0); dispose();
  } finally { f.restore(); }
});
test("abort cancels an owned preparation frame", async () => {
  const f = fixture(), abort = new AbortController();
  try { const task = prepareHomeLayout(abort.signal); await flush(); f.resolveFont(); await flush();
    assert.equal(f.frames.size, 1); abort.abort(); await task; assert.equal(f.frames.size, 0);
  } finally { f.restore(); }
});
test("non-Home and already aborted preparations perform no work", async () => {
  const f = fixture(false), abort = new AbortController();
  try { await prepareHomeLayout(abort.signal); f.root.dataset.homeEntry = "pending"; abort.abort(); await prepareHomeLayout(abort.signal);
    assert.equal(f.loads.length, 0); assert.equal(f.frames.size, 0);
  } finally { f.restore(); }
});
