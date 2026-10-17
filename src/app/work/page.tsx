import type { Metadata } from "next";
import { getRoute } from "../../content/routes";
import { getPageMetadata } from "../../lib/page-metadata";
import { getProject, workProjectIds } from "../../content/projects";
import { WorkTitle } from "../../components/work/WorkTitle";
import { WorkGallery } from "../../components/work/WorkGallery";
import { SiteFooter } from "../../components/footer/SiteFooter";
import styles from "../../components/work/WorkPage.module.css";

export const metadata: Metadata = {
  ...getPageMetadata("work"),
  title: getRoute("work").label,
  description: "Explore a selection of Abdulrahman Elsayed's web projects for businesses across 3 countries.",
};
export default function WorkPage() {
  const projects = workProjectIds.map(getProject);
  return <>
    <main id="main-content" tabIndex={-1} data-route="/work" className={styles.page}>
      <WorkTitle count={projects.length} />
      <WorkGallery projects={projects} />
    </main>
    <SiteFooter />
  </>;
}
