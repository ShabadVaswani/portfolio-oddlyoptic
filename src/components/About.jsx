import React from 'react'

function IconBolt() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M13 2L3 14h7l-1 8 10-12h-7l1-8Z"/>
    </svg>
  )
}
function IconAB() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4 18V6h6a4 4 0 1 1 0 8H8v4H4Zm4-8h2a2 2 0 1 0 0-4H8v4Zm8-4h4v12h-4V6Z"/>
    </svg>
  )
}
function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 2 4 5v6c0 5 3.4 9.6 8 11 4.6-1.4 8-6 8-11V5l-8-3Z"/>
    </svg>
  )
}

export default function About() {
  return (
    <section id="about" className="section about" aria-labelledby="about-title">
      <div className="container">
        <header className="section-head" data-reveal>
          <h2 id="about-title">About Us</h2>
          <p className="muted">
            OddlyOpticAI blends human taste with generative models to ship ad concepts in hours, not weeks.
            We explore variations at scale, then pressure-test what actually performs.
          </p>
        </header>

        <ul className="about-highlights" role="list">
          <li className="card" data-reveal>
            <span className="icon"><IconBolt /></span>
            <span className="label">Concept-to-creative in &lt;24h</span>
          </li>
          <li className="card" data-reveal>
            <span className="icon"><IconAB /></span>
            <span className="label">Rapid A/B idea pipelines</span>
          </li>
          <li className="card" data-reveal>
            <span className="icon"><IconShield /></span>
            <span className="label">Brand-safe guardrails</span>
          </li>
        </ul>
      </div>
    </section>
  )
}
