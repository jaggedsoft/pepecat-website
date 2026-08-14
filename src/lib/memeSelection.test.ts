import { describe, expect, it } from 'vitest'

import { selectNewestAssets, selectSessionAssets, shuffleAssets } from './memeSelection'
import { createManifest, MemoryStorage, seededCrypto } from '../test/fixtures'

describe('selectSessionAssets', () => {
  it('selects the requested number of distinct assets', () => {
    const manifest = createManifest(30)
    const selected = selectSessionAssets(
      manifest,
      12,
      new MemoryStorage(),
      'pepecat:test-selection',
      seededCrypto(42),
    )

    expect(selected).toHaveLength(12)
    expect(new Set(selected.map(({ id }) => id)).size).toBe(12)
    expect(selected.every((asset) => manifest.includes(asset))).toBe(true)
  })

  it('persists the selection for the browser session', () => {
    const manifest = createManifest(30)
    const storage = new MemoryStorage()

    const first = selectSessionAssets(manifest, 12, storage, undefined, seededCrypto(1))
    const second = selectSessionAssets(manifest, 12, storage, undefined, seededCrypto(999))

    expect(second.map(({ id }) => id)).toEqual(first.map(({ id }) => id))
  })

  it('recovers when persisted IDs are no longer present in the manifest', () => {
    const manifest = createManifest(30)
    const storage = new MemoryStorage()
    storage.setItem('pepecat:meme-selection:v2', JSON.stringify(['removed-asset']))

    const selected = selectSessionAssets(manifest, 12, storage, undefined, seededCrypto(8))

    expect(selected).toHaveLength(12)
    expect(selected.some(({ id }) => id === 'removed-asset')).toBe(false)
  })

  it('returns every asset once when the requested count exceeds the manifest', () => {
    const manifest = createManifest(5)
    const selected = selectSessionAssets(manifest, 12, new MemoryStorage(), undefined, seededCrypto(3))

    expect(selected).toHaveLength(5)
    expect(new Set(selected.map(({ id }) => id)).size).toBe(5)
  })
})

describe('selectNewestAssets', () => {
  it('returns telegram and numbered assets with the highest ids first', () => {
    const manifest = createManifest(8)
    const selected = selectNewestAssets(manifest, 3)

    expect(selected.map(({ id }) => id)).toEqual(['meme-0008', 'meme-0007', 'meme-0006'])
  })
})

describe('shuffleAssets', () => {
  it('replaces most visible items when enough unseen media exists', () => {
    const manifest = createManifest(30)
    const current = manifest.slice(0, 12)

    const shuffled = shuffleAssets(manifest, current, 12, seededCrypto(17))
    const currentIds = new Set(current.map(({ id }) => id))
    const replacements = shuffled.filter(({ id }) => !currentIds.has(id))

    expect(shuffled).toHaveLength(12)
    expect(new Set(shuffled.map(({ id }) => id)).size).toBe(12)
    expect(replacements.length).toBeGreaterThan(6)
  })

  it('never returns duplicate media when the archive is smaller than the requested count', () => {
    const manifest = createManifest(7)
    const shuffled = shuffleAssets(manifest, manifest.slice(0, 4), 12, seededCrypto(27))

    expect(shuffled).toHaveLength(7)
    expect(new Set(shuffled.map(({ id }) => id)).size).toBe(7)
  })
})
