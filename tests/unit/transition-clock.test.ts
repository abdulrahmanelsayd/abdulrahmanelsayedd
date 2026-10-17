import assert from "node:assert/strict";
import test from "node:test";
import { createTransitionClock } from "../../src/components/transitions/transition-clock.ts";

test("hidden time does not consume the motion or watchdog budget; abort releases waits", async () => {
  class Visibility extends EventTarget { hidden = false; }
  const document = new Visibility();
  Object.defineProperty(globalThis, "document", { configurable:true, value:document });
  Object.defineProperty(globalThis, "window", { configurable:true, value:globalThis });
  try {
    const abort = new AbortController(), clock = createTransitionClock(abort.signal);
    let completed = false;
    const pending = clock.delay(50).then(()=>{completed=true;});
    document.hidden=true; document.dispatchEvent(new Event("visibilitychange"));
    const paused=clock.now(); await new Promise(resolve=>setTimeout(resolve,90));
    assert.equal(completed,false); assert.equal(clock.now(),paused);
    document.hidden=false; document.dispatchEvent(new Event("visibilitychange"));
    await pending; assert.ok(clock.now()>=50);
    const cancelled=clock.delay(10000); abort.abort(); await assert.rejects(cancelled);
    await assert.rejects(clock.delay(1));
  } finally { Reflect.deleteProperty(globalThis,"document"); Reflect.deleteProperty(globalThis,"window"); }
});
