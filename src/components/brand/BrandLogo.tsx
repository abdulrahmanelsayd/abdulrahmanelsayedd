import { brandGeometry } from "./geometry";
import styles from "./BrandLogo.module.css";

/** Original decorative pen paths. The containing link owns the accessible name. */
export function BrandLogo({ variant = "signature" }: { variant?: keyof typeof brandGeometry }) {
  const geometry = brandGeometry[variant];
  return <svg className={styles.logo} viewBox={geometry.viewBox} fill="none" stroke="currentColor"
    strokeWidth={geometry.strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" data-brand-logo data-brand-variant={variant}>
    {geometry.paths.map((path, index) => <path key={index} d={path}
      className={index === geometry.paths.length - 1 ? styles.underline : undefined}
      pathLength={index === geometry.paths.length - 1 ? 1 : undefined} />)}
  </svg>;
}
