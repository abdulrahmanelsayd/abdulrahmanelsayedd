import Image from "next/image";
import type { Project } from "../../content/projects";
import { Arrow } from "../ui/Icons";
import styles from "./WorkPage.module.css";

// Matches the capped grid, its gutters and the two column gaps, including the mobile cap.
const previewSizes = "(max-width: 767px) min(470px, calc(100vw - 48px)), (max-width: 1023px) calc((100vw - 96px) / 2), (max-width: 1409px) calc((88vw - 72px) / 3), 389.34px";

export function ProjectCard({ project, index }: { project: Project; index: number }) {
  return <li className={styles.item} data-work-card data-project-id={project.id}>
    <a href={project.href} target="_blank" rel="noopener noreferrer" className={styles.projectLink} aria-label={`${project.name} — Visit website (opens in a new tab)`}>
      <div className={styles.media}>
        <Image className={styles.preview} src={project.preview.src} width={project.preview.width} height={project.preview.height} alt={project.preview.alt} sizes={previewSizes} loading="lazy" />
      </div>
      <div className={styles.frame} aria-hidden="true" />
      <div className={styles.cardTop}><span className={styles.type}><Image src="/graphics/truus-projects/type-icon.svg" width={18} height={18} alt="" unoptimized /><span>Web</span></span></div>
      <div className={styles.caption} data-work-caption>
        <span className={styles.tag}>{new URL(project.href).hostname.replace(/^www\./, "")}</span>
        <h3>{project.name}</h3>
        <span className={styles.visit}>Visit website<Arrow size={20} /><svg className={styles.drawLine} viewBox="0 0 169 10" fill="none" aria-hidden="true" focusable="false"><path d="M1 6.5661C56.3941 3.06082 112.187 1.20095 168 .999878M32.1313 8.63371C68.2147 6.92799 104.462 6.13378 140.695 6.25107" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></svg></span>
      </div>
    </a>
    {index % 3 === 0 && <Image className={styles.cardSticker} src={`/graphics/truus-projects/sticker-${index % 4}.svg`} width={100} height={100} alt="" aria-hidden="true" unoptimized loading="lazy" />}
  </li>;
}
