import React from 'react'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer" data-reveal>
      <div className="container">
        <small className="muted">© {year} OddlyOpticAI. Crafted with generative tools.</small>
      </div>
    </footer>
  )
}
