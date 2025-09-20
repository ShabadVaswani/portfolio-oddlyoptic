import React, { useEffect, useMemo, useRef, useState } from 'react'
import ProjectCard from './ProjectCard.jsx'
import VideoModal from './VideoModal.jsx'

function svgPosterDataUri(title, initials, hueShift = 0, showText = false) {
  const enc = encodeURIComponent
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='800' height='450'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#7c5cff'/>
        <stop offset='50%' stop-color='#00e0ff'/>
        <stop offset='100%' stop-color='#ff4ecd'/>
      </linearGradient>
      <filter id='grain'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='table' tableValues='0 0.05'/></feComponentTransfer></filter>
    </defs>
    <rect width='100%' height='100%' fill='#0b0b10'/>
    <g opacity='0.35' transform='rotate(${hueShift} 400 225)'>
      <circle cx='220' cy='180' r='220' fill='url(#g)'/>
      <circle cx='540' cy='280' r='260' fill='url(#g)'/>
    </g>
    <rect width='100%' height='100%' filter='url(#grain)' opacity='.3'/>
    ${showText ? `<text x='50%' y='55%' text-anchor='middle' fill='#e8eaf2' font-family='Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' font-size='84' font-weight='700'>${initials}</text>` : ''}
    ${showText ? `<text x='50%' y='75%' text-anchor='middle' fill='#a8aec3' font-family='Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' font-size='22'>${title}</text>` : ''}
  </svg>`
  return `data:image/svg+xml,${enc(svg)}`
}

// Google Cloud Storage helpers
const GCS_BUCKET = 'oddlyoptic-portfolio-media'
const GCS_VIDEO_PREFIX = 'ai-ads/videos'
const GCS_JSON_PREFIX = 'ai-ads/json'
const encodeGcsPath = (p) => p.split('/').map(encodeURIComponent).join('/')
const storageUrl = (path) => `https://storage.googleapis.com/${GCS_BUCKET}/${encodeGcsPath(path)}`

// Metadata JSON location: GCS-only (no local fallback)
const gcsJsonUrlFor = (nameNoExt) => storageUrl(`${GCS_JSON_PREFIX}/${nameNoExt}.json`)

const initialsFromTitle = (title = '') => {
  const words = title.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] || 'A'
  const second = (words[1]?.[0]) || (words[0]?.[1]) || 'I'
  return (first + second).toUpperCase()
}

// Use simple base keys like `ad_01`; we'll resolve the full filename at runtime.
const PROJECTS_DATA = [
  {
    id: 'neon-soda',
    title: 'Neon Soda — 3D Spin',
    tags: ['Beverage', 'Video', '3D'],
    blurb: 'Snackable loops designed to sparkle in-feed with light-reactive cans.',
    description:
      'We built a 3D spin system that catches ambient light and dramatizes reflections, making the can feel alive. Variants tested different label foils and rim lights. The result: a compact loop that consistently grabs attention without feeling intrusive.',
    videoBase: 'ad_01',
    hue: 8,
  },
  {
    id: 'orbit-shoes',
    title: 'Orbit Shoes — Kinetic Carousel',
    tags: ['Footwear', 'Carousel'],
    blurb: 'Rapid variant carousel tuned for CTR and swipe time.',
    description:
      'We orchestrated a kinetic carousel that rotates product angles while keeping copy extremely scannable. Dozens of variants tested motion pacing and color blocking to maximize interaction without fatiguing users.',
    videoBase: 'ad_02',
    hue: -12,
  },
  {
    id: 'novaskincare',
    title: 'NovaSkincare — Macro Glow',
    tags: ['Beauty', 'Macro'],
    blurb: 'Crisp macro highlights and texture-led storytelling.',
    description:
      'We leaned into macro shots that celebrate texture and finish, building credibility through detail. Subtle rack-focus moments guide the eye to key benefit copy while keeping the pace soothing and premium.',
    videoBase: 'ad_03',
    hue: 18,
  },
  {
    id: 'pulsefit',
    title: 'PulseFit — Motion Morphs',
    tags: ['Fitness', 'Video'],
    blurb: 'Morph sequences align beats with product benefits.',
    description:
      'Beat-matched morphs transition between product states, making benefits intuitive at a glance. We tested rhythm density and accent pulses to balance energy with readability.',
    videoBase: 'ad_04',
    hue: 0,
  },
  {
    id: 'quantawatch',
    title: 'QuantaWatch — Minimal Luxe',
    tags: ['Wearables', 'Static'],
    blurb: 'Ultra-clean layouts that read in 0.3 seconds.',
    description:
      'A spare, high-contrast system that lets the hardware shine. Micro-animations add life without compromising the brand’s restrained tone, producing strong comprehension at speed.',
    videoBase: 'ad_05',
    hue: -24,
  },
  {
    id: 'bytebrew',
    title: 'ByteBrew — Steam & Script',
    tags: ['Coffee', 'UGC'],
    blurb: 'UGC-style hooks synthesized for authenticity.',
    description:
      'We prototyped human-sounding hooks and paired them with tactile coffee moments—steam, pours, crema. The blend reads native in-feed, lifting saves and completion rates.',
    videoBase: 'ad_06',
    hue: 28,
  },
  {
    id: 'astrabags',
    title: 'AstraBags — Color Pop',
    tags: ['Fashion', 'Static'],
    blurb: 'High-chroma accents engineered for scroll-stopping contrast.',
    description:
      'Bold chroma blocks snap attention, while clean product crops keep the brand elevated. We tuned the palette for different feeds to maintain contrast and color fidelity.',
    videoBase: 'ad_07',
    hue: -36,
  },
  {
    id: 'lumenhome',
    title: 'LumenHome — Before/After',
    tags: ['Home', 'Carousel'],
    blurb: 'Transformation sequences optimized for clarity.',
    description:
      'A simple, satisfying reveal compares states without gimmicks. We systematized angles and copy hierarchy so every slide reads instantly—even at small sizes.',
    videoBase: 'ad_08',
    hue: 42,
  },
]

