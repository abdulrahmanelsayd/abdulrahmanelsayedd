import { advantages } from "../../content/services";
import styles from "./ServicesQuality.module.css";

function Tick() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 5 5 9-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}


export function ServicesQuality() {
  return <section className={styles.advantages} data-section="advantages" data-services-section-motion aria-labelledby="advantages-title">
        <div className={`${styles.container} ${styles.qualityLayout}`}>
          <div className={styles.qualityIntro}><p className={styles.eyebrow} data-services-section-enter>Part of the build</p><h2 id="advantages-title" data-services-section-enter>The details<br /><span>are included.<svg viewBox="0 0 300 26" preserveAspectRatio="none" fill="none" data-services-draw aria-hidden="true"><path d="M5 12C96 1 191 4 294 14M54 23C127 10 216 13 264 22" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg></span></h2><p className={styles.qualityDescription} data-services-section-enter>How it looks is one part. How it loads, works and gets managed matters just as much.</p><svg className={styles.thread} data-services-section-enter viewBox="0 0 280 108" fill="none" data-services-draw aria-hidden="true"><path d="M4 64c58-72 106-52 114-24 15 53-68 53-46 4 29-62 123-18 188 37m-28-3 30 5-1-28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
          <div className={styles.qualitySheet}>
            <div className={styles.sheetHeader}><span data-services-section-enter>Before it goes live</span><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#82a0ff" /><path d="m13 25 8 8 15-19" stroke="#161313" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" data-services-check /></svg></div>
            <ol className={styles.qualityList}>
              {advantages.map((item, index) => <li key={item.title}><details name="services-quality" open={index === 0} data-services-detail><summary><span className={styles.qualityCheck}><Tick /></span><h3>{item.title}</h3><span className={styles.plus} aria-hidden="true" /></summary><p>{item.body}</p></details></li>)}
            </ol>
          </div>
        </div>
      </section>;
}
