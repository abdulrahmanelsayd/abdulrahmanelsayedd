import { designItems, developmentItems, serviceModes } from "../../content/services";
import { ServiceStudioArt } from "./ServicesGraphics";
import { ServicesStudioInteraction } from "./ServicesStudioInteraction";
import { ServicesRibbon } from "./ServicesRibbon";
import { Arrow } from "../ui/Icons";
import { TransitionLink } from "../transitions/TransitionLink";
import styles from "./ServicesStudio.module.css";

function Tick() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 5 5 9-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Deliverable({ label, items }: { label: string; items: readonly string[] }) {
  return <details className={styles.deliverable} data-services-detail data-services-deliverable>
    <summary>
      <h4>{label}</h4>
      <span className={styles.deliverableChevron} aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" focusable="false"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
    </summary>
    <div className={styles.deliverableBody} data-services-detail-body>
      <ul role="list">{items.map(item => <li key={item}><Tick />{item}</li>)}</ul>
    </div>
  </details>;
}

export function ServicesStudio() {
  return (      <section id="services-studio" className={styles.capabilities} data-section="capabilities" aria-labelledby="capabilities-title" tabIndex={-1}>
        <div className={styles.container}>
          <div className={styles.studioHeading} data-services-reveal><p className={styles.eyebrow}>Design &amp; development</p><h2 id="capabilities-title">What are we building?</h2><p className={styles.sectionDescription}>A new website, a redesign, or the next feature.</p></div>
          <fieldset className={styles.studio} data-services-studio data-services-reveal>
            <legend className="sr-only">Explore design, development, or both together</legend>
            <div className={styles.studioTabs}>
              {serviceModes.map(mode => <div className={styles.modeOption} key={mode.id}>
                <input className={styles.radio} type="radio" name="services-mode" id={`services-mode-${mode.id}`} value={mode.id} defaultChecked={mode.id === "together"} aria-label={mode.label} aria-controls={`services-panel-${mode.id}`} />
                <label htmlFor={`services-mode-${mode.id}`}><span>{mode.label}</span><span className={styles.modeDot} aria-hidden="true" /></label>
              </div>)}
            </div>
            <div className={styles.studioStage}>
              {serviceModes.map(mode => <div className={styles.studioPanel} id={`services-panel-${mode.id}`} data-services-panel={mode.id} key={mode.id}>
                <div className={styles.studioCopy} data-services-panel-piece><h3>{mode.title}</h3><p>{mode.body}</p><TransitionLink className={styles.discuss} href="/contact">Discuss your website<Arrow size={20} /></TransitionLink></div>
                <div className={styles.studioArt} data-services-panel-piece><ServiceStudioArt mode={mode.id} /></div>
                <div className={styles.deliverables} data-services-panel-piece>
                  {mode.id !== "develop" && <Deliverable label="Design" items={designItems} />}
                  {mode.id !== "design" && <Deliverable label="Development" items={developmentItems} />}
                </div>
              </div>)}
            </div>
          </fieldset>
          <ServicesStudioInteraction />
          <ServicesRibbon />
        </div>
      </section>

);
}
