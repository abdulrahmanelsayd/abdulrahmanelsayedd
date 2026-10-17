"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useNavigationMenu } from "./use-navigation-menu";
import { SiteHeader } from "./SiteHeader";
import { FloatingWhatsApp } from "../whatsapp/FloatingWhatsApp";
import { NavigationPortraitPhase } from "./NavigationPortrait";
import { PageScroll } from "../scroll/PageScroll";

const MenuContext = createContext<(() => void) | null>(null);
export function useMenuNavigation() { return useContext(MenuContext); }

/** Shares menu state with its portrait, background lock and WhatsApp availability. */
export function SiteChrome({ children, menu }: { children: ReactNode; menu: ReactNode }) {
  const { application: applicationRef, scope: scopeRef, trigger: triggerRef, phase, toggle, close } = useNavigationMenu();
  const pathname = usePathname();
  return <MenuContext value={() => close(true)}>
    <PageScroll />
    <SiteHeader navigation={{ scope: scopeRef, trigger: triggerRef, phase, toggle, close }}>
      <NavigationPortraitPhase value={phase}>{menu}</NavigationPortraitPhase>
    </SiteHeader>
    <div ref={applicationRef} data-page-content>
      <a className="skip-link" href="#main-content">Skip to content</a>
      {children}
      <FloatingWhatsApp key={pathname} blocked={phase !== "closed"} home={pathname === "/"} />
    </div>
  </MenuContext>;
}
