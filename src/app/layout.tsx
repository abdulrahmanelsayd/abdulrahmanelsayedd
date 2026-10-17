import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { identity } from "../content/identity";
import { siteIcons, socialPreview } from "../content/assets";
import { getSiteUrl } from "../lib/site-url";
import { sharedOpenGraph } from "../lib/page-metadata";
import { SiteChrome } from "../components/navigation/SiteChrome";
import { NavigationPanel } from "../components/navigation/NavigationPanel";
import { PageTransitions } from "../components/transitions/PageTransitions";
import { entryBootstrap } from "../components/transitions/entry-bootstrap";
import "../styles/reset.css";
import "../styles/globals.css";

const chillax = localFont({
  src: "../assets/fonts/Chillax-Variable.woff2",
  weight: "200 700",
  style: "normal",
  display: "swap",
  variable: "--font-chillax",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: `${identity.name} | ${identity.role}`, template: `%s | ${identity.name}` },
  description: identity.description,
  icons: { icon: [siteIcons.favicon, siteIcons.icon], apple: siteIcons.apple },
  openGraph: sharedOpenGraph,
  twitter: { card: "summary_large_image", images: [{ url: socialPreview.src, alt: socialPreview.alt }] },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" dir="ltr" suppressHydrationWarning><head>
    <script id="page-entry-bootstrap" dangerouslySetInnerHTML={{ __html: entryBootstrap }} />
  </head><body className={chillax.variable}>
    <PageTransitions><SiteChrome menu={<NavigationPanel />}>{children}</SiteChrome></PageTransitions>
  </body></html>;
}
