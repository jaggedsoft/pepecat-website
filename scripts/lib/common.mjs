import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = path.resolve(
  fileURLToPath(new URL('../..', import.meta.url)),
);

export const SNAPSHOT_DATE = '2026-08-11';

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const equalsIndex = token.indexOf('=');
    if (equalsIndex !== -1) {
      args[toCamelCase(token.slice(2, equalsIndex))] = token.slice(equalsIndex + 1);
      continue;
    }

    const key = toCamelCase(token.slice(2));
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }

  return args;
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, character) => character.toUpperCase());
}

export function asBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

export function asPositiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function ensureDir(directory) {
  await mkdir(directory, { recursive: true });
  return directory;
}

export async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw new Error(`Could not parse JSON at ${filePath}: ${error.message}`, {
      cause: error,
    });
  }
}

export async function writeJsonAtomic(filePath, value) {
  await ensureDir(path.dirname(filePath));
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rm(filePath, { force: true });
  await rename(temporaryPath, filePath);
}

export async function copyFileAtomic(sourcePath, destinationPath) {
  await ensureDir(path.dirname(destinationPath));
  const temporaryPath = `${destinationPath}.${process.pid}.${Date.now()}.part`;
  await copyFile(sourcePath, temporaryPath);
  await rm(destinationPath, { force: true });
  await rename(temporaryPath, destinationPath);
}

export async function writeBufferAtomic(destinationPath, buffer) {
  await ensureDir(path.dirname(destinationPath));
  const temporaryPath = `${destinationPath}.${process.pid}.${Date.now()}.part`;
  await writeFile(temporaryPath, buffer);
  await rm(destinationPath, { force: true });
  await rename(temporaryPath, destinationPath);
}

export async function isNonEmptyFile(filePath) {
  try {
    return (await stat(filePath)).size > 0;
  } catch {
    return false;
  }
}

export async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, limit), items.length) }, run),
  );
  return results;
}

export function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function toPublicPath(filePath) {
  const relative = path.relative(path.join(PROJECT_ROOT, 'public'), filePath);
  return `/${relative.split(path.sep).join('/')}`;
}

export function sortByArchiveId(left, right) {
  const leftPost = Number.parseInt(left.sourcePostId ?? left.id.replace(/\D/g, ''), 10);
  const rightPost = Number.parseInt(right.sourcePostId ?? right.id.replace(/\D/g, ''), 10);
  if (leftPost !== rightPost) return leftPost - rightPost;
  return left.id.localeCompare(right.id, 'en', { numeric: true });
}

export function decodeHtml(value = '') {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, decimal) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    );
}

export function htmlToText(value = '') {
  return decodeHtml(
    value
      .replace(/<br\s*\/?\s*>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  ).trim();
}

export function truncate(value, maximumLength) {
  if (value.length <= maximumLength) return value;
  return `${value.slice(0, Math.max(0, maximumLength - 1)).trimEnd()}…`;
}
