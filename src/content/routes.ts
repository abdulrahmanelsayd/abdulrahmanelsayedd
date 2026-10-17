interface SiteRoute {
  readonly id: string;
  readonly href: `/${string}`;
  readonly label: string;
  readonly descriptor: string;
}

export const routes = [
  { id: "home", href: "/", label: "Home", descriptor: "" },
  { id: "work", href: "/work", label: "Work", descriptor: "SELECTED PROJECTS" },
  { id: "about", href: "/about", label: "About", descriptor: "ABDULRAHMAN ELSAYED" },
  { id: "services", href: "/services", label: "Services", descriptor: "WEB DESIGN & DEVELOPMENT" },
  { id: "contact", href: "/contact", label: "Contact", descriptor: "GET IN TOUCH" },
] as const satisfies readonly SiteRoute[];

export type RouteId = (typeof routes)[number]["id"];
export type InternalPath = (typeof routes)[number]["href"];
export const primaryRouteIds = ["work", "about", "services", "contact"] as const satisfies readonly RouteId[];
export const menuRouteIds = ["home", "work", "about", "services"] as const satisfies readonly RouteId[];
export const footerRouteIds = ["home", "services", "work", "about", "contact"] as const satisfies readonly RouteId[];

export function getRoute(id: RouteId): (typeof routes)[number] {
  const route = routes.find(item => item.id === id);
  if (!route) throw new Error(`Unknown route ID: ${id}`);
  return route;
}

export function isInternalPath(value: string): value is InternalPath {
  return routes.some(route => route.href === value);
}
