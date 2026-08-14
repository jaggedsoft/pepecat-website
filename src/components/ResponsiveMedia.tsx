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

export function ResponsiveMedia({ asset, loading = 'lazy', onError, className }: ResponsiveMediaProps) {
  if (asset.kind === 'video') {
    const videoSource = asset.sources.find((source) => source.src)?.src
    return (
      <video
        className={className}
        controls
        playsInline
        preload="none"
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
