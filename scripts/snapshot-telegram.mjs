#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  asBoolean,
  asPositiveInteger,
  chunk,
  copyFileAtomic,
  ensureDir,
  isNonEmptyFile,
  mapLimit,
  parseArgs,
  pathExists,
  PROJECT_ROOT,
  readJson,
  sha256File,
  sleep,
  SNAPSHOT_DATE,
  sortByArchiveId,
  toPublicPath,
  truncate,
  writeBufferAtomic,
  writeJsonAtomic,
} from './lib/common.mjs';
import {
  DEFAULT_MEDIA_TOOLS_ROOT,
  extractVideoPoster,
  loadFfmpegPath,
  loadSharp,
  probeVideoDimensions,
} from './lib/media-tools.mjs';
import { parseTelegramPreview } from './lib/telegram-html.mjs';
import { fallbackLastModified } from './lib/media-recency.mjs';

const AUDITED_BASELINE = { photos: 391, videos: 1 };
const TARGET_WIDTHS = [480, 960, 1440];
const CONTENT_TYPE_EXTENSIONS = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
  ['image/gif', '.gif'],
  ['video/mp4', '.mp4'],
  ['video/quicktime', '.mov'],
  ['video/webm', '.webm'],
]);

function timestamp() {
  return new Date().toISOString();
}

function safeContentType(value = '') {
  return value.split(';', 1)[0].trim().toLowerCase();
}

function extensionFromResponse(url, contentType, kind) {
  if (CONTENT_TYPE_EXTENSIONS.has(contentType)) {
    return CONTENT_TYPE_EXTENSIONS.get(contentType);
  }
  try {
    const extension = path.extname(new URL(url).pathname).toLowerCase();
    if (/^\.[a-z0-9]{2,5}$/.test(extension)) return extension;
  } catch {
    // The response content type remains the source of truth.
  }
  return kind === 'video' ? '.mp4' : '.jpg';
}

async function fetchWithRetry(url, { attempts = 5, binary = false } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; PEPECAT-Archive-Snapshot/1.0; +https://pepecat.vip/)',
          Accept: binary
            ? 'image/avif,image/webp,image/apng,image/*,video/*,*/*;q=0.8'
            : 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(binary ? 120_000 : 45_000),
      });
      if (!response.ok) {
        const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10);
        if (response.status === 429 && Number.isFinite(retryAfter)) {
          await sleep(Math.min(retryAfter * 1000, 60_000));
        }
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(Math.min(1000 * 2 ** (attempt - 1), 15_000));
    }
  }
  throw new Error(`Failed to fetch ${url}: ${lastError?.message}`, { cause: lastError });
}

function newCrawlState(channel) {
  return {
    schemaVersion: 1,
    channel,
    snapshotDate: SNAPSHOT_DATE,
    startedAt: timestamp(),
    updatedAt: timestamp(),
    pageCount: 0,
    nextBefore: null,
    complete: false,
    lastPagePostCount: 0,
  };
}

async function crawlTelegram({
  channel,
  baseUrl,
  rawDirectory,
  refresh,
  maxPages,
  delay,
}) {
  const statePath = path.join(rawDirectory, 'crawl-state.internal.json');
  const sourcesPath = path.join(rawDirectory, 'sources.internal.json');
  let state = refresh
    ? newCrawlState(channel)
    : await readJson(statePath, newCrawlState(channel));
  let sources = refresh ? [] : await readJson(sourcesPath, []);

  if (state.channel !== channel) {
    throw new Error(
      `Existing crawl state belongs to ${state.channel}; use --refresh or another --raw-dir.`,
    );
  }

  const recordsById = new Map(sources.map((record) => [record.id, record]));
  const seenCursors = new Set();
  let pagesThisRun = 0;

  while (!state.complete && pagesThisRun < maxPages) {
    const pageUrl = state.pageCount === 0 && state.nextBefore === null
      ? baseUrl
      : `${baseUrl}?before=${state.nextBefore}`;
    if (seenCursors.has(pageUrl)) {
      state.complete = true;
      break;
    }
    seenCursors.add(pageUrl);

    const response = await fetchWithRetry(pageUrl);
    const html = await response.text();
    const page = parseTelegramPreview(html, channel);
    const previousCursor = state.nextBefore;
    let added = 0;
    for (const record of page.records) {
      if (!recordsById.has(record.id)) added += 1;
      recordsById.set(record.id, record);
    }

    state.pageCount += 1;
    pagesThisRun += 1;
    state.lastPagePostCount = page.posts.length;
    state.updatedAt = timestamp();
    state.nextBefore = page.nextBefore;

    if (
      page.posts.length === 0 ||
      page.nextBefore === null ||
      page.nextBefore <= 1 ||
      (previousCursor !== null && page.nextBefore >= previousCursor)
    ) {
      state.complete = true;
    }

    sources = [...recordsById.values()].sort(sortByArchiveId);
    await Promise.all([
      writeJsonAtomic(statePath, state),
      writeJsonAtomic(sourcesPath, sources),
    ]);
    console.log(
      `Crawl page ${state.pageCount}: ${page.posts.length} posts, ${page.records.length} media, ${added} new, before=${state.nextBefore ?? 'done'}`,
    );

    if (!state.complete && delay > 0) await sleep(delay);
  }

  if (state.complete) {
    state.completedAt ??= timestamp();
    state.updatedAt = timestamp();
    await writeJsonAtomic(statePath, state);
  }

  return { state, sources };
}

