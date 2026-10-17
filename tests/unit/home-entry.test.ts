import assert from "node:assert/strict";
import test from "node:test";
import { homeGreetings, startHomeEntry } from "../../src/components/transitions/home-entry.ts";
import { greetings, greetingTimes, transitionTiming, motionEase } from "../../src/components/transitions/transition-settings.ts";

test("parser lease adopts once, retains its watchdog, and restores only its inert snapshot", async () => {
  const doc = new EventTarget(), root = { dataset: {} as Record<string, string> }, shell = { inert: false };
  const viewport = { dataset: {} }, words = { querySelector: () => ({}) };
  Object.assign(viewport, { querySelector: () => words });
  Object.assign(doc, { documentElement: root, querySelectorAll: () => [shell], querySelector: () => viewport });
  const win = new EventTarget() as EventTarget & { __homeEntry?: Window["__homeEntry"] };
  const media = Object.assign(new EventTarget(), { matches: false });
  let expire!: () => void, duration = 0, observers = 0, aborts = 0;
  const globals = { document: doc, window: win, matchMedia: () => media, getComputedStyle: () => ({ position: "fixed" }),
    MutationObserver: class { observe() { observers++; } disconnect() { observers = 0; } } };
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
  try {
    const makeClock = ((signal: AbortSignal) => { signal.addEventListener("abort", () => { aborts++; }); return { now: () => 0, delay: (ms: number) => { duration = ms; return new Promise<void>(resolve => { expire = resolve; }); } }; });
    const settings = { greetings, times: greetingTimes, hold: transitionTiming.homeHold, deadline: transitionTiming.deadline, easing: motionEase.words };
    startHomeEntry(settings, makeClock, async () => {});
    const entry = win.__homeEntry!;
    assert.equal(shell.inert, true); assert.equal(observers, 0); assert.equal(duration, 9000);
    let cancellations = 0;
    assert.equal(entry.adopt(outcome => { cancellations++; entry.finish(outcome); }), true);
    assert.equal(entry.adopt(() => {}), false);
    startHomeEntry(settings, makeClock, async () => { assert.fail("must not restart"); });
    expire(); await Promise.resolve();
    assert.equal(cancellations, 1); assert.equal(aborts, 1); assert.equal(shell.inert, false);
    entry.finish(); assert.equal(aborts, 1); assert.equal(root.dataset.pageEntry, undefined);
  } finally { for (const key of Object.keys(globals)) Reflect.deleteProperty(globalThis, key); }
});

test("greetings spend every approved interval even when a preceding interval stalls", async () => {
  const doc = Object.assign(new EventTarget(), { hidden: false });
  let paused = 0, played = 0, cancelled = 0;
  const globals = { document: doc, CSS: { supports: () => true } };
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
  try {
    const labels: string[] = [], intervals: number[] = [], abort = new AbortController();
    const text = { set textContent(value: string) { labels.push(value); } };
    const animation = { playState: "running", pending: false, effect: {}, replaceState: "active",
      pause: () => { paused++; animation.playState = "paused"; }, play: () => { played++; animation.playState = "running"; }, cancel: () => { cancelled++; animation.playState = "idle"; } };
    const elements = { viewport: { dataset: {} }, text, words: { animate: () => animation } };
    await homeGreetings(elements as unknown as Parameters<typeof homeGreetings>[0], { greetings, times: greetingTimes, hold: transitionTiming.homeHold, deadline: transitionTiming.deadline, easing: motionEase.words }, { now: () => 700, delay: async ms => { intervals.push(ms); } }, abort.signal);
    assert.deepEqual(labels, greetings);
    assert.deepEqual(intervals, [1050, 150, 150, 150, 150, 150, 150, 160, 210]);
    doc.hidden = true; doc.dispatchEvent(new Event("visibilitychange")); assert.equal(paused, 1);
    doc.hidden = false; doc.dispatchEvent(new Event("visibilitychange")); assert.equal(played, 1);
    abort.abort(); assert.equal(cancelled, 1);
    doc.dispatchEvent(new Event("visibilitychange")); assert.equal(played, 1);
  } finally { for (const key of Object.keys(globals)) Reflect.deleteProperty(globalThis, key); }
});

