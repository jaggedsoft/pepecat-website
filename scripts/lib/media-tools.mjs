import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const localRequire = createRequire(import.meta.url);

export const DEFAULT_MEDIA_TOOLS_ROOT = path.join(
  os.tmpdir(),
  'pepecat-media-tools',
);

function requireFromToolsRoot(packageName, toolsRoot) {
  const toolsRequire = createRequire(path.join(toolsRoot, 'package.json'));
  return toolsRequire(packageName);
}

export function loadSharp(toolsRoot = DEFAULT_MEDIA_TOOLS_ROOT) {
  const attempts = [];
  for (const load of [
    () => localRequire('sharp'),
    () => requireFromToolsRoot('sharp', toolsRoot),
  ]) {
    try {
      return load();
    } catch (error) {
      attempts.push(error.message);
    }
  }

  throw new Error(
    [
      'The media scripts require sharp, but it is not installed.',
      `Install it outside the project manifest with: npm install --prefix "${toolsRoot}" sharp ffmpeg-static`,
      `Lookup details: ${attempts.join(' | ')}`,
    ].join('\n'),
  );
}

export function loadFfmpegPath(toolsRoot = DEFAULT_MEDIA_TOOLS_ROOT) {
  if (process.env.PEPECAT_FFMPEG) return process.env.PEPECAT_FFMPEG;

  try {
    return requireFromToolsRoot('ffmpeg-static', toolsRoot);
  } catch (error) {
    throw new Error(
      [
        'Video processing requires ffmpeg-static.',
        `Install it outside the project manifest with: npm install --prefix "${toolsRoot}" ffmpeg-static`,
        `Lookup details: ${error.message}`,
      ].join('\n'),
      { cause: error },
    );
  }
}

export function runProcess(executable, args, { allowFailure = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0 || allowFailure) {
        resolve({ code, stdout, stderr });
      } else {
        reject(
          new Error(
            `${path.basename(executable)} exited with code ${code}: ${stderr.trim()}`,
          ),
        );
      }
    });
  });
}

export async function probeVideoDimensions(ffmpegPath, inputPath) {
  const result = await runProcess(
    ffmpegPath,
    ['-hide_banner', '-i', inputPath, '-map', '0:v:0', '-frames:v', '1', '-f', 'null', '-'],
    { allowFailure: true },
  );
  const dimensions = result.stderr.match(
    /Video:[^\n]*?\b(\d{2,5})x(\d{2,5})\b/i,
  );
  if (!dimensions) {
    throw new Error(`Could not determine video dimensions for ${inputPath}`);
  }
  return {
    width: Number.parseInt(dimensions[1], 10),
    height: Number.parseInt(dimensions[2], 10),
  };
}

export async function extractVideoPoster(ffmpegPath, inputPath, outputPath) {
  await runProcess(ffmpegPath, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-ss',
    '0.1',
    '-i',
    inputPath,
    '-frames:v',
    '1',
    '-y',
    outputPath,
  ]);
}
