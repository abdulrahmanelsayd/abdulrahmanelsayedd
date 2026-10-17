import { ServicesRibbonMotion } from "./ServicesRibbonMotion";
import styles from "./ServicesRibbon.module.css";

export function ServicesRibbon() {
  return <div className={styles.ribbon} data-services-ribbon>
    <div className={styles.ribbonViewport} data-scroll-native tabIndex={0} aria-label="Service labels">
      <div className={styles.ribbonTrack} aria-hidden="true">
        {[0, 1].map(copy => <div className={styles.ribbonGroup} key={copy}>
          {[0, 1].map(repeat => <span className={styles.ribbonPhrase} key={repeat}>
            <span className={styles.ribbonDesign}>Design.</span><svg viewBox="0 0 48 48" fill="none"><path d="M24 4v40M4 24h40M10 10l28 28M10 38l28-28" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg>
            <span className={styles.ribbonDevelop}>Develop.</span><svg viewBox="0 0 48 48" fill="none"><path d="m15 12-10 12 10 12M33 12l10 12-10 12M28 7l-8 34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className={styles.ribbonTogether}>Together.</span><svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" /><circle cx="17" cy="20" r="2.5" fill="currentColor" /><circle cx="31" cy="20" r="2.5" fill="currentColor" /><path d="M15 29q9 10 18 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </span>)}
        </div>)}
      </div>
    </div>
    <div className={styles.ribbonControl}>
      <button type="button" data-ribbon-toggle aria-label="Pause moving service labels" aria-pressed="false" aria-disabled="true">
        <svg className={styles.pauseIcon} viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6 4v10M12 4v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        <svg className={styles.playIcon} viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="m6 3 9 6-9 6Z" fill="currentColor" /></svg>
        <span data-ribbon-control-text>Pause</span>
      </button>
    </div>
    <p className="sr-only">Design. Develop. Together.</p>
    <ServicesRibbonMotion />  </div>;
}

