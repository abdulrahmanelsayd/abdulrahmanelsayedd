import { capabilities } from "../../content/home-introduction";
import { IntroductionDrawing } from "./IntroductionDrawings";
import { MarqueeMotion } from "./MarqueeMotion";
import styles from "./CapabilityMarquee.module.css";

export function CapabilityMarquee() {
  return <MarqueeMotion className={styles.frame}>
    <div className={styles.band} data-marquee-band>
      <div className={styles.viewport} data-marquee-viewport data-scroll-native tabIndex={0} role="region" aria-label="Website capabilities, scroll horizontally">
        <div className={styles.track} data-marquee-track>
          <ul className={styles.group} data-marquee-group>
            {capabilities.map((label, index) => <li key={label}>
              <span>{label}</span>
              {index === 2 && <IntroductionDrawing kind="watch" />}
              {index === 6 && <IntroductionDrawing kind="cursor" />}
              {index === 9 && <IntroductionDrawing kind="phone" />}
            </li>)}
          </ul>
        </div>
      </div>
      <div className={styles.control} data-marquee-control hidden>
        <button type="button" data-marquee-toggle aria-label="Pause automatic capabilities scrolling">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
            <path data-pause-icon d="M7 5v10M13 5v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path data-play-icon d="m7 4 9 6-9 6V4Z" fill="currentColor" style={{ display: "none" }} />
          </svg>
        </button>
      </div>
    </div>
  </MarqueeMotion>;
}
