"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { observeMotionActivity } from "./motion-activity";
import styles from "./AboutPage.module.css";

export function HelloButton({ children }: { children: ReactNode }) {
  const root = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const button = root.current!, hand = button.querySelector<HTMLElement>("[data-about-hand]")!;
    let wave: Animation | undefined;
    const cancel = () => { wave?.cancel(); wave = undefined; };
    const activity = observeMotionActivity(button, active => {
      button.setAttribute("aria-disabled", String(!active)); if (!active) cancel();
    });
    const hello = () => {
      if (!activity.active() || wave) return;
      wave = hand.animate([
        { transform: "translateY(0) rotate(0deg)", offset: 0, easing: "ease-out" },
        { transform: "translateY(-2px) rotate(-12deg)", offset: 180 / 860, easing: "ease-in-out" },
        { transform: "translateY(-2px) rotate(10deg)", offset: 360 / 860, easing: "ease-in-out" },
        { transform: "translateY(-2px) rotate(-12deg)", offset: 540 / 860, easing: "cubic-bezier(.22,1,.36,1)" },
        { transform: "translateY(0) rotate(0deg)", offset: 1 },
      ], { duration: 860 });
      wave.onfinish = cancel;
    };
    button.addEventListener("click", hello);
    return () => { activity.dispose(); cancel(); button.removeEventListener("click", hello); };
  }, []);
  return <button ref={root} className={styles.hello} type="button" aria-disabled="true" aria-label="Say hello with a wave" data-about-hello data-about-enter data-about-stationary>
    <span className={styles.helloHand} data-about-hand>{children}</span>
    <span className={styles.helloHint} aria-hidden="true">Hello!</span>
  </button>;
}