async function findExistingRaw(rawDirectory, id) {
  const entries = await readdir(rawDirectory, { withFileTypes: true });
  const match = entries.find(
    (entry) =>
      entry.isFile() &&
      entry.name.startsWith(`${id}.`) &&
      !entry.name.endsWith('.part') &&
      !entry.name.endsWith('.json'),
  );
  return match ? path.join(rawDirectory, match.name) : null;
}

async function downloadOne(record, rawDirectory, existing) {
  if (existing?.rawFile) {
    const rawPath = path.join(rawDirectory, existing.rawFile);
    if (await isNonEmptyFile(rawPath)) {
      return {
        ...existing,
        hash: existing.hash ?? (await sha256File(rawPath)),
      };
    }
  }

  const discovered = await findExistingRaw(rawDirectory, record.id);
  if (discovered && (await isNonEmptyFile(discovered))) {
    return {
      id: record.id,
      kind: record.kind,
      sourcePostId: record.sourcePostId,
      rawFile: path.basename(discovered),
      bytes: (await stat(discovered)).size,
      contentType: '',
      hash: await sha256File(discovered),
      downloadedAt: timestamp(),
    };
  }

  const response = await fetchWithRetry(record.sourceUrl, { binary: true });
  const contentType = safeContentType(response.headers.get('content-type'));
  const extension = extensionFromResponse(record.sourceUrl, contentType, record.kind);
  const destination = path.join(rawDirectory, `${record.id}${extension}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) throw new Error(`Downloaded zero bytes for ${record.id}`);
  await writeBufferAtomic(destination, buffer);

  return {
    id: record.id,
    kind: record.kind,
    sourcePostId: record.sourcePostId,
    rawFile: path.basename(destination),
    bytes: buffer.length,
    contentType,
    hash: createHash('sha256').update(buffer).digest('hex'),
    downloadedAt: timestamp(),
  };
}

async function downloadAll({ sources, rawDirectory, concurrency }) {
  const indexPath = path.join(rawDirectory, 'downloads.internal.json');
  const existing = await readJson(indexPath, []);
  const downloadsById = new Map(existing.map((item) => [item.id, item]));
  const failures = [];
  let completed = 0;

  for (const batch of chunk(sources, Math.max(concurrency * 4, 12))) {
    const results = await mapLimit(batch, concurrency, async (record) => {
      try {
        return await downloadOne(record, rawDirectory, downloadsById.get(record.id));
      } catch (error) {
        failures.push({ id: record.id, error: error.message });
        return null;
      }
    });
    for (const result of results.filter(Boolean)) downloadsById.set(result.id, result);
    completed += batch.length;
    await writeJsonAtomic(
      indexPath,
      [...downloadsById.values()].sort(sortByArchiveId),
    );
    console.log(`Downloads checked: ${completed}/${sources.length}`);
  }

  return {
    downloads: [...downloadsById.values()].sort(sortByArchiveId),
    failures,
  };
}

function responsiveWidths(originalWidth) {
  return [
    ...new Set(TARGET_WIDTHS.map((width) => Math.min(width, originalWidth))),
  ].sort((left, right) => left - right);
}

function assetAlt(record) {
  if (record.caption) return truncate(`PEPECAT meme: ${record.caption}`, 180);
  return `PEPECAT meme artwork from archive post ${record.sourcePostId}`;
}

async function processImage({ sharp, record, download, outputDirectory }) {
  const inputPath = download.absoluteRawPath;
  const metadata = await sharp(inputPath, { failOn: 'error', animated: false }).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read image dimensions for ${record.id}`);
  }

  const sources = [];
  for (const width of responsiveWidths(metadata.width)) {
    const avifPath = path.join(outputDirectory, `${record.id}-${width}.avif`);
    const webpPath = path.join(outputDirectory, `${record.id}-${width}.webp`);
    await sharp(inputPath, { failOn: 'error', animated: false })
      .resize({ width, withoutEnlargement: true, kernel: 'lanczos3' })
      .avif({ quality: 55, effort: 6, chromaSubsampling: '4:4:4' })
      .toFile(avifPath);
    await sharp(inputPath, { failOn: 'error', animated: false })
      .resize({ width, withoutEnlargement: true, kernel: 'lanczos3' })
      .webp({ quality: 82, effort: 5, alphaQuality: 100, smartSubsample: true })
      .toFile(webpPath);
    sources.push({
      width,
      avif: toPublicPath(avifPath),
      webp: toPublicPath(webpPath),
    });
  }

  return {
    id: record.id,
    kind: 'image',
    sources,
    width: metadata.width,
    height: metadata.height,
    alt: assetAlt(record),
    hash: download.hash,
    sourcePostId: record.sourcePostId,
  };
}

