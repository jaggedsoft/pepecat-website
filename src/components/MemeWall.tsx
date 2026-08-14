import { useCallback, useEffect, useState } from 'react'
import type { MemeAsset } from '../types/media'
import { persistSelection, selectSessionAssets, shuffleAssets } from '../lib/memeSelection'
import { ResponsiveMedia } from './ResponsiveMedia'
import { Lightbox } from './Lightbox'

interface MemeWallProps {
  manifest: MemeAsset[]
  totalCount: number
}

const SESSION_KEY = 'pepecat:meme-selection:v2'
const PREVIEW_COUNT = 20

export function MemeWall({ manifest, totalCount }: MemeWallProps) {
  const [visible, setVisible] = useState<MemeAsset[]>(() => selectSessionAssets(manifest, PREVIEW_COUNT, sessionStorage, SESSION_KEY))
  const [failed, setFailed] = useState<Set<string>>(() => new Set())
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [shuffleTick, setShuffleTick] = useState(0)

  const changeActiveIndex = useCallback((index: number) => setActiveIndex(index), [])
  const closeLightbox = useCallback(() => setActiveIndex(null), [])

  useEffect(() => {
    const validIds = new Set(manifest.map((asset) => asset.id))
    if (visible.some((asset) => !validIds.has(asset.id))) {
      setVisible(selectSessionAssets(manifest, PREVIEW_COUNT, sessionStorage, SESSION_KEY))
    }
  }, [manifest, visible])

  const shuffle = () => {
    const next = shuffleAssets(manifest.filter((asset) => !failed.has(asset.id)), visible, PREVIEW_COUNT)
    persistSelection(next, sessionStorage, SESSION_KEY)
    setVisible(next)
    setShuffleTick((tick) => tick + 1)
  }

  const replaceFailed = (id: string) => {
    const nextFailed = new Set(failed).add(id)
    setFailed(nextFailed)
    setVisible((current) => {
      const used = new Set(current.map((asset) => asset.id))
      const replacement = manifest.find((asset) => !used.has(asset.id) && !nextFailed.has(asset.id))
      if (!replacement) return current
      const next = current.map((asset) => (asset.id === id ? replacement : asset))
      persistSelection(next, sessionStorage, SESSION_KEY)
      return next
    })
  }

  return (
    <>
      <div className="archive-controls">
        <p className="archive-count mono"><span>{String(visible.length).padStart(2, '0')}</span> / {totalCount || manifest.length} ON DISPLAY</p>
        <button className="action-button" type="button" onClick={shuffle}>
          <span aria-hidden="true">↝</span> Shuffle the memes
        </button>
      </div>
      <div className="meme-wall" data-shuffle={shuffleTick} aria-live="polite">
        {visible.map((asset, index) => (
          <figure className={`meme-tile meme-tile--${(index % 6) + 1}`} key={`${asset.id}-${shuffleTick}`}>
            {asset.kind === 'video' ? (
              <div className="meme-tile__media">
                <span className="meme-tile__index mono">#{String(index + 1).padStart(3, '0')}</span>
                <ResponsiveMedia asset={asset} onError={() => replaceFailed(asset.id)} />
              </div>
            ) : (
              <button className="meme-tile__open" type="button" onClick={() => setActiveIndex(index)} aria-label={`Open ${asset.alt}`}>
                <span className="meme-tile__index mono">#{String(index + 1).padStart(3, '0')}</span>
                <ResponsiveMedia asset={asset} onError={() => replaceFailed(asset.id)} />
              </button>
            )}
            <figcaption className="sr-only">{asset.alt}</figcaption>
          </figure>
        ))}
      </div>
      {activeIndex !== null && visible[activeIndex] && (
        <Lightbox assets={visible} activeIndex={activeIndex} onChange={changeActiveIndex} onClose={closeLightbox} />
      )}
    </>
  )
}
