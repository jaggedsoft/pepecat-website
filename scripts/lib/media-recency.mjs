export const ARCHIVE_SNAPSHOT_ISO = '2026-08-11T00:00:00.000Z'
export const SUPPLEMENTAL_IMPORT_ISO = '2026-08-12T00:00:00.000Z'

export const FEATURED_SOURCE_POST_IDS = ['169', '203', '215', '230', '280', '314']
export const FEATURED_ASSET_IDS = ['supp-forest-rest']

export function fallbackLastModified(asset) {
  const postId = Number.parseInt(String(asset?.sourcePostId ?? ''), 10)
  if (Number.isFinite(postId)) {
    return new Date(Date.parse(ARCHIVE_SNAPSHOT_ISO) + postId * 1000).toISOString()
  }
  if (
    String(asset?.sourcePostId ?? '').startsWith('supplemental-') ||
    String(asset?.id ?? '').startsWith('supp-')
  ) {
    return SUPPLEMENTAL_IMPORT_ISO
  }
  return ARCHIVE_SNAPSHOT_ISO
}

export function lastModifiedMs(asset) {
  if (typeof asset?.lastModified === 'string') {
    const parsed = Date.parse(asset.lastModified)
    if (Number.isFinite(parsed)) return parsed
  }
  return Date.parse(fallbackLastModified(asset))
}

export function sortAssetsNewestFirst(assets) {
  return [...assets].sort((left, right) => {
    const delta = lastModifiedMs(right) - lastModifiedMs(left)
    if (delta !== 0) return delta
    return String(left.id).localeCompare(String(right.id), 'en')
  })
}

export function upsertSupplementalAsset(assets, incoming, now) {
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

export function hydrateManifestLastModified(
  assets,
  {
    now,
    bumpIds = new Set(FEATURED_ASSET_IDS),
    bumpSourcePostIds = new Set(FEATURED_SOURCE_POST_IDS),
  } = {},
) {
  return assets.map((asset) => {
    if (bumpIds.has(asset.id) || bumpSourcePostIds.has(String(asset.sourcePostId))) {
      return { ...asset, lastModified: now }
    }
    return { ...asset, lastModified: asset.lastModified ?? fallbackLastModified(asset) }
  })
}

export function mergeSupplementalAssets(existingAssets, incomingAssets, now) {
  const incomingIds = new Set(incomingAssets.map((asset) => asset.id))
  let merged = existingAssets.filter((asset) => !incomingIds.has(asset.id))

  for (const incoming of incomingAssets) {
    const previous = existingAssets.find((asset) => asset.id === incoming.id)
    const hashDuplicate = merged.find((asset) => asset.hash && asset.hash === incoming.hash)

    if (previous) {
      const sameContent = previous.hash === incoming.hash
      merged.push({
        ...incoming,
        lastModified: sameContent
          ? (previous.lastModified ?? fallbackLastModified(previous))
          : now,
      })
    } else if (hashDuplicate) {
      merged = merged.map((asset) =>
        asset.hash === incoming.hash ? { ...asset, lastModified: now } : asset,
      )
    } else {
      merged.push({ ...incoming, lastModified: now })
    }
  }

  return hydrateManifestLastModified(merged, { now })
}
