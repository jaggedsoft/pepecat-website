import { useEffect, useRef, useState } from 'react'
import type { MemeAsset } from '../types/media'

interface ResponsiveMediaProps {
  asset: MemeAsset
  loading?: 'eager' | 'lazy'
  onError?: () => void
  className?: string
}

const srcSet = (asset: MemeAsset, key: 'avif' | 'webp' | 'src') =>
  asset.sources
    .filter((source) => source[key])
    .map((source) => `${source[key]} ${source.width}w`)
    .join(', ')

const fallback = (asset: MemeAsset) => {
  const largest = [...asset.sources].sort((a, b) => b.width - a.width)[0]
  return largest.webp ?? largest.src ?? largest.avif ?? ''
}

const prefersReducedMotion = () =>
  Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(prefersReducedMotion)

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return

    const onChange = () => setReduced(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reduced
}

export function ResponsiveMedia({ asset, loading = 'lazy', onError, className }: ResponsiveMediaProps) {
  const reduceMotion = usePrefersReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = true
    video.defaultMuted = true
    if (reduceMotion) {
      video.pause()
      return
    }

    try {
      const playing = video.play()
      if (playing && typeof playing.catch === 'function') {
        void playing.catch(() => {
          // Autoplay can still be blocked; native controls remain available.
        })
      }
    } catch {
      // jsdom and some browsers throw instead of returning a rejected promise.
    }
  }, [asset.id, reduceMotion])

  if (asset.kind === 'video') {
    const videoSource = asset.sources.find((source) => source.src)?.src
    return (
      <video
        ref={videoRef}
        className={className}
        autoPlay={!reduceMotion}
        muted
        loop
        playsInline
        controls
        preload={reduceMotion ? 'metadata' : 'auto'}
        poster={asset.poster}
        aria-label={asset.alt}
        onError={onError}
      >
        {videoSource && <source src={videoSource} />}
        <p>{asset.alt}. Your browser does not support embedded video.</p>
      </video>
    )
  }

  return (
    <picture>
      {srcSet(asset, 'avif') && <source type="image/avif" srcSet={srcSet(asset, 'avif')} sizes="(max-width: 700px) 50vw, 33vw" />}
      {srcSet(asset, 'webp') && <source type="image/webp" srcSet={srcSet(asset, 'webp')} sizes="(max-width: 700px) 50vw, 33vw" />}
      <img
        className={className}
        src={fallback(asset)}
        width={asset.width}
        height={asset.height}
        alt={asset.alt}
        loading={loading}
        decoding="async"
        onError={onError}
      />
    </picture>
  )
}
