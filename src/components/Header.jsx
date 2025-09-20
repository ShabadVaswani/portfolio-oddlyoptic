import React, { useEffect, useState } from 'react'

export default function Header({ sections, active, onJump }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const closeOnResize = () => setOpen(false)
    window.addEventListener('resize', closeOnResize)
    return () => window.removeEventListener('resize', closeOnResize)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // No logo auto-detection; expect the file at /logo.png

  return (
    <header className="site-header" data-reveal>
      <div className="container nav-wrap">
        <a className="brand" href="#hero" onClick={(e) => {
          e.preventDefault()
          onJump?.('hero')
        }}>
          <span aria-hidden="true" className="brand-mark has-image">
            <img className="brand-logo" src="/logo.png" alt="OddlyOpticAI logo" />
          </span>
          <span className="brand-text">OddlyOpticAI</span>
        </a>

        <button
          className="nav-toggle"
          aria-label="Toggle navigation"
          aria-expanded={open ? 'true' : 'false'}
          onClick={() => setOpen(v => !v)}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>

        <nav className={`site-nav ${open ? 'open' : ''}`} aria-label="Primary">
          <ul>
            {sections.map(s => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={active === s.id ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault()
                    onJump?.(s.id)
                    setOpen(false)
                  }}
                >
                  {s.label}
                  <span className="active-indicator" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
