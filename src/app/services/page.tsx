import type { Metadata } from "next";
import { servicesDescription } from "../../content/services";
import { getPageMetadata } from "../../lib/page-metadata";
import { ServicesHero } from "../../components/services/ServicesHero";
import { ServicesStudio } from "../../components/services/ServicesStudio";
import { ServicesProcess } from "../../components/services/ServicesProcess";
import { ServicesQuality } from "../../components/services/ServicesQuality";
import { ServicesSectionsMotion } from "../../components/services/ServicesSectionsMotion";
import { SiteFooter } from "../../components/footer/SiteFooter";

export const metadata: Metadata = {
  ...getPageMetadata("services"),
  title: "Services", description: servicesDescription,
};
export default function ServicesPage() {
  return <>
    <main id="main-content" tabIndex={-1} data-route="/services">
      <section data-section="services-introduction" aria-labelledby="services-title"><ServicesHero /></section>
      <ServicesStudio />
      <ServicesProcess />
      <ServicesQuality />
      <ServicesSectionsMotion />
    </main>
    <SiteFooter />
  </>;
}
