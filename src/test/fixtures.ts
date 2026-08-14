export type TestMemeAsset = {
  id: string
  kind: 'image' | 'video'
  sources: Array<{ width: number; avif?: string; webp?: string; src?: string }>
  poster?: string
  width: number
  height: number
  alt: string
  hash: string
  sourcePostId: string
  lastModified?: string
}

export function createAsset(index: number, kind: 'image' | 'video' = 'image'): TestMemeAsset {
  const id = `meme-${String(index).padStart(4, '0')}`

  return {
    id,
    kind,
    sources: kind === 'video'
      ? [{ src: `/media/memes/${id}.mp4`, width: 1440 }]
      : [480, 960, 1440].map((width) => ({
          avif: `/media/memes/${id}-${width}.avif`,
          webp: `/media/memes/${id}-${width}.webp`,
          width,
        })),
    ...(kind === 'video' ? { poster: `/media/memes/${id}-poster.webp` } : {}),
    width: 1440,
    height: 1440,
    alt: kind === 'video' ? `PEPECAT meme video ${index}` : `PEPECAT meme artwork ${index}`,
    hash: `sha256-${String(index).padStart(64, '0')}`,
    sourcePostId: String(10_000 + index),
  }
}

export function createManifest(size = 30) {
  return Array.from({ length: size }, (_, index) => createAsset(index + 1))
}

/** Deterministic Web Crypto-compatible source for selection tests. */
export function seededCrypto(seed = 1): Pick<Crypto, 'getRandomValues'> {
  let state = seed >>> 0

  return {
    getRandomValues<T extends ArrayBufferView | null>(array: T): T {
      if (!array) return array

      const values = array as unknown as { length: number; [index: number]: number }
      for (let index = 0; index < values.length; index += 1) {
        state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0
        values[index] = state
      }

      return array
    },
  }
}

export class MemoryStorage implements Storage {
  #items = new Map<string, string>()

  get length() {
    return this.#items.size
  }

  clear() {
    this.#items.clear()
  }

  getItem(key: string) {
    return this.#items.get(key) ?? null
  }

  key(index: number) {
    return [...this.#items.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.#items.delete(key)
  }

  setItem(key: string, value: string) {
    this.#items.set(key, value)
  }
}
