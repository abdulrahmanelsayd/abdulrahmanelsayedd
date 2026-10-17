import type { MetadataRoute } from "next";
import { getRoute } from "../content/routes";
import { getSiteUrl } from "../lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: getRoute("home").href },
    sitemap: new URL("/sitemap.xml", getSiteUrl()).href,
  };
}
