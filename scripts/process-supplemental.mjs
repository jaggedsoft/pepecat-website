#!/usr/bin/env node

import path from 'node:path'
import { stat } from 'node:fs/promises'
import {
  copyFileAtomic,
  ensureDir,
  isNonEmptyFile,
  pathExists,
  PROJECT_ROOT,
  readJson,
  sha256File,
  toPublicPath,
  writeJsonAtomic,
} from './lib/common.mjs'
import {
  extractVideoPoster,
  loadFfmpegPath,
  loadSharp,
  probeVideoDimensions,
  runProcess,
} from './lib/media-tools.mjs'
import { mergeSupplementalAssets } from './lib/media-recency.mjs'

const IMPORT_DATE = '2026-08-14'
const TARGET_WIDTHS = [480, 960, 1440]
const RAW_DIRECTORY = path.join(PROJECT_ROOT, 'media-raw', 'supplemental')
const OUTPUT_DIRECTORY = path.join(PROJECT_ROOT, 'public', 'media', 'memes')
const PROCESSED_PATH = path.join(RAW_DIRECTORY, 'processed.internal.json')

const ITEMS = [
  {
    id: 'supp-temple-expedition',
    kind: 'image',
    source: 'C:/Users/AI/Documents/pepecat/sticker/8.png',
    alt: 'PEPECAT explorers discovering a golden cat monument in a jungle temple',
  },
  {
    id: 'supp-surfing-coins',
    kind: 'image',
    source: 'C:/Users/AI/Documents/pepecat/sticker/Catpepe_24.png',
    alt: 'PEPECAT surfing above waves, fish, and falling gold coins',
  },
  {
    id: 'supp-treasure-cave',
    kind: 'image',
    source: 'C:/Users/AI/Documents/pepecat/sticker/Catpepe_08.png',
    alt: 'PEPECAT carrying a torch through a treasure-filled cave',
  },
  {
    id: 'supp-buy-chat',
    kind: 'video',
    source: 'C:/Users/AI/Documents/pepecat/chat fun.gif',
    alt: 'Animated PEPECAT buy banner with the cat climbing into the chat',
  },
  {
    id: 'supp-hypnotic-cat',
    kind: 'video',
    source: 'C:/Users/AI/Documents/pepecat/buybot02.gif',
    alt: 'Animated PEPECAT against a pink and cyan spiral',
  },
  {
    id: 'supp-party-night',
    kind: 'video',
    source: 'C:/Users/AI/Documents/pepecat/buybot.gif',
    alt: 'Animated PEPECAT hosting a colorful party',
  },
  {
    id: 'supp-pond-float',
    kind: 'image',
    source: 'C:/Users/AI/Documents/pepecat/pepecat photo_2026-08-11_21-25-01.jpg',
    alt: 'PEPECAT floating peacefully in a sunlit forest pond',
  },
  {
    id: 'supp-forest-rest',
    kind: 'image',
    source: 'C:/Users/AI/Documents/pepecat/HPNs2qtbAAEkYK1.jpg',
    alt: 'PEPECAT resting in a leafy forest clearing with friends',
  },
  {
    id: 'supp-laser-heist',
    kind: 'image',
    source: 'C:/Users/AI/Documents/pepecat/photo_2026-08-11_19-51-50.jpg',
    alt: 'PEPECAT dodging red security lasers above a vault of golden coins and a key',
  },
  {
    id: 'supp-pump-flight',
    kind: 'image',
    source: path.join(PROJECT_ROOT, 'media-raw', 'supplemental', 'supp-pump-flight.webp'),
    alt: 'PEPECAT flying with a neon green aura and profit ticks',
  },
  {
    id: 'supp-stage-candles',
    kind: 'image',
    source: path.join(PROJECT_ROOT, 'media-raw', 'supplemental', 'supp-stage-candles.jpg'),
    alt: 'PEPECAT on stage pointing at a green star before a candle audience',
  },
  {
    id: 'supp-space-burger',
    kind: 'image',
    source: path.join(PROJECT_ROOT, 'media-raw', 'supplemental', 'supp-space-burger.png'),
    alt: 'PEPECAT on a giant green candle in space with a burger and a dog',
  },
  {
    id: 'supp-bar-salaryman',
    kind: 'image',
    source: path.join(PROJECT_ROOT, 'media-raw', 'supplemental', 'supp-bar-salaryman.png'),
    alt: 'PEPECAT salaryman at a Japanese bar with beer',
  },
]

function responsiveWidths(originalWidth) {
  return [...new Set(TARGET_WIDTHS.map((width) => Math.min(width, originalWidth)))]
    .sort((left, right) => left - right)
}

