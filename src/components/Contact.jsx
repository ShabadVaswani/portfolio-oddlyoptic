import React from 'react'

function IconMail() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4 6h16a2 2 0 0 1 2 2v.4l-10 6.25L2 8.4V8a2 2 0 0 1 2-2Zm16 12H4a2 2 0 0 1-2-2V9.6l10 6.25 10-6.25V16a2 2 0 0 1-2 2Z"/>
    </svg>
  )
}

export default function Contact() {
  const email = 'admin@anony-med.coom'
  const subject = 'Hello OddlyOpticAI'
  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <div className="container">
        <header className="section-head" data-reveal>
          <h2 id="contact-title">Contact</h2>
          <p className="muted">We’d love to hear from you.</p>
        </header>

        <div className="contact-wrap card contact-cta" data-reveal>
          <div className="cta-icon" aria-hidden="true"><IconMail /></div>
          <h3 className="cta-title">Get in touch</h3>
          <a className="btn primary" href={`mailto:${email}?subject=${encodeURIComponent(subject)}`}>Email Us</a>
          <p className="muted small" style={{ marginTop: 10 }}>
          </p>
        </div>
      </div>
    </section>
  )
}
