import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MemeAsset } from '../types/media'
import { FEATURED_MEME_ID_SET, FEATURED_MEME_IDS } from '../data/featuredMemes'
import { persistSelection, selectSessionAssets, shuffleAssets } from '../lib/memeSelection'
import { ResponsiveMedia } from './ResponsiveMedia'
import { Lightbox } from './Lightbox'

interface MemeWallProps {
  manifest: MemeAsset[]
  totalCount: number
}

export const SESSION_KEY = 'pepecat:meme-selection:v3'
const PREVIEW_COUNT = 20
const SHUFFLE_INTERVAL_MS = 120_000

function MemeTile({
  asset,
  index,
  onOpen,
  onError,
}: {
  asset: MemeAsset
  index: number
  onOpen?: () => void
  onError: () => void
}) {
  const media = <ResponsiveMedia asset={asset} onError={onError} />

  return (
    <figure className={`meme-tile meme-tile--${(index % 6) + 1}`}>
      {asset.kind === 'video' || !onOpen ? (
        <div className="meme-tile__media">
          {media}
        </div>
      ) : (
        <button className="meme-tile__open" type="button" onClick={onOpen} aria-label={`Open ${asset.alt}`}>
          {media}
        </button>
      )}
      <figcaption className="sr-only">{asset.alt}</figcaption>
    </figure>
  )
}

export function MemeWall({ manifest, totalCount }: MemeWallProps) {
  const featured = useMemo(
    () => FEATURED_MEME_IDS
      .map((id) => manifest.find((asset) => asset.id === id))
      .filter((asset): asset is MemeAsset => Boolean(asset)),
    [manifest],
  )
  const pool = useMemo(
    () => manifest.filter((asset) => !FEATURED_MEME_ID_SET.has(asset.id)),
    [manifest],
  )
  const [visible, setVisible] = useState<MemeAsset[]>(() => selectSessionAssets(pool, PREVIEW_COUNT, sessionStorage, SESSION_KEY))
  const [failed, setFailed] = useState<Set<string>>(() => new Set())
  const [gallery, setGallery] = useState<MemeAsset[] | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [shuffleTick, setShuffleTick] = useState(0)
  const shuffleButtonRef = useRef<HTMLButtonElement>(null)

  const changeActiveIndex = useCallback((index: number) => setActiveIndex(index), [])
  const closeLightbox = useCallback(() => {
    setActiveIndex(null)
    setGallery(null)
  }, [])

  useEffect(() => {
    const validIds = new Set(pool.map((asset) => asset.id))
    if (visible.some((asset) => !validIds.has(asset.id))) {
      setVisible(selectSessionAssets(pool, PREVIEW_COUNT, sessionStorage, SESSION_KEY))
    }
  }, [pool, visible])

  useEffect(() => {
    const timer = window.setInterval(() => {
      shuffleButtonRef.current?.click()
    }, SHUFFLE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [])

  const shuffle = () => {
    const next = shuffleAssets(pool.filter((asset) => !failed.has(asset.id)), visible, PREVIEW_COUNT)
    persistSelection(next, sessionStorage, SESSION_KEY)
    setVisible(next)
    setShuffleTick((tick) => tick + 1)
  }

  const replaceFailed = (id: string) => {
    const nextFailed = new Set(failed).add(id)
    setFailed(nextFailed)
    setVisible((current) => {
      const used = new Set(current.map((asset) => asset.id))
      const replacement = pool.find((asset) => !used.has(asset.id) && !nextFailed.has(asset.id))
      if (!replacement) return current
      const next = current.map((asset) => (asset.id === id ? replacement : asset))
      persistSelection(next, sessionStorage, SESSION_KEY)
      return next
    })
  }

  const openGallery = (assets: MemeAsset[], index: number) => {
    setGallery(assets)
    setActiveIndex(index)
  }

  const shownFeatured = featured.filter((asset) => !failed.has(asset.id))

  return (
    <>
      {shownFeatured.length > 0 && (
        <div className="featured-rail" aria-label="Featured PEPECAT artwork">
          {shownFeatured.map((asset, index) => (
            <MemeTile
              key={asset.id}
              asset={asset}
              index={index}
              onOpen={asset.kind === 'image' ? () => openGallery(shownFeatured, index) : undefined}
              onError={() => setFailed((current) => new Set(current).add(asset.id))}
            />
          ))}
        </div>
      )}
      <div className="archive-controls">
        <p className="archive-count mono">{totalCount || manifest.length} Memes</p>
        <button ref={shuffleButtonRef} className="action-button" type="button" onClick={shuffle}>
          👀 More memes
          <span className="btn-icon" aria-hidden="true">↝</span>
        </button>
      </div>
      <div className="meme-wall" data-shuffle={shuffleTick} aria-live="polite">
        {visible.map((asset, index) => (
          <MemeTile
            key={`${asset.id}-${shuffleTick}`}
            asset={asset}
            index={index}
            onOpen={asset.kind === 'image' ? () => openGallery(visible, index) : undefined}
            onError={() => replaceFailed(asset.id)}
          />
        ))}
      </div>
      {gallery && activeIndex !== null && gallery[activeIndex] && (
        <Lightbox assets={gallery} activeIndex={activeIndex} onChange={changeActiveIndex} onClose={closeLightbox} />
      )}
    </>
  )
}
