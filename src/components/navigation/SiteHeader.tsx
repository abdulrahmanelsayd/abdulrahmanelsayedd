"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { identity } from "../../content/identity";
import { routes, getRoute } from "../../content/routes";
import type { useNavigationMenu } from "./use-navigation-menu";
import { MenuLink } from "./MenuLink";
import { BrandLogo } from "../brand/BrandLogo";
import { holdHeaderPress } from "./header-press";
import { useHeaderInk } from "./use-header-ink";
import styles from "./Navigation.module.css";

export function SiteHeader({ navigation, children }: { navigation: Omit<ReturnType<typeof useNavigationMenu>, "application">; children: ReactNode }) {
  const { scope, trigger, phase, toggle, close } = navigation;
  const viewport = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const open = phase === "open", active = phase !== "closed";
  const root = useRef<HTMLElement>(null);
  useHeaderInk(root, pathname);
  useLayoutEffect(() => holdHeaderPress(root.current!), []);
  useLayoutEffect(() => {
    let frame = 0, scrolled: boolean | undefined;
    const read = () => {
      frame = 0;
      const next = window.scrollY > 50;
      if (root.current && scrolled !== next) { root.current.dataset.scrolled = String(next); scrolled = next; }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(read); };
    read();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); };
  }, [pathname, root]);
  useLayoutEffect(() => { if (open) viewport.current?.scrollTo({ top: 0 }); }, [open]);
  return <header ref={root} className={styles.header} data-site-header data-ink={pathname === "/services" || pathname === "/work" ? "light" : "dark"} data-open={open} data-closing={phase === "closing"}>
    <div ref={scope} role={active ? "dialog" : undefined} aria-modal={active ? true : undefined} aria-label={active ? "Navigation" : undefined} data-navigation-scope>
      <div className={styles.backdrop} onClick={() => close()} aria-hidden="true" />
      <div className={styles.widthWrap} data-header-width><div className={styles.bar} data-header-bar>
        <div className={styles.back} data-header-back><div className={styles.outline} data-header-outline /><div className={styles.fill} data-header-fill /></div>
        <div className={styles.top} data-header-top>
          <MenuLink href={getRoute("home").href} className={styles.brand} aria-label={`${identity.name} — Home`} data-brand-interactive>
            <span className={styles.wordmark} data-header-wordmark><BrandLogo /></span>
          </MenuLink>
          <button ref={trigger} type="button" className={styles.menuHit} onClick={toggle}
            aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="navigation-overlay" data-menu-toggle>
            <span className={styles.menuSurface} data-header-menu-surface><span className={styles.menuLabel} data-header-menu-label>{open ? "Close" : "Menu"}</span></span>
          </button>
          <div className={styles.line} />
        </div>
        <div id="navigation-overlay" className={styles.bottom} inert={!open} aria-hidden={!open} data-menu-panel>
          <div className={styles.bottomOverflow}><div ref={viewport} className={styles.inner} data-scroll-native={open ? "" : undefined}>{children}</div></div>
        </div>
      </div></div>
    </div>
    <noscript><style>{`[data-site-header] [data-menu-toggle]{display:none}`}</style>
      <nav className={styles.noJs} data-header-nojs aria-label="Main navigation">{routes.map(item => <a key={item.id} href={item.href}>{item.label}</a>)}</nav>
    </noscript>
  </header>;
}