async function processVideo({
  sharp,
  ffmpegPath,
  record,
  download,
  rawDirectory,
  outputDirectory,
}) {
  const inputPath = download.absoluteRawPath;
  const dimensions = await probeVideoDimensions(ffmpegPath, inputPath);
  const videoPath = path.join(outputDirectory, `${record.id}.mp4`);
  const extension = path.extname(inputPath).toLowerCase();

  if (extension === '.mp4') {
    await copyFileAtomic(inputPath, videoPath);
  } else {
    const { runProcess } = await import('./lib/media-tools.mjs');
    await runProcess(ffmpegPath, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '22',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      '-y',
      videoPath,
    ]);
  }

  const posterSourceDirectory = path.join(rawDirectory, 'posters');
  await ensureDir(posterSourceDirectory);
  const posterSourcePath = path.join(posterSourceDirectory, `${record.id}.png`);
  if (!(await isNonEmptyFile(posterSourcePath))) {
    await extractVideoPoster(ffmpegPath, inputPath, posterSourcePath);
  }
  const posterPath = path.join(outputDirectory, `${record.id}-poster.webp`);
  await sharp(posterSourcePath, { failOn: 'error' })
    .resize({ width: Math.min(960, dimensions.width), withoutEnlargement: true })
    .webp({ quality: 84, effort: 5 })
    .toFile(posterPath);

  return {
    id: record.id,
    kind: 'video',
    sources: [{ width: dimensions.width, src: toPublicPath(videoPath) }],
    poster: toPublicPath(posterPath),
    width: dimensions.width,
    height: dimensions.height,
    alt: assetAlt(record),
    hash: download.hash,
    sourcePostId: record.sourcePostId,
  };
}

