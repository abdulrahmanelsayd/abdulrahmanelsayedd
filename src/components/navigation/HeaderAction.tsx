import { getRoute, type RouteId } from "../../content/routes";
import { MenuLink } from "./MenuLink";
import { RollingLabel } from "../ui/RollingLabel";
import styles from "./Navigation.module.css";

export function HeaderAction({ route, label, full = false }: { route: RouteId; label?: string; full?: boolean }) {
  const item = getRoute(route);
  return <MenuLink href={item.href} data-header-action={route} data-roll-trigger className={`${styles.action} ${route === "work" ? styles.work : styles.contact}`}>
    <span className={styles.surface} data-header-surface><RollingLabel label={label ?? item.label} full={full} /></span>
  </MenuLink>;
}
