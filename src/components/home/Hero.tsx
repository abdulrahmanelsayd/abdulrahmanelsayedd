import localFont from "next/font/local";
import { getImageProps } from "next/image";
import { identity } from "../../content/identity";
import { HeroMotion } from "./HeroMotion";
import styles from "./Hero.module.css";

// A late font must never resize a name the visitor has already seen.
const heroFont = localFont({ src: "../../assets/fonts/Chillax-Variable.woff2", weight: "200 700", style: "normal", display: "optional", variable: "--font-hero" });

const words = identity.name.split(" ");
const roleLines = identity.role.split(" & ");
export function Hero() {
  const { props: portrait } = getImageProps({
    src: "/images/mee-hero-h03-c01.webp", width: 1191, height: 1321,
    alt: "Portrait of Abdulrahman Elsayed", loading: "eager", fetchPriority: "high", quality: 75,
    // The native portrait stays below 80 KiB. A fixed hint avoids a second mobile
    // request when the preload scanner resolves viewport-height units differently.
    sizes: "1191px",
  });
  return <HeroMotion className={`${styles.hero} ${heroFont.variable}`}>
    <div className={styles.photograph} data-hero-photo-layer>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...portrait} alt={portrait.alt} className={styles.portrait} data-hero-photo draggable={false} />
    </div>
    <h1 id="home-hero-heading" className={styles.name}>
      <span className="sr-only">{identity.name} —</span>
      <span className={styles.track} data-hero-track aria-hidden="true">
        {[0, 1, 2].map(copy => <span className={styles.nameCopy} data-hero-name-copy key={copy}>
          {words.map(word => <span className={styles.word} key={word}>{word}</span>)}
          <span className={styles.separator}>—</span>
        </span>)}
      </span>
    </h1>
    <div className={styles.description} data-hero-description>
      <svg className={styles.arrow} viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M1 1 16 16M1 16h15V1" stroke="currentColor" strokeWidth="1.5" /></svg>
      <p className={styles.role} data-hero-role>{roleLines.map((line, row) => <span className={styles.roleLine} key={line}>
        {row === 1 ? "& " : null}{line}
      </span>)}</p>
    </div>
    <div className={styles.badge} data-hero-location>
      <p className={styles.location}><span>Based in</span><span>Egypt</span></p>
      <div className={styles.ball} aria-hidden="true"><div className={styles.globe} data-hero-globe>
        <div className={styles.globeWrap}><i className={styles.meridian} /><i className={styles.meridian} /><i className={styles.meridian} /><i className={styles.latitude} /><i className={styles.equator} /></div>
      </div></div>
    </div>
    <noscript><style>{`[data-hero-track]{display:block!important;width:100%!important;white-space:normal!important}[data-hero-name-copy]{display:none!important}[data-hero-name-copy]:first-child{display:flex!important;flex-wrap:wrap!important;overflow-wrap:anywhere}[data-hero-name-copy]:first-child>span{max-width:100%}[data-hero-name-copy]>:last-child{display:none}`}</style></noscript>
  </HeroMotion>;
}


