import { about } from "../../content/about";
import { MenuLink } from "../navigation/MenuLink";
import { RollingText } from "../ui/RollingText";
import { Arrow } from "../ui/Icons";
import { HelloHand } from "./AboutPrincipleArt";
import { HelloButton } from "./HelloButton";
import { AboutPortrait } from "./AboutPortrait";
import styles from "./AboutPage.module.css";

export function AboutIntroduction() {
  return <section className={styles.introduction} data-section="about-introduction" aria-labelledby="about-title">
    <div className={styles.introGrid}>
      <div className={styles.headline}>
        <h1 id="about-title" data-about-enter><span>A little</span><span>about me.</span></h1>
        <HelloButton><HelloHand /></HelloButton>
      </div>
      <AboutPortrait />
      <div className={styles.description} data-about-enter>
        {about.introduction.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      </div>
      <dl className={styles.facts} data-about-enter>
        <div><dt>Years building</dt><dd>{about.years.slice(0, -1)}<span>+</span></dd></div>
        <div><dt>Countries</dt><dd>{about.countries.slice(0, -1)}<span>+</span></dd></div>
        <div><dt>Based in</dt><dd className={styles.location}>{about.country}<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 7h14M5 17h14" /></svg></dd></div>
      </dl>
      <div className={styles.workLinkWrap} data-about-enter data-about-stationary>
        <MenuLink href="/contact" className={styles.workLink} data-roll-trigger><RollingText label="Let’s talk" /><span className={styles.linkArrow}><Arrow size={22} /></span></MenuLink>
        <MenuLink href="/work" className={styles.proofLink}>See the work <Arrow size={18} /></MenuLink>
      </div>
    </div>
  </section>;
}
