"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { usePageTransition } from "./PageTransitions";

type Props = ComponentProps<typeof Link> & { onCovered?: () => void };

/** Keep Next's native link semantics, including modifiers, downloads and new tabs. */
export function TransitionLink({ onCovered, ...props }: Props) {
  const navigate = usePageTransition();
  return <Link {...props} prefetch={props.prefetch ?? false} onNavigate={event => {
    let prevented = false;
    props.onNavigate?.({ preventDefault: () => { prevented = true; event.preventDefault(); } });
    if (prevented) return;
    if (typeof props.href === "string" && navigate?.(props.href, { replace: props.replace, scroll: props.scroll, onCovered })) event.preventDefault();
    else onCovered?.();
  }} />;
}
