import { describe, expect, it } from 'vitest'

import { createAsset } from '../test/fixtures'
import {
  selectNewestAssets,
  sortAssetsNewestFirst,
  upsertSupplementalAsset,
} from './mediaRecency'

describe('sortAssetsNewestFirst', () => {
  it('orders the gallery by lastModified, newest first', () => {
    const oldest = { ...createAsset(1), lastModified: '2026-01-01T00:00:00.000Z' }
    const newest = { ...createAsset(2), lastModified: '2026-08-14T12:00:00.000Z' }
    const middle = { ...createAsset(3), lastModified: '2026-06-01T00:00:00.000Z' }

    expect(sortAssetsNewestFirst([oldest, newest, middle]).map(({ id }) => id)).toEqual([
      'meme-0002',
      'meme-0003',
      'meme-0001',
    ])
  })

  it('uses a stable sourcePostId fallback so missing mtimes do not shuffle', () => {
    const early = createAsset(5)
    const later = createAsset(314)
    delete (early as { lastModified?: string }).lastModified
    delete (later as { lastModified?: string }).lastModified

    expect(sortAssetsNewestFirst([early, later]).map(({ id }) => id)).toEqual([
      'meme-0314',
      'meme-0005',
    ])
    expect(sortAssetsNewestFirst([later, early]).map(({ id }) => id)).toEqual([
      'meme-0314',
      'meme-0005',
    ])
  })

  it('breaks remaining ties by id so equal timestamps stay deterministic', () => {
    const stamp = '2026-08-14T00:00:00.000Z'
    const forest = { ...createAsset(8), id: 'supp-forest-rest', lastModified: stamp }
    const pump = { ...createAsset(9), id: 'supp-pump-flight', lastModified: stamp }

    expect(sortAssetsNewestFirst([pump, forest]).map(({ id }) => id)).toEqual([
      'supp-forest-rest',
      'supp-pump-flight',
    ])
  })
})

describe('selectNewestAssets', () => {
  it('defaults the visible wall to the newest distinct assets', () => {
    const assets = [
      { ...createAsset(1), lastModified: '2026-01-01T00:00:00.000Z' },
      { ...createAsset(2), lastModified: '2026-08-14T00:00:00.000Z' },
      { ...createAsset(3), lastModified: '2026-06-01T00:00:00.000Z' },
      { ...createAsset(2), lastModified: '2026-08-14T00:00:00.000Z' },
    ]

    expect(selectNewestAssets(assets, 2).map(({ id }) => id)).toEqual(['meme-0002', 'meme-0003'])
  })
})

describe('upsertSupplementalAsset', () => {
  it('does not duplicate an existing id and only bumps lastModified', () => {
    const now = '2026-08-14T00:26:00.000Z'
    const existing = {
      ...createAsset(1),
      id: 'supp-forest-rest',
      hash: 'abc123',
      lastModified: '2026-08-12T00:00:00.000Z',
    }
    const reupload = {
      ...existing,
      alt: 'PEPECAT resting in a leafy forest clearing with friends',
      lastModified: '2026-01-01T00:00:00.000Z',
    }

    const next = upsertSupplementalAsset([existing, createAsset(2)], reupload, now)

    expect(next).toHaveLength(2)
    expect(next[0]).toMatchObject({
      id: 'supp-forest-rest',
      hash: 'abc123',
      lastModified: now,
    })
    expect(next[1].id).toBe('meme-0002')
  })

  it('does not duplicate the same hash under a new id and only bumps mtime', () => {
    const now = '2026-08-14T00:26:00.000Z'
    const existing = { ...createAsset(1), hash: 'same-bytes', lastModified: '2026-08-11T00:00:00.000Z' }
    const incoming = { ...createAsset(99), hash: 'same-bytes' }

    const next = upsertSupplementalAsset([existing], incoming, now)

    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({
      id: existing.id,
      hash: 'same-bytes',
      lastModified: now,
    })
  })

  it('appends a genuinely new supplemental asset with the provided mtime', () => {
    const now = '2026-08-14T00:26:00.000Z'
    const existing = createAsset(1)
    const incoming = { ...createAsset(2), id: 'supp-pump-flight', hash: 'new-bytes' }

    const next = upsertSupplementalAsset([existing], incoming, now)

    expect(next.map(({ id }) => id)).toEqual(['meme-0001', 'supp-pump-flight'])
    expect(next[1].lastModified).toBe(now)
  })
})