export default function Projects() {
  const [modalProject, setModalProject] = useState(null)
  const triggersRef = useRef(new Map())

  // Single-player controller: pause others when one starts
  const allPlayers = useRef(new Map())
  const registerPlayer = (id, videoEl) => {
    if (videoEl) allPlayers.current.set(id, videoEl)
    else allPlayers.current.delete(id)
  }
  const pauseOthers = (id) => {
    allPlayers.current.forEach((el, key) => {
      if (key !== id && !el.paused) {
        try { el.pause() } catch {}
      }
    })
  }

  const isTouch = useMemo(() => typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window), [])
  const prefersReduced = useMemo(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  // Allow autoplay even on touch devices when muted, but respect reduced-motion
  const allowAutoPlay = !prefersReduced

  // Simulate hover: aggressively try to play all videos periodically when autoplay is allowed.
  // This helps in cases where readiness timing prevented earlier play attempts.
  useEffect(() => {
    if (!allowAutoPlay) return
    let active = true
    const tick = () => {
      if (!active) return
      allPlayers.current.forEach((el) => {
        try {
          el.muted = true
          el.play().catch(() => {})
        } catch {}
      })
      // retry periodically to catch newly-loaded sources
      setTimeout(tick, 1200)
    }
    const t = setTimeout(tick, 300)
    return () => { active = false; clearTimeout(t) }
  }, [allowAutoPlay])

  useEffect(() => {
    if (!modalProject) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [modalProject])

  // Resolve a filename by prefix (e.g., ad_01 -> ad_01_finance.mp4) from GCS
  const [resolved, setResolved] = useState({}) // base -> { url, name }
  const [meta, setMeta] = useState({}) // base -> { title, tags, blurb, description }
  const allowedExts = ['mp4', 'webm', 'mov', 'm4v']
  const extRank = (name) => {
    const m = name.toLowerCase().match(/\.([a-z0-9]+)$/)
    const ext = m ? m[1] : ''
    const idx = allowedExts.indexOf(ext)
    return idx === -1 ? 999 : idx
  }

  const resolveByPrefix = async (base) => {
    const prefixPath = `${GCS_VIDEO_PREFIX}/${base}`
    const endpoint = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o?prefix=${encodeURIComponent(prefixPath)}&fields=items(name,contentType)`
    try {
      const res = await fetch(endpoint)
      if (!res.ok) throw new Error(`GCS list failed: ${res.status}`)
      const data = await res.json()
      const items = (data.items || [])
        .map(i => i.name)
        .filter(name => name.startsWith(prefixPath))
        .filter(name => allowedExts.some(ext => name.toLowerCase().endsWith(`.${ext}`)))
      if (!items.length) return { url: storageUrl(`${GCS_VIDEO_PREFIX}/${base}.mp4`), name: `${GCS_VIDEO_PREFIX}/${base}.mp4` }
      items.sort((a, b) => {
        const aR = extRank(a), bR = extRank(b)
        if (aR !== bR) return aR - bR
        return a.localeCompare(b)
      })
      return { url: storageUrl(items[0]), name: items[0] }
    } catch (e) {
      return { url: storageUrl(`${GCS_VIDEO_PREFIX}/${base}.mp4`), name: `${GCS_VIDEO_PREFIX}/${base}.mp4` }
    }
  }

  useEffect(() => {
    let cancelled = false
    const bases = PROJECTS_DATA.map(p => p.videoBase)
    const run = async () => {
      for (const base of bases) {
        if (resolved[base]) continue
        const result = await resolveByPrefix(base)
        if (!cancelled) setResolved(prev => ({ ...prev, [base]: result }))
      }
    }
    run()
    return () => { cancelled = true }
  }, [resolved])

  // Fetch metadata JSON for each resolved object name
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      for (const p of PROJECTS_DATA) {
        const r = resolved[p.videoBase]
        if (!r) continue
        if (meta[p.videoBase]) continue
        const nameNoExt = r.name.replace(/\.[^.]+$/, '')
        const base = p.videoBase
        // Only fetch from GCS; no local JSON fallbacks
        const urls = [
          gcsJsonUrlFor(base),
          gcsJsonUrlFor(nameNoExt),
        ]
        let loaded = null
        for (const u of urls) {
          try {
            const res = await fetch(u)
            if (!res.ok) continue
            loaded = await res.json()
            break
          } catch (_) {
            // try next
          }
        }
        if (!cancelled) setMeta(prev => ({ ...prev, [p.videoBase]: loaded }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [resolved, meta])

  return (
    <section id="projects" className="section projects" aria-labelledby="projects-title">
      <div className="container">
        <header className="section-head" data-reveal>
          <h2 id="projects-title">Projects</h2>
          <p className="muted">Eight explorations across formats—tuned for performance and brand fidelity.</p>
        </header>

        {/* Derive full video URLs at render time */}
        <div className="grid">
          {PROJECTS_DATA.map((p, idx) => {
            const r = resolved[p.videoBase]
            const m = meta[p.videoBase]
            const title = m?.title || p.title
            const tags = m?.tags || p.tags
            const blurb = m?.blurb || p.blurb
            const description = m?.description || p.description
            const initials = initialsFromTitle(title)
            const posterDataUri = svgPosterDataUri(title, initials, p.hue || 0, false)
            const videoFile = m?.file
            const videoSrc = videoFile
              ? storageUrl(`${GCS_VIDEO_PREFIX}/${videoFile}`)
              : (r?.url || storageUrl(`${GCS_VIDEO_PREFIX}/${p.videoBase}.mp4`))
            const merged = { ...p, title, tags, blurb, description, posterDataUri, videoSrc }
            return (
              <ProjectCard
                key={p.id}
                project={merged}
                onOpen={(id) => {
                  const proj = PROJECTS_DATA.find(x => x.id === id)
                  if (!proj) return
                  const r2 = resolved[proj.videoBase]
                  const m2 = meta[proj.videoBase]
                  const t2 = m2?.title || proj.title
                  const n2 = initialsFromTitle(t2)
                  const videoFile2 = m2?.file
                  const mergedModal = {
                    ...proj,
                    title: t2,
                    tags: m2?.tags || proj.tags,
                    blurb: m2?.blurb || proj.blurb,
                    description: m2?.description || proj.description,
                    posterDataUri: svgPosterDataUri(t2, n2, proj.hue || 0, false),
                    videoSrc: videoFile2
                      ? storageUrl(`${GCS_VIDEO_PREFIX}/${videoFile2}`)
                      : (r2?.url || storageUrl(`${GCS_VIDEO_PREFIX}/${proj.videoBase}.mp4`)),
                  }
                  setModalProject(mergedModal)
                  const btn = triggersRef.current.get(id)
                  setTimeout(() => {
                    document.querySelector('#video-modal')?.focus()
                  }, 0)
                }}
                setTriggerRef={(id, el) => {
                  if (el) triggersRef.current.set(id, el)
                  else triggersRef.current.delete(id)
                }}
                registerPlayer={registerPlayer}
                pauseOthers={pauseOthers}
                allowAutoPlay={allowAutoPlay}
              />
            )
          })}
        </div>
      </div>

      {modalProject && (
        <VideoModal
          project={modalProject}
          onClose={() => {
            const id = modalProject.id
            setModalProject(null)
            const t = triggersRef.current.get(id)
            t?.focus()
          }}
        />
      )}
    </section>
  )
}
