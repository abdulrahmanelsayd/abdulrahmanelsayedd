import { introduction } from "../../content/home-introduction";
import { epilogue, instrumentSerif } from "../../styles/hero-fonts";
import { IntroductionMotion } from "./IntroductionMotion";
import styles from "./HomeIntroduction.module.css";

export function HomeIntroduction() {
  let wordIndex = 0;
  const words = (text: string) => text.split(/(\s+)/).map((word, index) => {
    if (/^\s+$/.test(word)) return <span key={index} aria-hidden="true">{word}</span>;
    const lead = wordIndex++ < 2;
    return <span key={index} className={`${styles.word}${word === "out" ? ` ${styles.out}` : ""}`} data-intro-word aria-hidden="true">
      {word === "out" && <svg className={styles.ring} data-intro-ring viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path pathLength="1" d="M380 14C302 0 121 5 43 29C-13 49-8 88 72 108C169 132 333 119 383 83C432 50 360 9 246 9M112 111C174 125 282 124 333 112" />
      </svg>}
      {Array.from(word).map((letter, letterIndex) => <span key={letterIndex} className={styles.letter} data-intro-letter data-intro-lead={lead ? "" : undefined}>{letter}</span>)}
    </span>;
  });
  return <IntroductionMotion className={`${styles.section} ${epilogue.variable} ${instrumentSerif.variable}`} entryFonts={[`900 16px ${epilogue.style.fontFamily}`, `italic 400 16px ${instrumentSerif.style.fontFamily}`]}>
    <div className={styles.stage} data-intro-stage>
      <div className={styles.content} data-intro-content>
        <h2 id="home-introduction-heading" className={styles.heading} aria-label={introduction}>
          {introduction.split(/(stand out|cutting edge)/).map((text, index) => text === "stand out" || text === "cutting edge"
            ? <em key={index} className={styles.serif}>{words(text)}</em>
            : <span key={index}>{words(text)}</span>)}
        </h2>
      </div>
    </div>
  </IntroductionMotion>;
}
