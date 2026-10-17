import Image from "next/image";
import { portraits } from "../../content/assets";
import { PortraitInteraction } from "./PortraitInteraction";
import styles from "./AboutPage.module.css";

export function AboutPortrait() {
  return <PortraitInteraction className={styles.portrait}>
    <div className={styles.photoWindow}>
      <Image src={portraits.clean.src} width={portraits.clean.width} height={portraits.clean.height}
        alt="Abdulrahman Elsayed in a dark suit and beige scarf" className={styles.photo}
        sizes="(max-width: 399px) calc(100vw - 50px), (max-width: 670px) calc(88vw - 2px), (max-width: 899px) 588px, (max-width: 1199px) min(calc(41.90476vw - 22.95238px), clamp(298px, calc(46svh - 2px), 388px)), clamp(298px, calc(46svh - 2px), 388px)"
        loading="eager" fetchPriority="high" data-about-photo />
    </div>
    <figcaption className={styles.photoCaption}>
      <span>Hiiiii!<br />That’s me.</span>
      <button className={styles.captionMark} type="button" aria-disabled="true" data-about-face aria-label="Say hi back">
        <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
          <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 29Q24 41 34 29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" data-about-mouth />
          <g data-about-wink><circle cx="17" cy="19" r="4" fill="#f0ebe6" /><g data-about-pupil><circle cx="17" cy="19" r="1.6" fill="currentColor" /></g></g>
          <g><circle cx="31" cy="19" r="4" fill="#f0ebe6" /><g data-about-pupil><circle cx="31" cy="19" r="1.6" fill="currentColor" /></g></g>
        </svg>
      </button>
    </figcaption>
  </PortraitInteraction>;
}
