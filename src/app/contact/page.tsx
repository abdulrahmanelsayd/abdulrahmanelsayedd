import type { Metadata } from "next";
import { contact } from "../../content/contact";
import { identity } from "../../content/identity";
import { getPageMetadata } from "../../lib/page-metadata";
import { ContactForm } from "../../components/contact/ContactForm";
import { ContactMotion } from "../../components/contact/ContactMotion";
import { CopyEmailButton } from "../../components/footer/CopyEmailButton";
import { SiteFooter } from "../../components/footer/SiteFooter";
import { Arrow } from "../../components/ui/Icons";
import styles from "../../components/contact/ContactPage.module.css";

export const metadata: Metadata = {
  ...getPageMetadata("contact"),
  title: "Contact", description: contact.description,
};
export default function ContactPage() {
  return <>
    <main id="main-content" tabIndex={-1} data-route="/contact" className={styles.page}>
      <noscript><style>{`.${styles.contactIntro}{padding-top:calc(clamp(112px,16svh,136px) + 60px)}@media(max-width:1023px){.${styles.contactIntro}{padding-top:180px}}@media(max-width:719px){.${styles.contactIntro}{padding-top:162px}}`}</style></noscript>
      <ContactMotion />
      <section className={styles.contactIntro} data-section="contact-form">
        <div className={styles.hero}>
          <p className={styles.eyebrow} data-contact-enter>Contact</p>
          <div className={styles.title}>
            <h1 data-contact-enter>Let’s talk.</h1>
            <svg className={styles.hello} data-contact-hello viewBox="0 0 104 96" aria-hidden="true">
              <path d="M8 26A18 18 0 0 1 26 8h52a18 18 0 0 1 18 18v35a18 18 0 0 1-18 18H62L42 93V79H26A18 18 0 0 1 8 61Z" fill="#f0befa" />
              <circle cx="37" cy="39" r="4" fill="currentColor" /><circle cx="69" cy="39" r="4" fill="currentColor" />
              <path d="M39 57q14 13 28 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <p className={styles.heroCopy} data-contact-enter>{contact.introduction}</p>
          <a className={styles.textLink} href={`mailto:${identity.email}`} data-contact-enter>Email directly <Arrow size={16} /></a>
        </div>
        <div className={styles.enquiry} data-contact-reveal>
          <div className={styles.formAside}>
            <p className={styles.eyebrow}>Start here</p><h2>Your project.</h2>
            <p className={styles.asideCopy}>{contact.aside}</p>
            <div className={styles.specialty}><span aria-hidden="true"><Arrow size={20} /></span><p>I’ll read your brief<br />and discuss the next step.</p></div>
          </div>
          <ContactForm recipient={identity.email} />
        </div>
      </section>
      <section className={styles.contactDetails} data-section="contact-details">
        <div className={styles.container} data-contact-reveal>
          <div className={styles.detailsHeading}><h2>A direct line.</h2></div>
          <div className={styles.detailsGrid}>
            <div className={styles.email}><p>Email</p><div className={styles.emailRow}><a href={`mailto:${identity.email}`}><span>{identity.email.split("@")[0]}<wbr />@{identity.email.split("@")[1]}</span></a><CopyEmailButton email={identity.email} /></div></div>
            <div className={styles.phone}><p>Phone</p><a href={identity.phoneUri}>{identity.phone}<Arrow size={18} /></a></div>
            <div className={styles.base}><p>Location</p><span>{identity.location}</span></div>
          </div>
        </div>
      </section>
      <section className={styles.faq} data-section="faq">
        <div className={styles.faqHeading} data-contact-reveal><p className={styles.eyebrow}>Before we talk</p><h2>A few things to know.</h2></div>
        <div className={styles.questions} data-contact-reveal>{contact.faqs.map((item, index) => <details key={item.title} name="contact-faq" open={index === 0}>
          <summary><h3>{item.title}</h3><span className={styles.plus} aria-hidden="true" /></summary><p>{item.body}</p>
        </details>)}</div>
      </section>
    </main><SiteFooter standalone />
  </>;
}
