import { TransitionLink as Link } from "../components/transitions/TransitionLink";
import { getRoute } from "../content/routes";
import styles from "../components/PlaceholderPage.module.css";

export default function NotFound() {
  return <main id="main-content" tabIndex={-1} className={styles.page}><h1>Page not found</h1><Link href={getRoute("home").href}>Return home</Link></main>;
}
