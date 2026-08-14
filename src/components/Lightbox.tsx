import { useEffect, useRef } from 'react'
import type { MemeAsset } from '../types/media'
import { ResponsiveMedia } from './ResponsiveMedia'

interface LightboxProps {
  assets: MemeAsset[]
  activeIndex: number
  onChange: (index: number) => void
  onClose: () => void
}

const focusableSelector = 'button:not([disabled]), a[href], video[controls], [tabindex]:not([tabindex="-1"])'

export function Lightbox({ assets, activeIndex, onChange, onClose }: LightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const asset = assets[activeIndex]

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      returnFocusRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') onChange((activeIndex + 1) % assets.length)
      if (event.key === 'ArrowLeft') onChange((activeIndex - 1 + assets.length) % assets.length)
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [activeIndex, assets.length, onChange, onClose])

  return (
    <div className="lightbox-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} className="lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-title">
        <header className="lightbox__bar">
          <p className="mono" id="lightbox-title">ARCHIVE VIEW · {String(activeIndex + 1).padStart(2, '0')} / {String(assets.length).padStart(2, '0')}</p>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label="Close media viewer">CLOSE ×</button>
        </header>
        <div className="lightbox__media">
          <ResponsiveMedia asset={asset} />
        </div>
        <footer className="lightbox__footer">
          <button className="text-button" type="button" onClick={() => onChange((activeIndex - 1 + assets.length) % assets.length)}>← Previous</button>
          <p>PEPECAT meme art #{asset.sourcePostId}</p>
          <button className="text-button" type="button" onClick={() => onChange((activeIndex + 1) % assets.length)}>Next →</button>
        </footer>
      </div>
    </div>
  )
}
