import type { MemeAsset } from '../types/media'

export type RandomCrypto = Pick<Crypto, 'getRandomValues'>

const randomIndex = (length: number, random: RandomCrypto): number => {
  if (length <= 1) return 0
  const ceiling = Math.floor(0x1_0000_0000 / length) * length
  const buffer = new Uint32Array(1)
  do random.getRandomValues(buffer)
  while (buffer[0] >= ceiling)
  return buffer[0] % length
}

export function pickUnique(
  assets: MemeAsset[],
  count: number,
  random: RandomCrypto = crypto,
): MemeAsset[] {
  const unique = [...new Map(assets.map((asset) => [asset.id, asset])).values()]
  const pool = [...unique]
  const output: MemeAsset[] = []
  const requested = Math.min(Math.max(0, count), pool.length)

  while (output.length < requested) {
    const index = randomIndex(pool.length, random)
    output.push(pool[index])
    pool.splice(index, 1)
  }
  return output
}

export function selectSessionAssets(
  manifest: MemeAsset[],
  count: number,
  storage: Pick<Storage, 'getItem' | 'setItem'> = sessionStorage,
  key = 'pepecat:meme-selection:v1',
  random: RandomCrypto = crypto,
): MemeAsset[] {
  try {
    const savedIds = JSON.parse(storage.getItem(key) ?? '[]') as unknown
    if (Array.isArray(savedIds)) {
      const byId = new Map(manifest.map((asset) => [asset.id, asset]))
      const restored = savedIds
        .filter((id): id is string => typeof id === 'string')
        .map((id) => byId.get(id))
        .filter((asset): asset is MemeAsset => Boolean(asset))
      if (restored.length === Math.min(count, manifest.length)) return restored
    }
  } catch {
    // A malformed session value is safely replaced below.
  }

  const selected = pickUnique(manifest, count, random)
  storage.setItem(key, JSON.stringify(selected.map((asset) => asset.id)))
  return selected
}

export function shuffleAssets(
  manifest: MemeAsset[],
  current: MemeAsset[],
  count: number,
  random: RandomCrypto = crypto,
): MemeAsset[] {
  const currentIds = new Set(current.map((asset) => asset.id))
  const fresh = manifest.filter((asset) => !currentIds.has(asset.id))
  const target = Math.min(count, manifest.length)

  if (fresh.length >= target) return pickUnique(fresh, target, random)

  const next = pickUnique(fresh, fresh.length, random)
  const used = new Set(next.map((asset) => asset.id))
  const remainder = manifest.filter((asset) => !used.has(asset.id))
  next.push(...pickUnique(remainder, target - next.length, random))
  return next
}

export const persistSelection = (
  assets: MemeAsset[],
  storage: Pick<Storage, 'setItem'> = sessionStorage,
  key = 'pepecat:meme-selection:v1',
) => storage.setItem(key, JSON.stringify(assets.map((asset) => asset.id)))