async function outputsExist(asset) {
  const publicRoot = path.join(PROJECT_ROOT, 'public');
  const publicPaths = asset.sources.flatMap((source) =>
    [source.avif, source.webp, source.src].filter(Boolean),
  );
  if (asset.poster) publicPaths.push(asset.poster);
  return (
    await Promise.all(
      publicPaths.map((publicPath) =>
        isNonEmptyFile(path.join(publicRoot, publicPath.replace(/^\//, ''))),
      ),
    )
  ).every(Boolean);
}

async function processAll({
  state,
  sources,
  downloads,
  rawDirectory,
  outputDirectory,
  toolsRoot,
  concurrency,
}) {
  await ensureDir(outputDirectory);
  const sharp = loadSharp(toolsRoot);
  const needsVideo = sources.some((record) => record.kind === 'video');
  const ffmpegPath = needsVideo ? loadFfmpegPath(toolsRoot) : null;
  const processedPath = path.join(rawDirectory, 'processed.internal.json');
  const existing = await readJson(processedPath, []);
  const processedById = new Map(existing.map((item) => [item.id, item]));
  const recordsById = new Map(sources.map((record) => [record.id, record]));
  const downloadsById = new Map(downloads.map((download) => [download.id, download]));
  const candidates = sources.filter((record) => downloadsById.has(record.id));
  const failures = [];
  let checked = 0;

  for (const batch of chunk(candidates, Math.max(concurrency * 2, 6))) {
    const results = await mapLimit(batch, concurrency, async (record) => {
      const download = downloadsById.get(record.id);
      const cached = processedById.get(record.id);
      if (
        cached?.rawHash === download.hash &&
        cached.asset &&
        (await outputsExist(cached.asset))
      ) {
        return cached;
      }

      processedById.delete(record.id);
      try {
        const absoluteRawPath = path.join(rawDirectory, download.rawFile);
        const context = {
          sharp,
          ffmpegPath,
          record,
          download: { ...download, absoluteRawPath },
          rawDirectory,
          outputDirectory,
        };
        const asset = record.kind === 'video'
          ? await processVideo(context)
          : await processImage(context);
        return { id: record.id, rawHash: download.hash, asset };
      } catch (error) {
        failures.push({ id: record.id, error: error.message });
        return null;
      }
    });
    for (const result of results.filter(Boolean)) processedById.set(result.id, result);
    checked += batch.length;
    await writeJsonAtomic(
      processedPath,
      [...processedById.values()].sort((left, right) =>
        sortByArchiveId(recordsById.get(left.id), recordsById.get(right.id)),
      ),
    );
    console.log(`Processed outputs checked: ${checked}/${candidates.length}`);
  }

  const telegramAssets = [...processedById.values()]
    .filter((item) => recordsById.has(item.id))
    .map((item) => item.asset)
    .sort(sortByArchiveId);
  const supplemental = await readJson(
    path.join(PROJECT_ROOT, 'media-raw', 'supplemental', 'processed.internal.json'),
    { assets: [] },
  );
  const supplementalAssets = supplemental.assets
    .map((item) => item.asset)
    .filter(Boolean);
  const supplementalIds = new Set(supplementalAssets.map((asset) => asset.id));
  const previousManifest = await readJson(path.join(outputDirectory, 'manifest.json'), {
    assets: [],
  });
  const previousById = new Map((previousManifest.assets ?? []).map((asset) => [asset.id, asset]));
  const assets = [
    ...telegramAssets.filter((asset) => !supplementalIds.has(asset.id)),
    ...supplementalAssets,
  ].map((asset) => ({
    ...asset,
    lastModified:
      previousById.get(asset.id)?.lastModified ?? fallbackLastModified(asset),
  }));
  const manifest = {
    snapshotDate: state.snapshotDate ?? SNAPSHOT_DATE,
    auditedBaseline: AUDITED_BASELINE,
    finalCount: assets.length,
    assets,
  };
  await writeJsonAtomic(path.join(outputDirectory, 'manifest.json'), manifest);
  return { manifest, failures };
}

async function main() {
  const args = parseArgs();
  const channel = String(args.channel ?? 'PepeCat_Memes');
  const baseUrl = `https://t.me/s/${encodeURIComponent(channel)}`;
  const rawDirectory = path.resolve(
    args.rawDir ?? path.join(PROJECT_ROOT, 'media-raw', 'telegram'),
  );
  const outputDirectory = path.resolve(
    args.outputDir ?? path.join(PROJECT_ROOT, 'public', 'media', 'memes'),
  );
  const toolsRoot = path.resolve(
    args.toolsRoot ?? process.env.PEPECAT_MEDIA_TOOLS ?? DEFAULT_MEDIA_TOOLS_ROOT,
  );
  const concurrency = asPositiveInteger(args.concurrency, 6);
  const maxPages = asPositiveInteger(args.maxPages, Number.MAX_SAFE_INTEGER);
  const delay = asPositiveInteger(args.delay, 250);
  const refresh = asBoolean(args.refresh, false);
  const crawlOnly = asBoolean(args.crawlOnly, false);
  const downloadOnly = asBoolean(args.downloadOnly, false);
  const processOnly = asBoolean(args.processOnly, false);

  await ensureDir(rawDirectory);
  let state;
  let sources;
  if (processOnly) {
    state = await readJson(path.join(rawDirectory, 'crawl-state.internal.json'));
    sources = await readJson(path.join(rawDirectory, 'sources.internal.json'));
    if (!state || !sources) {
      throw new Error('No crawl state found; run without --process-only first.');
    }
  } else {
    ({ state, sources } = await crawlTelegram({
      channel,
      baseUrl,
      rawDirectory,
      refresh,
      maxPages,
      delay,
    }));
  }

  const sourceCounts = sources.reduce(
    (counts, asset) => ({ ...counts, [asset.kind]: counts[asset.kind] + 1 }),
    { image: 0, video: 0 },
  );
  console.log(
    `Discovered ${sources.length} media records (${sourceCounts.image} images, ${sourceCounts.video} videos); crawl complete=${state.complete}`,
  );
  if (crawlOnly) return;

  const downloadResult = await downloadAll({
    sources,
    rawDirectory,
    concurrency,
  });
  if (downloadResult.failures.length) {
    console.warn(`Download failures (${downloadResult.failures.length}):`);
    console.warn(downloadResult.failures);
  }
  if (downloadOnly) return;

  const processResult = await processAll({
    state,
    sources,
    downloads: downloadResult.downloads,
    rawDirectory,
    outputDirectory,
    toolsRoot,
    concurrency: Math.min(concurrency, 3),
  });
  const finalImages = processResult.manifest.assets.filter(
    (asset) => asset.kind === 'image',
  ).length;
  const finalVideos = processResult.manifest.assets.filter(
    (asset) => asset.kind === 'video',
  ).length;
  console.log(
    `Wrote ${processResult.manifest.finalCount} public assets (${finalImages} images, ${finalVideos} videos) to ${outputDirectory}`,
  );
  if (processResult.failures.length) {
    console.warn(`Processing failures (${processResult.failures.length}):`);
    console.warn(processResult.failures);
  }

  if (
    !state.complete ||
    downloadResult.failures.length ||
    processResult.failures.length ||
    processResult.manifest.finalCount !== sources.length
  ) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