class Visibility extends EventTarget {
  hidden = false;
  listeners = new Set<EventListenerOrEventListenerObject>();
  override addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    if (type === "visibilitychange" && callback) this.listeners.add(callback);
    super.addEventListener(type, callback, options);
  }
  override removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
    if (type === "visibilitychange" && callback) this.listeners.delete(callback);
    super.removeEventListener(type, callback, options);
  }
}
class PendingAnimation {
  playState: AnimationPlayState = "running";
  pending = false;
  currentTime = 200;
  effect: object | null = {};
  replaceState = "active";
  ready = Promise.resolve();
  calls: string[] = [];
  resolveReady?: () => void;
  rejectReady?: (reason: Error) => void;
  wait() {
    this.pending = true;
    this.ready = new Promise<void>((resolve, reject) => { this.resolveReady = resolve; this.rejectReady = reject; });
    void this.ready.catch(() => {});
  }
  pause() { this.calls.push("pause"); this.playState = "paused"; this.wait(); }
  play() { this.calls.push("play"); this.playState = "running"; this.wait(); }
  cancel() { this.calls.push("cancel"); this.playState = "idle"; this.pending = false; this.rejectReady?.(new Error("cancelled")); }
  settle() { this.pending = false; this.resolveReady?.(); }
}
function fixture(hidden = false, alreadyAborted = false) {
  const doc = new Visibility(), animation = new PendingAnimation(), abort = new AbortController();
  doc.hidden = hidden;
  Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
  Object.defineProperty(globalThis, "CSS", { configurable: true, value: { supports: () => true } });
  let creations = 0;
  if (alreadyAborted) abort.abort();
  const elements = { viewport: { dataset: {} }, text: {}, words: { animate: () => { creations++; return animation; } } };
  void homeGreetings(elements as unknown as Parameters<typeof homeGreetings>[0], { greetings, times: greetingTimes, hold: transitionTiming.homeHold, deadline: transitionTiming.deadline, easing: motionEase.words }, { now: () => 0, delay: () => new Promise<void>(() => {}) }, abort.signal);
  const visibility = (hidden: boolean) => { doc.hidden = hidden; doc.dispatchEvent(new Event("visibilitychange")); };
  const cleanup = () => { abort.abort(); Reflect.deleteProperty(globalThis, "document"); Reflect.deleteProperty(globalThis, "CSS"); };
  return { doc, animation, abort, visibility, cleanup, creations: () => creations };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test("visibility leaves finished, idle, and externally paused animations alone, including pending pauses", () => {
  for (const state of ["finished", "idle", "paused"] as const) for (const pending of [false, true]) {
    const f = fixture();
    try {
      f.animation.playState = state; f.animation.pending = pending; f.animation.currentTime = state === "finished" ? 1300 : 400;
      f.visibility(true); f.visibility(false); f.visibility(true); f.visibility(false);
      assert.deepEqual(f.animation.calls, []); assert.equal(f.animation.currentTime, state === "finished" ? 1300 : 400);
    } finally { f.cleanup(); }
  }
});

test("a visibility-owned pending pause settles before one resume, retaining delay progress", async () => {
  const f = fixture();
  try {
    f.animation.wait(); // Initial pending play.
    f.visibility(true); f.visibility(true); f.visibility(false); f.visibility(false);
    assert.deepEqual(f.animation.calls, ["pause"]);
    f.animation.currentTime = 215; f.animation.settle(); await flush();
    assert.deepEqual(f.animation.calls, ["pause", "play"]); assert.equal(f.animation.currentTime, 215);
    // Hide again during the pending resume; duplicate events must not acquire twice.
    f.visibility(true); f.visibility(false); f.visibility(true);
    f.animation.settle(); await flush(); assert.deepEqual(f.animation.calls, ["pause", "play", "pause"]);
    f.visibility(false); await flush(); assert.deepEqual(f.animation.calls, ["pause", "play", "pause", "play"]);
    assert.equal(f.creations(), 1); assert.equal(f.animation.currentTime, 215);
  } finally { f.cleanup(); }
});

test("an old ready continuation cannot resume a newer pause or a disposed animation", async () => {
  const f = fixture();
  try {
    f.visibility(true); f.visibility(false);
    f.animation.settle(); // Queue the first ready continuation without running it.
    f.visibility(false); // A synchronous event resumes the settled first pause.
    f.visibility(true); f.animation.settle();
    f.doc.hidden = false; // The old continuation must not claim this newer pause.
    await flush(); assert.deepEqual(f.animation.calls, ["pause", "play", "pause"]);
    f.visibility(false); f.visibility(true); f.visibility(false);
    f.abort.abort(); await flush();
    f.visibility(true); f.visibility(false); f.animation.settle(); await flush();
    assert.deepEqual(f.animation.calls, ["pause", "play", "pause", "play", "pause", "cancel"]); assert.equal(f.doc.listeners.size, 0);
  } finally { f.cleanup(); }
});

test("initial hidden entry owns its pending pause; detached or removed effects are never resumed", async () => {
  const f = fixture(true);
  try {
    assert.deepEqual(f.animation.calls, ["pause"]);
    f.animation.settle(); f.visibility(false); await flush();
    assert.deepEqual(f.animation.calls, ["pause", "play"]);
    f.visibility(true); f.animation.settle(); f.animation.effect = null; f.visibility(false);
    assert.deepEqual(f.animation.calls, ["pause", "play", "pause"]);
    f.animation.effect = {}; f.animation.playState = "running"; f.visibility(true); f.animation.settle(); f.animation.replaceState = "removed"; f.visibility(false);
    assert.deepEqual(f.animation.calls, ["pause", "play", "pause", "pause"]);
  } finally { f.cleanup(); }
});

test("an already aborted entry creates no animation or visibility listener", () => {
  const f = fixture(false, true);
  try { assert.equal(f.creations(), 0); assert.equal(f.doc.listeners.size, 0); } finally { f.cleanup(); }
});
