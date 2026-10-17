"use client";

import Image from "next/image";
import { createContext, useContext, useState, useSyncExternalStore } from "react";
import type { VisualAsset } from "../../content/assets";

export const NavigationPortraitPhase = createContext<"closed" | "open" | "closing">("closed");
// Use the complement of the card's CSS hiding rule, including fractional widths.
const hiddenQuery = "(max-width: 991px)";
const subscribe = (notify: () => void) => {
  const media = matchMedia(hiddenQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const visibleSnapshot = () => !matchMedia(hiddenQuery).matches;
const serverSnapshot = () => false;

/** Mount a source only when needed; retain that same image until closing finishes. */
export function NavigationPortrait({ asset }: { asset: VisualAsset }) {
  const phase = useContext(NavigationPortraitPhase);
  const visible = useSyncExternalStore(subscribe, visibleSnapshot, serverSnapshot);
  const [retained, setRetained] = useState(false);
  const needed = phase === "open" && visible;
  if (phase === "closed" && retained) setRetained(false);
  else if (needed && !retained) setRetained(true);
  return phase !== "closed" && (needed || retained)
    ? <Image {...asset} alt="" unoptimized loading="eager" />
    : null;
}
