import { identity } from "../../content/identity";
import { portraits } from "../../content/assets";
import { getProject, menuProjectIds, projects } from "../../content/projects";
import { getRoute, menuRouteIds } from "../../content/routes";
import { MenuLink } from "./MenuLink";
import { HeaderAction } from "./HeaderAction";
import { SocialIcon } from "../ui/Icons";
import { RollingLabel } from "../ui/RollingLabel";
import { NavigationPortrait } from "./NavigationPortrait";
import styles from "./Navigation.module.css";

/** Server-rendered menu content, selected using the approved content IDs. */
export function NavigationPanel() {
  return <div className={styles.columns}>
    <nav className={`${styles.column} ${styles.explore}`} aria-label="Explore">
      <p className={styles.eyebrow}>Explore</p>
      <ul className={styles.bigList}>{menuRouteIds.map(id => {
        const route = getRoute(id);
        return <li key={id}><MenuLink prefetch={false} href={route.href} className={styles.bigLink}>
          <span className={styles.underlined}>{route.label}</span>
          {id === "work" && <span className={styles.count} aria-hidden="true">{projects.length}</span>}
          <svg className={styles.pageArrow} viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false"><path d="M4 16 16 4M4 4h12v12" stroke="currentColor" strokeWidth="1.25" /></svg>
        </MenuLink></li>;
      })}</ul>
      <div className={styles.socials}>{identity.socials.map(social => <a key={social.label} className={styles.social} href={social.href} target="_blank" rel="noopener noreferrer" data-roll-trigger>
        <span className={styles.iconSurface}><RollingLabel label={social.label} icon={<SocialIcon name={social.label} menu />} /></span>
      </a>)}</div>
    </nav>
    <nav className={`${styles.column} ${styles.projects}`} aria-label="Selected projects">
      <p className={styles.eyebrow}>Selected projects</p>
      <ul className={styles.bigList}>{menuProjectIds.map(id => {
        const project = getProject(id);
        return <li key={id}><a className={styles.bigLink} href={project.href} target="_blank" rel="noopener noreferrer"><span className={styles.underlined}>{project.name}</span></a></li>;
      })}</ul>
      <div className={styles.smallLinks}><MenuLink prefetch={false} href={getRoute("work").href}><span className={styles.underlined}>Browse work</span></MenuLink></div>
    </nav>
    <div className={`${styles.column} ${styles.promotion}`}>
      <MenuLink prefetch={false} href={getRoute("contact").href} className={styles.banner} data-roll-trigger aria-label="Design Develop Let’s work together. Get in touch">
        <div className={styles.bannerContent}>
          <div className={styles.tags}><span className={`${styles.tag} ${styles.dark}`}>Design</span><span className={`${styles.tag} ${styles.purple} ${styles.round}`}>Develop</span></div>
          <div className={styles.bannerCenter}><p className={styles.bannerTitle}>Let’s work<br />together.</p>
            <div className={styles.portraitOval}><NavigationPortrait asset={portraits.clean} /></div>
            <div className={styles.bannerButton}><span className={`${styles.action} ${styles.light}`}><span className={styles.surface}><RollingLabel label="Get in touch" copies={3} decorative /></span></span></div>
          </div>
        </div>
      </MenuLink>
    </div>
    <div className={styles.mobileActions}><HeaderAction route="contact" label="Get in touch" full /></div>
  </div>;
}
