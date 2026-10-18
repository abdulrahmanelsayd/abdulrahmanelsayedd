"use client";

import { TransitionLink as Link } from "../transitions/TransitionLink";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useMenuNavigation } from "./SiteChrome";

export function MenuLink(props: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const navigate = useMenuNavigation();
  return <Link {...props} aria-current={pathname === props.href ? "page" : undefined}
    onCovered={() => navigate?.()} />;
}
