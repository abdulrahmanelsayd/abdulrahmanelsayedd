import type { Metadata } from "next";
import { getPageMetadata } from "../lib/page-metadata";
import { Hero } from "../components/home/Hero";
import { CapabilityMarquee } from "../components/home/CapabilityMarquee";
import { HomeIntroduction } from "../components/home/HomeIntroduction";
import { HomeProjects } from "../components/home/HomeProjects";
import { SiteFooter } from "../components/footer/SiteFooter";

export const metadata: Metadata = getPageMetadata("home");

export default function Home() {
  return (
    <><main id="main-content" tabIndex={-1} data-route="/" style={{ background: "#fff" }}>
      <Hero />
      <CapabilityMarquee />
      <HomeIntroduction />
      <HomeProjects />
    </main><SiteFooter from="projects" /></>
  );
}
