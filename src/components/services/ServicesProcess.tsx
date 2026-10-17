import { audiences, processPhases, phaseLabels } from "../../content/services";
import { ServiceProcessPreview } from "./ServicesProcessPreview";
import styles from "./ServicesProcess.module.css";

/** Native details and radios keep the entire process usable without JavaScript. */
export function ServicesProcess() {
  return <section className={styles.overview} data-services-process data-services-section-motion data-section="services-process" aria-label="How the project works">
    <div className={styles.container}>
      <div className={styles.audiences}>
        <p className={styles.eyebrow} data-services-section-enter>Made for</p>
        <div className={styles.audienceList}>
          {audiences.map((item, index) => <details name="services-audience" key={item.title} data-services-detail>
            <summary><span className={styles.audienceDot} data-audience={index} aria-hidden="true" /><h2>{item.title}</h2><span className={styles.plus} aria-hidden="true" /></summary>
            <p>{item.body}</p>
          </details>)}
        </div>
      </div>

      <div className={styles.process}>
        <div className={styles.heading}>
          <h2 data-services-section-enter>From brief <span>to launch.</span></h2>
          <p data-services-section-enter>You know what’s next, and what needs your input.</p>
        </div>
        <fieldset className={styles.picker} data-services-phase-picker>
          <legend className="sr-only">Explore the five project steps</legend>
          <div className={styles.track}>
            <span className={styles.indicator} aria-hidden="true" />
            {processPhases.map((phase, index) => <div className={styles.option} key={phase.title}>
              <input className={styles.radio} type="radio" name="services-phase" id={`services-phase-${index}`} value={index} defaultChecked={index === 0} aria-controls={`services-phase-panel-${index}`} aria-label={`${phaseLabels[index]}: ${phase.title}`} />
              <label htmlFor={`services-phase-${index}`}>{phaseLabels[index]}</label>
            </div>)}
          </div>
          <div className={styles.panels}>
            {processPhases.map((phase, index) => <div className={styles.panel} id={`services-phase-panel-${index}`} data-services-phase-panel={index} key={phase.title} role="region" aria-labelledby={`services-phase-title-${index}`}>
              <div className={styles.copy} data-services-phase-piece data-services-section-enter>
                <p className={styles.progress}><span aria-hidden="true" />Step {index + 1} of {processPhases.length}</p>
                <h3 id={`services-phase-title-${index}`}>{phase.title}.</h3>
                <p className={styles.description}>{phase.body}</p>
              </div>
              <div className={styles.preview} data-services-phase-piece data-services-section-enter aria-hidden="true"><ServiceProcessPreview index={index} /></div>
            </div>)}
          </div>
        </fieldset>
      </div>
    </div>
  </section>;
}
