import React, { useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import About from './components/About.jsx'
import Projects from './components/Projects.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  const sections = useMemo(() => ([
    { id: 'about', label: 'About' },
    { id: 'projects', label: 'Projects' },
    { id: 'contact', label: 'Contact' },
  ]), [])
  const [active, setActive] = useState('about')

  // Scroll spy: observe sections to set active nav
  useEffect(() => {
    const targets = sections.map(s => document.getElementById(s.id)).filter(Boolean)
    if (!targets.length) return
    const obs = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
      if (visible[0]) setActive(visible[0].target.id)
    }, { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] })
    targets.forEach(t => obs.observe(t))
    return () => obs.disconnect()
  }, [sections])

  // Reveal-on-scroll for elements with [data-reveal]
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('reveal-in'))
      return
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('reveal-in')
          obs.unobserve(e.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' })
    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  const mainRef = useRef(null)

  return (
    <>
      <Header sections={sections} active={active} onJump={(id) => {
        const el = document.getElementById(id)
        if (!el) return
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' })
        el.focus?.()
      }} />
      <main id="main" ref={mainRef}>
        <Hero onCta={() => {
          const el = document.getElementById('projects')
          if (!el) return
          const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' })
        }} />
        <About />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </>
  )
}

