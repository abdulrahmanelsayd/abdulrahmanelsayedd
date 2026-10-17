import Image from "next/image";
import { MagneticLink } from "./MagneticLink";
import { getRoute } from "../../content/routes";
import { Arrow } from "../ui/Icons";
import { RollingText } from "../ui/RollingText";
import styles from "./ContactCTA.module.css";

export function ContactCTA({ fromProjects = false, fromAbout = false }: { fromProjects?: boolean; fromAbout?: boolean }) {
  return (
    <section className={styles.cta} data-section="contact-cta" data-from-projects={fromProjects || undefined} data-from-about={fromAbout || undefined} aria-labelledby="footer-contact-heading">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow} aria-hidden="true">{Array.from("NEXT UP.").map((letter, index) => letter === " " ? " " : <span key={index} data-footer-letter>{letter}</span>)}</p>
          <h2 id="footer-contact-heading">Say <span className={styles.hello}>hello.<svg viewBox="0 0 403 17" fill="none" aria-hidden="true" focusable="false" data-footer-draw><path d="M1 16C25.8389 14.2222 50.643 12.2137 75.2387 9.47009C107.364 5.99145 144.414 1.26496 174.898 1C178.242 1.35897 168.254 2.8718 166.786 3.22223C163.842 3.76924 160.464 4.41881 157.146 5.11966C152.23 6.22223 134.982 9.64957 144.171 12.1282C152.23 13.8974 167.551 13.4701 178.572 13.094C200.11 12.2393 222.066 10.2137 243.639 8.99146C296.296 5.69231 349.291 6.34188 402 8.58975" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span><Image className={styles.smile} src="/graphics/truus-projects/sticker-3.svg" width={52} height={52} alt="" draggable={false} loading="lazy" unoptimized data-footer-sticker /></h2>
          <p className={styles.description}>A rough idea is a good place to start.</p>
        </div>
        <div className={styles.actionTrack}>
          <span className={styles.actionTravel} data-footer-travel>
            <MagneticLink className={styles.primaryLink} href={getRoute("contact").href} data-roll-trigger data-footer-magnetic data-strength="30" data-strength-text="12">
              <span className={styles.fill} aria-hidden="true" />
              <span className={styles.buttonText} data-footer-button-text><RollingText label="Let’s talk" /><span className={styles.arrow} data-footer-arrow><Arrow size={20} /></span></span>
            </MagneticLink>
          </span>
        </div>
      </div>
    </section>
  );
}
