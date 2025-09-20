import React, { useEffect, useRef, useState } from 'react'

// Feature toggles for optional UI bits
const SHOW_CARD_TAGS = true
const SHOW_CARD_TITLE = true
const SHOW_CARD_BLURB = true

export default function ProjectCard({
  project,
  onOpen,
  setTriggerRef,
  registerPlayer,
  pauseOthers,
  allowAutoPlay,
}) {
  const { id, title, tags, blurb, posterDataUri } = project
  const videoRef = useRef(null)
  const cardRef = useRef(null)
  const inViewRef = useRef(false)
  const unlockedRef = useRef(false)

  // Ensure the video element has the right attributes for mobile autoplay
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    try {
      v.muted = true
      v.playsInline = true
      v.setAttribute('muted', '')
      v.setAttribute('playsinline', '')
      v.setAttribute('autoplay', '')
    } catch {}
  }, [])

  // No lazy gating: set src immediately; we handle play/pause via IO

  // Register video with controller
  useEffect(() => {
    registerPlayer(id, videoRef.current)
    return () => registerPlayer(id, null)
  }, [id, registerPlayer])

  // Hover/focus playback rules
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const tryPlay = async () => {
      if (!allowAutoPlay) return
      pauseOthers(id)
      try { await v.play() } catch {}
    }
    const tryPause = () => {
      try { v.pause() } catch {}
    }

    const onEnter = () => tryPlay()
    const onLeave = () => { if (!allowAutoPlay) tryPause() }
    const onFocus = () => tryPlay()
    const onBlur = () => { if (!allowAutoPlay) tryPause() }

    v.addEventListener('mouseenter', onEnter)
    v.addEventListener('mouseleave', onLeave)
    v.addEventListener('focus', onFocus)
    v.addEventListener('blur', onBlur)

    // On click/tap toggle play for touch/reduced motion
    const onClick = () => {
      if (!allowAutoPlay) {
        if (v.paused) {
          pauseOthers(id)
          v.play().catch(() => {})
        } else {
          v.pause()
        }
      }
    }
    v.addEventListener('click', onClick)

    return () => {
      v.removeEventListener('mouseenter', onEnter)
      v.removeEventListener('mouseleave', onLeave)
      v.removeEventListener('focus', onFocus)
      v.removeEventListener('blur', onBlur)
      v.removeEventListener('click', onClick)
    }
  }, [allowAutoPlay, id, pauseOthers])

  // Autoplay when in viewport; pause when out, if autoplay allowed
  useEffect(() => {
    if (!allowAutoPlay) return
    const v = videoRef.current
    const card = cardRef.current
    if (!v || !card) return

    // Ensure muted inline for mobile autoplay
    try { v.muted = true } catch {}

    const maybePlay = () => {
      if (!inViewRef.current) return
      pauseOthers(id)
      v.play().catch(() => {})
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.target === card) {
          inViewRef.current = e.isIntersecting
          if (e.isIntersecting) {
            maybePlay()
          } else {
            v.pause()
          }
        }
      })
    }, { threshold: 0.0 })
    io.observe(card)
    // If the source/metadata becomes ready while in view, kick playback
    const onLoadedData = () => maybePlay()
    const onCanPlay = () => maybePlay()
    // Try shortly after mount as a safety
    const t = setTimeout(maybePlay, 100)
    v.addEventListener('loadeddata', onLoadedData)
    v.addEventListener('canplay', onCanPlay)

    // User-gesture unlock fallback (for stricter autoplay policies)
    const unlock = () => {
      if (unlockedRef.current) return
      unlockedRef.current = true
      if (inViewRef.current) {
        pauseOthers(id)
        v.play().catch(() => {})
      }
      removeUnlock()
    }
    const removeUnlock = () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('wheel', unlock, true)
      window.removeEventListener('touchstart', unlock, { passive: true })
      document.removeEventListener('visibilitychange', onVis)
    }
    const onVis = () => {
      if (document.visibilityState === 'visible' && inViewRef.current) {
        pauseOthers(id)
        v.play().catch(() => {})
      }
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    window.addEventListener('wheel', unlock, true)
    window.addEventListener('touchstart', unlock, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      v.removeEventListener('loadeddata', onLoadedData)
      v.removeEventListener('canplay', onCanPlay)
      clearTimeout(t)
      removeUnlock()
    }
  }, [allowAutoPlay, id, pauseOthers])

  return (
    <article
      ref={cardRef}
      className="card project-card"
      data-reveal
      role="button"
      tabIndex={0}
      aria-label={`Open video`}
      onClick={() => onOpen(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(id)
        }
      }}
    >
      <figure className="thumb">
        <video
          ref={videoRef}
          className="preview"
          aria-label="Video preview"
          muted
          playsInline
          loop
          preload="auto"
          autoPlay
          poster={posterDataUri}
          tabIndex={0}
          src={project.videoSrc}
        />
      </figure>
      <div className="card-body">
        <header className="card-head">
          {SHOW_CARD_TITLE && (<h3 className="card-title">{title}</h3>)}
          {SHOW_CARD_TAGS && (
            <ul className="tags" role="list">
              {tags.map(t => <li key={t} className="tag">{t}</li>)}
            </ul>
          )}
        </header>
        {SHOW_CARD_BLURB && (<p className="muted">{blurb}</p>)}
        <div className="card-actions">
          <button
            className="btn ghost"
            onClick={(e) => { e.stopPropagation(); onOpen(id) }}
            ref={(el) => setTriggerRef(id, el)}
          >
            View
          </button>
        </div>
      </div>
    </article>
  )
}
