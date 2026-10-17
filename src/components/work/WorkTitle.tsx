import { BrandLogo } from "../brand/BrandLogo";
import { WorkTitleMotion } from "./WorkTitleMotion";
import styles from "./WorkPage.module.css";

/** The title artwork and introduction are server content; motion only enhances them. */
export function WorkTitle({ count }: { count: number }) {
  return <WorkTitleMotion className={styles.hero}>
    <h1 id="work-title" className="sr-only">Work — {count} featured websites across 3 countries</h1>
    <button className={styles.playground} data-work-playground type="button" disabled aria-label="Play with the Work title">
      <span className={styles.word} aria-hidden="true">
        <span className={`${styles.letter} ${styles.w}`} data-work-letter>W<span className={styles.selection}><i /><i /><i /><i /></span></span>
        <span className={`${styles.letter} ${styles.face}`} data-work-letter>
          <svg viewBox="0 0 176 176" fill="none" focusable="false">
            <circle cx="88" cy="88" r="84" fill="#a1ff62" /><circle cx="88" cy="88" r="65" fill="#000" />
            <g data-work-eye><circle cx="65" cy="78" r="12" fill="#f0ebe6" /><g data-work-pupil><circle cx="65" cy="78" r="5" fill="#000" /></g></g>
            <g data-work-eye><circle cx="111" cy="78" r="12" fill="#f0ebe6" /><g data-work-pupil><circle cx="111" cy="78" r="5" fill="#000" /></g></g>
            <path d="M60 109Q88 134 116 109" stroke="#f0ebe6" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </span>
        <span className={styles.letter} data-work-letter>r</span>
        <span className={`${styles.letter} ${styles.k}`} data-work-letter>k</span>
        <span className={`${styles.letter} ${styles.period}`} data-work-letter />
      </span>
      <span className={styles.cursor} data-work-cursor aria-hidden="true">
        <svg className={styles.pointer} viewBox="0 0 64 72" fill="none" focusable="false"><path d="M5 5V60L20 44L31 67L42 62L31 40L54 39Z" fill="#f5693c" stroke="#000" strokeWidth="3" strokeLinejoin="round" /></svg>
        <span className={styles.cursorName}><BrandLogo variant="initials" /></span>
      </span>
      <span className={styles.playHint} aria-hidden="true"><span className={styles.mouseHint}>Go on, click it.</span><span className={styles.touchHint}>Go on, tap it.</span><svg viewBox="0 0 20 20" fill="none" focusable="false"><path d="M5 15 15 5M5 5h10v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
    </button>
    <div className={styles.intro} data-work-intro>
      <svg viewBox="0 0 386 127" className={styles.introArrow} data-work-arrow fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M2 123C9 36 84.5 17 124 26C217.764 47.364 207 115 177.5 123C105.777 142.45 110.737 2 232.5 2C310.5 2 366.5 79 376 118L356.5 105.5" />
        <path d="M2 123C9 36 84.5 17 124 26C217.764 47.364 207 115 177.5 123C105.777 142.45 110.737 2 232.5 2C310.5 2 366.5 79 376 118L384 97" />
      </svg>
      <h2>A slice of my work.<br />Across 3 countries.</h2>
    </div>
  </WorkTitleMotion>;
}
