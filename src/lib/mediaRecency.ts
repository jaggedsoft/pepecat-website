import type { MemeAsset } from '../types/media'

export const ARCHIVE_SNAPSHOT_ISO = '2026-08-11T00:00:00.000Z'
export const SUPPLEMENTAL_IMPORT_ISO = '2026-08-12T00:00:00.000Z'

export function fallbackLastModified(asset: Pick<MemeAsset, 'id' | 'sourcePostId'>): string {
  const postId = Number.parseInt(String(asset.sourcePostId ?? ''), 10)
  if (Number.isFinite(postId)) {
    return new Date(Date.parse(ARCHIVE_SNAPSHOT_ISO) + postId * 1000).toISOString()
  }
  if (
    String(asset.sourcePostId ?? '').startsWith('supplemental-') ||
    String(asset.id ?? '').startsWith('supp-')
  ) {
    return SUPPLEMENTAL_IMPORT_ISO
  }
  return ARCHIVE_SNAPSHOT_ISO
}

export function lastModifiedMs(asset: MemeAsset): number {
  if (typeof asset.lastModified === 'string') {
    const parsed = Date.parse(asset.lastModified)
    if (Number.isFinite(parsed)) return parsed
  }
  return Date.parse(fallbackLastModified(asset))
}

export function sortAssetsNewestFirst(assets: MemeAsset[]): MemeAsset[] {
  return [...assets].sort((left, right) => {
    const delta = lastModifiedMs(right) - lastModifiedMs(left)
    if (delta !== 0) return delta
    return left.id.localeCompare(right.id, 'en')
  })
}

export function selectNewestAssets(assets: MemeAsset[], count: number): MemeAsset[] {
  const unique = [...new Map(assets.map((asset) => [asset.id, asset])).values()]
  return sortAssetsNewestFirst(unique).slice(0, Math.min(Math.max(0, count), unique.length))
}

export function upsertSupplementalAsset(
  assets: MemeAsset[],
  incoming: MemeAsset,
  now: string,
): MemeAsset[] {
  const byId = assets.findIndex((asset) => asset.id === incoming.id)
  if (byId >= 0) {
    const next = assets.slice()
    next[byId] = { ...assets[byId], ...incoming, lastModified: now }
    return next
  }

  const byHash = assets.findIndex((asset) => asset.hash && asset.hash === incoming.hash)
  if (byHash >= 0) {
    const next = assets.slice()
    next[byHash] = { ...next[byHash], lastModified: now }
    return next
  }

  return [...assets, { ...incoming, lastModified: now }]
}
