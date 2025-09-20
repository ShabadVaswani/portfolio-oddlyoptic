import React, { useEffect, useMemo, useRef } from 'react'

// Feature toggles: show/hide optional UI
const SHOW_MODAL_TAGS = true
const SHOW_MODAL_DESCRIPTION = true

export default function VideoModal({ project, onClose }) {
  const backdropRef = useRef(null)
  const dialogRef = useRef(null)

  const focusables = useMemo(() => [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[tabindex]:not([tabindex="-1"])'
  ], [])

  // Focus trap + ESC to close
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      } else if (e.key === 'Tab') {
        const nodes = dialog.querySelectorAll(focusables.join(','))
        if (!nodes.length) return
        const list = Array.from(nodes).filter(el => !el.hasAttribute('disabled'))
        const first = list[0]
        const last = list[list.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    dialog.addEventListener('keydown', onKeyDown)
    dialog.focus()
    return () => dialog.removeEventListener('keydown', onKeyDown)
  }, [focusables, onClose])

  const onBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose?.()
  }

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop"
      onMouseDown={onBackdropClick}
      aria-hidden="false"
    >
      <div
        id="video-modal"
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${project.id}-title`}
        tabIndex={-1}
      >
        <button className="modal-close btn ghost" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <header className="modal-head">
          <h3 id={`${project.id}-title`} className="modal-title">Preview</h3>
          {SHOW_MODAL_TAGS && (
            <ul className="tags" role="list">
              {project.tags.map(t => <li key={t} className="tag">{t}</li>)}
            </ul>
          )}
        </header>

        <div className="modal-media">
          <video
            className="modal-video"
            controls
            playsInline
            preload="metadata"
            poster={project.posterDataUri}
            src={project.videoSrc}
          />
        </div>

        {SHOW_MODAL_DESCRIPTION && (
          <p className="muted modal-desc">{project.description}</p>
        )}

        <div className="modal-actions">
          <button className="btn primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
