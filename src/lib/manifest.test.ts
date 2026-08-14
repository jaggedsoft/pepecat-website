import { describe, expect, it } from 'vitest'

import { parseMemeManifest } from './manifest'
import { createAsset } from '../test/fixtures'

describe('parseMemeManifest', () => {
  it('accepts a generated archive manifest and preserves its metadata', () => {
    const raw = {
      snapshotDate: '2026-08-11',
      auditedBaseline: { photos: 1, videos: 1 },
      finalCount: 2,
      assets: [createAsset(1), createAsset(2, 'video')],
    }

    const parsed = parseMemeManifest(raw)

    expect(parsed.snapshotDate).toBe('2026-08-11')
    expect(parsed.finalCount).toBe(2)
    expect(parsed.auditedBaseline).toEqual({ photos: 1, videos: 1 })
    expect(parsed.assets).toHaveLength(2)
    expect(parsed.assets[1]).toMatchObject({
      id: 'meme-0002',
      kind: 'video',
      poster: '/media/memes/meme-0002-poster.webp',
      sourcePostId: '10002',
    })
  })

  it('preserves lastModified metadata when present', () => {
    const stamped = { ...createAsset(1), lastModified: '2026-08-14T00:26:00.000Z' }
    const parsed = parseMemeManifest({
      snapshotDate: '2026-08-11',
      auditedBaseline: { photos: 1, videos: 0 },
      finalCount: 1,
      assets: [stamped],
    })

    expect(parsed.assets[0].lastModified).toBe('2026-08-14T00:26:00.000Z')
  })

  it.each([
    ['an invalid kind', { ...createAsset(1), kind: 'gif' }],
    ['a missing content hash', { ...createAsset(1), hash: undefined }],
    ['an empty source list', { ...createAsset(1), sources: [] }],
  ])('rejects assets with %s', (_label, asset) => {
    const raw = {
      snapshotDate: '2026-08-11',
      auditedBaseline: { photos: 1, videos: 0 },
      finalCount: 1,
      assets: [asset],
    }

    expect(() => parseMemeManifest(raw)).toThrow()
  })

  it('drops malformed entries while retaining valid generated assets', () => {
    const raw = {
      snapshotDate: '2026-08-11',
      auditedBaseline: { photos: 1, videos: 0 },
      finalCount: 1,
      assets: [createAsset(1), { id: 'broken' }],
    }

    expect(parseMemeManifest(raw).assets.map(({ id }) => id)).toEqual(['meme-0001'])
  })
})
