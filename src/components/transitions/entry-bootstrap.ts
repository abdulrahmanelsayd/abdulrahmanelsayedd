import { greetings, greetingTimes, motionEase, transitionTiming } from "./transition-settings.ts";
import { createTransitionClock } from "./transition-clock.ts";
import { homeGreetings, startHomeEntry } from "./home-entry.ts";

/** One pre-paint lease. React releases this lease before acquiring its own. */
export const entryBootstrap = `(() => {
  const root = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches ||
      performance.getEntriesByType('navigation')[0]?.type === 'back_forward' || location.hash) return;
  if (location.pathname === '/') {
    (${startHomeEntry.toString()})(${JSON.stringify({ greetings, times: greetingTimes, hold: transitionTiming.homeHold, deadline: transitionTiming.deadline, easing: motionEase.words })}, ${createTransitionClock.toString()}, ${homeGreetings.toString()});
    return;
  }
  root.dataset.pageEntry = 'pending';
  const owned = new Map();
  const release = () => {
    root.removeAttribute('data-page-entry');
    owned.forEach((previous, element) => { element.inert = previous; });
    owned.clear();
    observer.disconnect();
    clearTimeout(deadline);
    document.removeEventListener('visibilitychange', visibility);
    root.removeEventListener('page-entry-release', release);
    window.removeEventListener('pagehide', release);
  };
  const acquire = () => document.querySelectorAll('[data-transition-shell]').forEach(element => {
    if (!owned.has(element)) owned.set(element, element.inert);
    element.inert = true;
  });
  const observer = new MutationObserver(acquire);
  observer.observe(document, { childList: true, subtree: true });
  let remaining = ${transitionTiming.deadline}, since = performance.now(), deadline;
  let hidden = document.hidden;
  const visibility = () => {
    if (!hidden) remaining -= performance.now() - since;
    since = performance.now(); hidden = document.hidden;
    clearTimeout(deadline);
    if (!hidden) deadline = setTimeout(release, Math.max(0, remaining));
  };
  document.addEventListener('visibilitychange', visibility);
  if (!hidden) deadline = setTimeout(release, remaining);
  root.addEventListener('page-entry-release', release);
  window.addEventListener('pagehide', release);
  acquire();
})();`;
