import type { Project } from "../../content/projects";
import { ProjectCard } from "./ProjectCard";
import { WorkGalleryMotion } from "./WorkGalleryMotion";
import styles from "./WorkPage.module.css";

export function WorkGallery({ projects }: { projects: readonly Project[] }) {
  return <section className={styles.gallery} data-section="work-projects" aria-labelledby="work-gallery-title">
    <h2 id="work-gallery-title" className="sr-only">Featured websites</h2>
    <WorkGalleryMotion className={styles.grid}>
      {projects.map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)}
    </WorkGalleryMotion>
  </section>;
}
