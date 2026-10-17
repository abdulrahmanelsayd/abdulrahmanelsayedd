import type { Metadata } from "next";
import { about } from "../../content/about";
import { identity } from "../../content/identity";
import { portraits } from "../../content/assets";
import { getSiteUrl } from "../../lib/site-url";
import { getPageMetadata } from "../../lib/page-metadata";
import { AboutIntroduction } from "../../components/about/AboutIntroduction";
import { AboutPrinciples } from "../../components/about/AboutPrinciples";
import { AboutReveal } from "../../components/about/AboutReveal";
import { AboutPressGuard } from "../../components/about/AboutPressGuard";
import { SiteFooter } from "../../components/footer/SiteFooter";
import styles from "../../components/about/AboutPage.module.css";

export const metadata: Metadata = {
  ...getPageMetadata("about"),
  title: "About", description: about.description,
};

export default function AboutPage() {
  const siteUrl = getSiteUrl();
  const person = {
    "@context": "https://schema.org", "@type": "Person",
    "@id": new URL("/#person", siteUrl).href,
    name: identity.name, jobTitle: identity.role, description: about.description,
    url: new URL("/about", siteUrl).href, image: new URL(portraits.clean.src, siteUrl).href,
    address: { "@type": "PostalAddress", addressCountry: about.countryCode },
    email: identity.email, telephone: identity.phoneUri.replace("tel:", ""),
    sameAs: identity.socials.map(social => social.href),
  };
  return <>
    <main id="main-content" tabIndex={-1} data-route="/about" className={styles.page}>
      <noscript><style>{`.${styles.introduction}{padding-top:calc(clamp(112px,16svh,136px) + 60px)}@media(max-width:899px){.${styles.introduction}{padding-top:190px}}@media(max-width:599px){.${styles.introduction}{padding-top:172px}}`}</style></noscript>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, "\\u003c") }} />
      <AboutReveal />
      <AboutPressGuard />
      <AboutIntroduction />
      <AboutPrinciples />
    </main>
    <SiteFooter from="about" />
  </>;
}
