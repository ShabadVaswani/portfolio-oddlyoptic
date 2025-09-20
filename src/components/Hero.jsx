import React from 'react'

export default function Hero({ onCta }) {
  return (
    <section id="hero" className="hero" aria-labelledby="hero-title" data-reveal>
      <div className="container hero-inner">
        <div className="hero-halos" aria-hidden="true" />
        <h1 id="hero-title" className="hero-title">OddlyOpticAI</h1>
        <p className="hero-tag">“AI-crafted advertising that stops the scroll.”</p>
        <p className="hero-sub">We design, iterate, and optimize AI-first ad creatives—fast.</p>
        <div className="hero-cta">
          <button className="btn primary" onClick={onCta}>See Projects</button>
        </div>
      </div>
    </section>
  )
}
