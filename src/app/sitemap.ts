import type { MetadataRoute } from "next";
import { routes } from "../content/routes";
import { getSiteUrl } from "../lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return routes.map(route => ({ url: new URL(route.href, siteUrl).href }));
}
