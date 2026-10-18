import type { Metadata } from "next";
import { identity } from "../content/identity";
import { socialPreview } from "../content/assets";
import { getRoute, type RouteId } from "../content/routes";
import { getSiteUrl } from "./site-url";

export const sharedOpenGraph = {
  type: "website", siteName: identity.name, locale: "en_US",
  images: [{ url: socialPreview.src, alt: socialPreview.alt, width: socialPreview.width, height: socialPreview.height, type: "image/jpeg" }],
} satisfies NonNullable<Metadata["openGraph"]>;

export function getPageMetadata(id: RouteId): Pick<Metadata, "alternates" | "openGraph"> {
  const url = new URL(getRoute(id).href, getSiteUrl()).href;
  return {
    alternates: { canonical: url },
    // Next replaces nested metadata fields; retain the shared image and identity.
    openGraph: { ...sharedOpenGraph, url },
  };
}
