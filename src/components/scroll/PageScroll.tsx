"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { createScrollController, synchronizePageScroll } from "./scroll-controller";

export function PageScroll() {
  const pathname = usePathname();
  useEffect(() => {
    const controller = createScrollController(() => import("lenis").then(module => module.default));
    return controller.destroy;
  }, []);
  // Next and the browser choose the destination position; discard the previous wheel target.
  useLayoutEffect(synchronizePageScroll, [pathname]);
  return null;
}
