import { commitments } from "../../content/about";
import { AboutPrincipleArt } from "./AboutPrincipleArt";
import styles from "./AboutPage.module.css";

export function AboutPrinciples() {
  return <section className={styles.principles} data-section="commitments" aria-labelledby="principles-title">
    <div className={styles.principlesGrid}>
      <div className={styles.principlesIntro}>
        <h2 id="principles-title" data-about-reveal>How I<br /><span className={styles.detailsWord}>work with you.<svg viewBox="0 0 320 22" preserveAspectRatio="none" fill="none" data-about-underline aria-hidden="true" focusable="false"><path pathLength="1" d="M4 13C75 2 177 4 315 10M37 19C111 8 196 10 287 17" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg></span></h2>
        <p data-about-reveal>What you can expect when we work together.</p>
        <div className={styles.artStage} aria-hidden="true" data-about-reveal>
          {commitments.map((item, index) => <div className={styles.artScene} data-about-art={index} key={item.title}><AboutPrincipleArt index={index} /></div>)}
        </div>
      </div>
      <div className={styles.accordion} data-about-accordion data-about-reveal data-about-stationary>
        {commitments.map((item, index) => <details className={styles.principle} name="about-principles" open={index === 0} data-about-value={index} key={item.title}>
          <summary className={styles.summary}>
            <span className={styles.principleNumber} aria-hidden="true">0{index + 1}</span>
            <h3>{item.title}</h3>
            <span className={styles.toggle} aria-hidden="true"><span /><span /></span>
          </summary>
          <div className={styles.answer}><p>{item.body}</p></div>
        </details>)}
      </div>
    </div>
  </section>;
}
