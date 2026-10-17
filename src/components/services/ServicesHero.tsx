import { Arrow } from "../ui/Icons";
import { ServicesHeroInteraction } from "./ServicesHeroInteraction";
import styles from "./ServicesHero.module.css";

export function ServicesHero() {
  return <div className={styles.hero} data-services-hero>
    <div className={styles.container}>
      <h1 id="services-title" className="sr-only">Web design and development services. Let’s build.</h1>
      <p className={styles.prelude} data-services-hero-enter>Let’s<svg viewBox="0 0 180 70" fill="none" aria-hidden="true"><path d="M4 20C43-12 96 10 92 40c-4 29-49 25-37-4C73 4 139 19 167 53m-23-4 26 7-5-25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></p>
      <button type="button" aria-disabled="true" className={styles.playground} data-services-hero-play aria-label="Play with the Build title">
        <span className={styles.word} aria-hidden="true">
          <span className={styles.letter} data-services-hero-letter>B</span>
          <span className={`${styles.letter} ${styles.u}`} data-services-hero-letter>u<svg className={styles.eyes} viewBox="0 0 100 38" fill="none"><g data-services-hero-eyes><circle cx="32" cy="20" r="13" fill="#161313" /><circle cx="68" cy="20" r="13" fill="#161313" /><g data-services-hero-pupils><circle cx="35" cy="17" r="4" fill="#f0ebe6" /><circle cx="71" cy="17" r="4" fill="#f0ebe6" /></g></g></svg></span>
          <span className={styles.letter} data-services-hero-letter>i</span>
          <span className={styles.letter} data-services-hero-letter>l</span>
          <span className={styles.letter} data-services-hero-letter>d</span>
          <span className={styles.dot} data-services-hero-dot />
        </span>
        <span className={styles.outline} data-services-hero-outline aria-hidden="true"><i /><i /><i /><i /></span>
        <span className={styles.playHint} aria-hidden="true"><span className={styles.mouseHint}>Click to put it together.</span><span className={styles.touchHint}>Tap to put it together.</span><Arrow size={18} /></span>
      </button>
      <div className={styles.bottom} data-services-hero-enter><p>A new site, a store, or the next version.<br />Choose the part you need.</p><a href="#services-studio" className={styles.explore}>Explore services<span><Arrow size={23} /></span></a></div>
    </div>
  <ServicesHeroInteraction /></div>;
}

