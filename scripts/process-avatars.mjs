#!/usr/bin/env node

import path from 'node:path';
import {
  asPositiveInteger,
  copyFileAtomic,
  ensureDir,
  mapLimit,
  parseArgs,
  pathExists,
  PROJECT_ROOT,
  sha256File,
  toPublicPath,
  writeJsonAtomic,
} from './lib/common.mjs';
import { DEFAULT_MEDIA_TOOLS_ROOT, loadSharp } from './lib/media-tools.mjs';

const TARGET_WIDTHS = [480, 960, 1440];
const DEFAULT_SOURCE = 'C:\\Users\\AI\\Documents\\Pepecat Avatars';
const EXPRESSION_LABELS = [
  'grinning',
  'shushing',
  'sticking out its tongue',
  'sleepy and yawning',
  'teary-eyed',
  'freezing cold',
  'wearing sunglasses',
  'surprised',
  'showing off Solana eyes',
  'making an okay gesture',
  'wearing devil horns',
  'seeing dollar signs',
  'with eyes on fire',
  'unamused',
  'blowing a kiss',
  'shedding one tear',
  'with heart eyes',
  'furious',
  'thinking hard',
  'snorting with frustration',
  'surrounded by hearts',
  'licking its lips',
  'sweating nervously',
  'laughing with tears',
  'celebrating in a party hat',
  'worried',
  'cheering excitedly',
  'feeling sick',
  'winking with its tongue out',
  'crying dramatically',
  'with star eyes',
  'making a heart with its paws',
  'eating a snack',
  'wearing a halo',
  'covering its face in shock',
  'crying one giant tear',
  'green and blushing',
  'wearing a head bandage',
  'blowing its nose',
  'as a skull',
];

function sourceFilename(number) {
  return number === 37
    ? 'Pc37 2.png'
    : `Pc${String(number).padStart(2, '0')}.png`;
}

function avatarId(number) {
  return `pc${String(number).padStart(2, '0')}`;
}

async function generateVariant(sharp, inputPath, outputPath, width, format) {
  await ensureDir(path.dirname(outputPath));
  const pipeline = sharp(inputPath, { failOn: 'error' }).resize({
    width,
    height: width,
    fit: 'inside',
    withoutEnlargement: true,
    kernel: 'lanczos3',
  });

  if (format === 'avif') {
    await pipeline
      .avif({ quality: 58, effort: 6, chromaSubsampling: '4:4:4' })
      .toFile(outputPath);
  } else {
    await pipeline
      .webp({ quality: 84, effort: 5, alphaQuality: 100, smartSubsample: true })
      .toFile(outputPath);
  }
}

async function main() {
  const args = parseArgs();
  const sourceDirectory = path.resolve(args.source ?? DEFAULT_SOURCE);
  const rawDirectory = path.resolve(
    args.rawDir ?? path.join(PROJECT_ROOT, 'media-raw', 'avatars'),
  );
  const outputDirectory = path.resolve(
    args.outputDir ?? path.join(PROJECT_ROOT, 'public', 'media', 'avatars'),
  );
  const toolsRoot = path.resolve(
    args.toolsRoot ?? process.env.PEPECAT_MEDIA_TOOLS ?? DEFAULT_MEDIA_TOOLS_ROOT,
  );
  const concurrency = asPositiveInteger(args.concurrency, 2);
  const sharp = loadSharp(toolsRoot);

  await Promise.all([ensureDir(rawDirectory), ensureDir(outputDirectory)]);

  const originals = [];
  for (let number = 1; number <= 40; number += 1) {
    const sourcePath = path.join(sourceDirectory, sourceFilename(number));
    if (!(await pathExists(sourcePath))) {
      throw new Error(`Required avatar is missing: ${sourcePath}`);
    }

    const id = avatarId(number);
    const rawPath = path.join(rawDirectory, `${id}.png`);
    const sourceHash = await sha256File(sourcePath);
    const rawHash = (await pathExists(rawPath)) ? await sha256File(rawPath) : null;
    if (sourceHash !== rawHash) await copyFileAtomic(sourcePath, rawPath);
    originals.push({ id, number, rawPath });
  }

  console.log(`Processing ${originals.length} avatar originals from ${sourceDirectory}`);
  const assets = await mapLimit(originals, concurrency, async (avatar, index) => {
    const metadata = await sharp(avatar.rawPath, { failOn: 'error' }).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error(`Could not read dimensions for ${avatar.rawPath}`);
    }

    const sources = [];
    for (const targetWidth of TARGET_WIDTHS) {
      const width = Math.min(targetWidth, metadata.width);
      const avifPath = path.join(outputDirectory, `${avatar.id}-${width}.avif`);
      const webpPath = path.join(outputDirectory, `${avatar.id}-${width}.webp`);
      await generateVariant(sharp, avatar.rawPath, avifPath, width, 'avif');
      await generateVariant(sharp, avatar.rawPath, webpPath, width, 'webp');
      sources.push({
        width,
        avif: toPublicPath(avifPath),
        webp: toPublicPath(webpPath),
      });
    }

    console.log(`[${index + 1}/${originals.length}] ${avatar.id}`);
    return {
      id: avatar.id,
      sources,
      width: metadata.width,
      height: metadata.height,
      alt: `PEPECAT mascot ${EXPRESSION_LABELS[avatar.number - 1]}`,
    };
  });

  const manifestPath = path.join(outputDirectory, 'manifest.json');
  await writeJsonAtomic(manifestPath, { count: assets.length, assets });
  console.log(`Wrote ${manifestPath}`);
  console.log('Excluded Pc21 copie.png and Pc20 copie.png by construction.');
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
