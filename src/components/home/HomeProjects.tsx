import Image from "next/image";
import { homeProjects, homeProjectSizes, projectArtwork } from "../../content/home-projects";
import type { Project } from "../../content/projects";
import { getRoute } from "../../content/routes";
import { MenuLink } from "../navigation/MenuLink";
import { Arrow } from "../ui/Icons";
import { ProjectStatement } from "./ProjectStatement";
import { ProjectGalleryMotion } from "./ProjectGalleryMotion";
import styles from "./HomeProjects.module.css";

function ProjectLink({ project, className }: { project: Project; className: string }) {
  return <a href={project.href} target="_blank" rel="noopener noreferrer" className={className} aria-label={`${project.name} — Visit website (opens in a new tab)`} draggable={false}>
    <div className={styles.infoTop}><h3>{project.name}</h3></div>
    <div className={styles.drawButton}><span>Visit website</span><svg viewBox="0 0 169 10" fill="none" aria-hidden="true" focusable="false">
      <path d="M1 6.5661C56.3941 3.06082 112.187 1.20095 168 0.999878M32.1313 8.63371C68.2147 6.92799 104.462 6.13378 140.695 6.25107" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg></div>
  </a>;
}

/** All four real projects and their destinations are rendered on the server. */
export function HomeProjects() {
  return <section className={styles.section} data-section="selected-projects" data-home-deferred aria-labelledby="selected-work-title">
    <h2 id="selected-work-title" className="sr-only">Selected projects</h2>
    <ProjectStatement />
    <div className={styles.container}><ProjectGalleryMotion className={styles.group} count={homeProjects.length}>
      <div className={styles.top} id="home-project-gallery" data-project-stage role="group" aria-label="Featured projects">
        <svg className={styles.scribble} viewBox="0 0 80 109" fill="none" aria-hidden="true" focusable="false"><path data-project-draw pathLength="1" d="M11.1056 107.429C11.1056 107.429 41.3921 75.9563 1.85536 45.3846C39.6893 67.1983 37.5729 21.5813 34.6647 13.925C40.0573 22.0799 72.2872 32.0642 78.2717 2.44878" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <Image className={styles.blob} src="/graphics/truus-projects/blob.svg" width={449} height={458} alt="" aria-hidden="true" unoptimized />
        <div className={styles.cards} data-project-cards>
          {homeProjects.map(project => {
            const artwork = projectArtwork[project.id];
            return <article className={styles.card} key={project.id} data-project-card data-project-id={project.id} data-project-name={project.name}>
              <div className={styles.visual} data-project-visual>
                <div className={styles.media}><Image className={styles.preview} src={project.preview.src} width={project.preview.width} height={project.preview.height} sizes={homeProjectSizes} quality={90} alt="" draggable={false} /></div>
                <div className={styles.border} />
                <div className={styles.tagPosition}><span className={styles.tag}>{project.name.replace(" Pharmacy", "")}</span></div>
                <div className={styles.typePosition}><span className={styles.type}><Image src="/graphics/truus-projects/type-icon.svg" width={24} height={24} alt="" unoptimized /><span>Web</span></span></div>
                <div className={styles.stickerPosition}><div className={styles.sticker}><Image src={artwork.sticker} width={200} height={200} alt="" aria-hidden="true" draggable={false} unoptimized style={{width:`${artwork.scale}%`,height:"auto"}} /></div></div>
              </div>
              <ProjectLink project={project} className={styles.fallbackLink} />
            </article>;
          })}
        </div>
      </div>
      <div className={styles.bottom}><div className={styles.infoCollection}>
        {homeProjects.map(project => <div className={styles.infoItem} key={project.id} data-project-info data-project-id={project.id} aria-hidden="true" inert><ProjectLink project={project} className={styles.infoLink} /></div>)}
      </div></div>
      <div className={styles.controls} role="group" aria-label="Browse featured projects">
        <button type="button" disabled data-project-previous aria-controls="home-project-gallery" aria-label="Previous project"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M16 10H4m5-5-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <span aria-hidden="true">Swipe or use the arrows</span>
        <button type="button" disabled data-project-next aria-controls="home-project-gallery" aria-label="Next project"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      </div>
      <MenuLink href={getRoute("work").href} className={styles.moreWork}>More work <Arrow size={18} /></MenuLink>
      <output className="sr-only" aria-live="polite" aria-atomic="true" data-project-status>01 / {String(homeProjects.length).padStart(2,"0")} — {homeProjects[0].name}</output>
      <div className={styles.cursor} data-project-cursor aria-hidden="true"><span className={styles.cursorLabel} data-project-cursor-label>Drag</span></div>
    </ProjectGalleryMotion></div>
  </section>;
}
