import type { MediaSource, MemeAsset, MemeManifest } from '../types/media'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isSource = (value: unknown): value is MediaSource => {
  if (!isRecord(value) || typeof value.width !== 'number') return false
  return ['avif', 'webp', 'src'].some(
    (key) => typeof value[key] === 'string' && String(value[key]).startsWith('/'),
  )
}

const isAsset = (value: unknown): value is MemeAsset => {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    (value.kind === 'image' || value.kind === 'video') &&
    Array.isArray(value.sources) &&
    value.sources.length > 0 &&
    value.sources.every(isSource) &&
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    typeof value.alt === 'string' &&
    typeof value.hash === 'string' &&
    typeof value.sourcePostId === 'string' &&
    (value.lastModified === undefined || typeof value.lastModified === 'string')
  )
}

export function parseMemeManifest(input: unknown): MemeManifest {
  if (!isRecord(input) || !Array.isArray(input.assets)) {
    throw new TypeError('Invalid PEPECAT media manifest')
  }

  const assets = input.assets.filter(isAsset)
  if (assets.length === 0) throw new TypeError('Media manifest contains no usable assets')

  const baseline = isRecord(input.auditedBaseline)
    ? {
        photos: Number(input.auditedBaseline.photos) || 391,
        videos: Number(input.auditedBaseline.videos) || 1,
      }
    : { photos: 391, videos: 1 }

  return {
    snapshotDate: typeof input.snapshotDate === 'string' ? input.snapshotDate : '2026-08-11',
    auditedBaseline: baseline,
    finalCount: typeof input.finalCount === 'number' ? input.finalCount : assets.length,
    assets,
  }
}
