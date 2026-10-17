import { identity } from "../../content/identity";
import { footerRouteIds, getRoute } from "../../content/routes";
import { MenuLink } from "../navigation/MenuLink";
import { ContactCTA } from "./ContactCTA";
import { FooterMotion } from "./FooterMotion";
import { CopyEmailButton } from "./CopyEmailButton";
import { RollingText } from "../ui/RollingText";
import { BrandLogo } from "../brand/BrandLogo";
import { MailIcon, PhoneIcon, SocialIcon } from "../ui/Icons";
import styles from "./SiteFooter.module.css";

export function SiteFooter({ standalone = false, from }: { standalone?: boolean; from?: "projects" | "about" }) {
  const connected = (from === "projects" || from === "about") && !standalone;
  const content = <>
    {connected && <div className={styles.curve} data-footer-curve aria-hidden="true"><div className={styles.curveShape} /></div>}
    <div className={`${styles.panel} ${standalone ? styles.standalone : ""}`} data-footer-panel>
      {!standalone && <ContactCTA fromProjects={connected && from === "projects"} fromAbout={connected && from === "about"} />}
      <div className={styles.directoryWrap}><div className={`${styles.directory} ${standalone ? styles.compactDirectory : ""}`}>
        <div className={styles.identity}><MenuLink href={getRoute("home").href} className={styles.logoLink} aria-label={`${identity.name} — Home`} data-brand-interactive><BrandLogo variant="initials" /></MenuLink><p>{identity.name}</p></div>
        <nav className={styles.nav} aria-label="Footer navigation">{footerRouteIds.map(id => {
          const route = getRoute(id);
          return <MenuLink href={route.href} key={id} data-roll-trigger><RollingText label={route.label} /></MenuLink>;
        })}</nav>
        {!standalone && <div className={styles.contacts}>
          <div className={styles.emailRow}><a className={`${styles.contactLink} ${styles.email}`} href={`mailto:${identity.email}`}><MailIcon /><span>{identity.email.split("@")[0]}<wbr />@{identity.email.split("@")[1]}</span></a><CopyEmailButton email={identity.email} /></div>
          <a className={`${styles.contactLink} ${styles.phone}`} href={identity.phoneUri}><PhoneIcon /><span>{identity.phone}</span></a>
        </div>}
        <nav className={styles.socials} aria-label="Social profiles">{identity.socials.map(social => <a className={styles.socialLink} href={social.href} target="_blank" rel="noopener noreferrer" key={social.label} aria-label={`${social.label} (opens in a new tab)`} title={social.label} data-footer-social={social.label}><SocialIcon name={social.label} /></a>)}</nav>
        <div className={styles.meta}><p>© {new Date().getFullYear()}</p>{!standalone && <p>{identity.location}</p>}</div>
      </div></div>
    </div>
  </>;
  return connected ? <FooterMotion className={styles.footer} from={from}>{content}</FooterMotion> : <footer className={styles.footer} data-section="footer">{content}</footer>;
}