async function outputsExist(asset) {
  const publicPaths = asset.sources.flatMap((source) =>
    [source.avif, source.webp, source.src].filter(Boolean),
  )
  if (asset.poster) publicPaths.push(asset.poster)
  return (
    await Promise.all(
      publicPaths.map((publicPath) =>
        isNonEmptyFile(path.join(PROJECT_ROOT, 'public', publicPath.replace(/^\//, ''))),
      ),
    )
  ).every(Boolean)
}

async function snapshotSource(item) {
  const extension = path.extname(item.source).toLowerCase()
  const rawPath = path.join(RAW_DIRECTORY, `${item.id}${extension}`)
  if (await pathExists(item.source)) {
    const sourceHash = await sha256File(item.source)
    const rawHash = (await isNonEmptyFile(rawPath)) ? await sha256File(rawPath) : null
    if (sourceHash !== rawHash) await copyFileAtomic(item.source, rawPath)
  } else if (!(await isNonEmptyFile(rawPath))) {
    throw new Error(`Supplemental source is unavailable: ${item.source}`)
  }
  return { rawPath, hash: await sha256File(rawPath) }
}

async function processImage(sharp, item, rawPath, hash) {
  const metadata = await sharp(rawPath, { failOn: 'error', animated: false }).metadata()
  if (!metadata.width || !metadata.height) throw new Error(`No dimensions for ${item.id}`)

  const sources = []
  for (const width of responsiveWidths(metadata.width)) {
    const avifPath = path.join(OUTPUT_DIRECTORY, `${item.id}-${width}.avif`)
    const webpPath = path.join(OUTPUT_DIRECTORY, `${item.id}-${width}.webp`)
    await sharp(rawPath, { failOn: 'error', animated: false })
      .resize({ width, withoutEnlargement: true, kernel: 'lanczos3' })
      .avif({ quality: 58, effort: 6, chromaSubsampling: '4:4:4' })
      .toFile(avifPath)
    await sharp(rawPath, { failOn: 'error', animated: false })
      .resize({ width, withoutEnlargement: true, kernel: 'lanczos3' })
      .webp({ quality: 84, effort: 5, alphaQuality: 100, smartSubsample: true })
      .toFile(webpPath)
    sources.push({ width, avif: toPublicPath(avifPath), webp: toPublicPath(webpPath) })
  }

  return {
    id: item.id,
    kind: 'image',
    sources,
    width: metadata.width,
    height: metadata.height,
    alt: item.alt,
    hash,
    sourcePostId: `supplemental-${item.id}`,
  }
}

async function processVideo(sharp, ffmpegPath, item, rawPath, hash) {
  const dimensions = await probeVideoDimensions(ffmpegPath, rawPath)
  const videoPath = path.join(OUTPUT_DIRECTORY, `${item.id}.mp4`)
  const posterSource = path.join(RAW_DIRECTORY, `${item.id}-poster.png`)
  const posterPath = path.join(OUTPUT_DIRECTORY, `${item.id}-poster.webp`)

  await runProcess(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error', '-i', rawPath,
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '22',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-y', videoPath,
  ])
  await extractVideoPoster(ffmpegPath, rawPath, posterSource)
  await sharp(posterSource, { failOn: 'error' })
    .resize({ width: Math.min(960, dimensions.width), withoutEnlargement: true })
    .webp({ quality: 84, effort: 5 })
    .toFile(posterPath)

  return {
    id: item.id,
    kind: 'video',
    sources: [{ width: dimensions.width, src: toPublicPath(videoPath) }],
    poster: toPublicPath(posterPath),
    width: dimensions.width,
    height: dimensions.height,
    alt: item.alt,
    hash,
    sourcePostId: `supplemental-${item.id}`,
  }
}

async function mergePublicManifest(assets, now) {
  const manifestPath = path.join(OUTPUT_DIRECTORY, 'manifest.json')
  const manifest = await readJson(manifestPath)
  if (!manifest?.assets) throw new Error('Run the Telegram snapshot before supplemental import.')
  const mergedAssets = mergeSupplementalAssets(manifest.assets, assets, now)
  await writeJsonAtomic(manifestPath, {
    ...manifest,
    finalCount: mergedAssets.length,
    assets: mergedAssets,
  })
}

async function main() {
  await Promise.all([ensureDir(RAW_DIRECTORY), ensureDir(OUTPUT_DIRECTORY)])
  const now = new Date().toISOString()
  const sharp = loadSharp()
  let ffmpegPath = null
  const cached = await readJson(PROCESSED_PATH, { assets: [] })
  const cachedById = new Map(cached.assets.map((entry) => [entry.id, entry]))
  const processed = []

  for (const item of ITEMS) {
    const { rawPath, hash } = await snapshotSource(item)
    const existing = cachedById.get(item.id)
    if (existing?.rawHash === hash && existing.asset && await outputsExist(existing.asset)) {
      processed.push(existing)
      continue
    }
    if (item.kind === 'video' && !ffmpegPath) ffmpegPath = loadFfmpegPath()
    const asset = item.kind === 'video'
      ? await processVideo(sharp, ffmpegPath, item, rawPath, hash)
      : await processImage(sharp, item, rawPath, hash)
    processed.push({ id: item.id, rawHash: hash, bytes: (await stat(rawPath)).size, asset })
    await writeJsonAtomic(PROCESSED_PATH, { importDate: IMPORT_DATE, assets: processed })
  }

  await writeJsonAtomic(PROCESSED_PATH, { importDate: IMPORT_DATE, assets: processed })
  await mergePublicManifest(processed.map((entry) => entry.asset), now)
  console.log(`Imported ${processed.length} supplemental PEPECAT artworks.`)
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
