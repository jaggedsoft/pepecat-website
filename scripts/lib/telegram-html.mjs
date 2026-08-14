import { decodeHtml, htmlToText, truncate } from './common.mjs';

const MESSAGE_START = /<div\b[^>]*\bdata-post="([^"]+?)\/(\d+)"[^>]*>/gi;
const PHOTO_TAG = /<a\b[^>]*\bclass="[^"]*\btgme_widget_message_photo_wrap\b[^"]*"[^>]*>/gi;
const VIDEO_TAG = /<video\b[^>]*\bclass="[^"]*\btgme_widget_message_video\b[^"]*"[^>]*>/gi;
const BACKGROUND_IMAGE = /background-image\s*:\s*url\(([^)]+)\)/i;
const MEDIA_SOURCE = /\b(?:src|data-src)="([^"]+)"/i;

function cleanMediaUrl(value) {
  return decodeHtml(value)
    .trim()
    .replace(/^(?:&quot;|&#39;|['"])+/i, '')
    .replace(/(?:&quot;|&#39;|['"])+$/i, '');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractCaption(block) {
  const match = block.match(
    /<div\b[^>]*class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  );
  return match ? truncate(htmlToText(match[1]), 240) : '';
}

function buildAssetId(postId, sequence, total) {
  const base = `tg-${String(postId).padStart(5, '0')}`;
  return total > 1 ? `${base}-${String(sequence + 1).padStart(2, '0')}` : base;
}

export function parseTelegramPreview(html, expectedChannel) {
  const starts = [...html.matchAll(MESSAGE_START)];
  const posts = [];
  const records = [];

  for (let index = 0; index < starts.length; index += 1) {
    const match = starts[index];
    const channel = match[1];
    const postId = match[2];
    if (expectedChannel && channel.toLowerCase() !== expectedChannel.toLowerCase()) {
      continue;
    }

    const end = starts[index + 1]?.index ?? html.length;
    const block = html.slice(match.index, end);
    const caption = extractCaption(block);
    const videoUrls = unique(
      [...block.matchAll(VIDEO_TAG)]
        .map((item) => item[0].match(MEDIA_SOURCE)?.[1])
        .map(cleanMediaUrl),
    );
    const imageUrls = unique(
      [...block.matchAll(PHOTO_TAG)]
        .map((item) => item[0].match(BACKGROUND_IMAGE)?.[1])
        .map(cleanMediaUrl),
    );
    const media = videoUrls.length
      ? videoUrls.map((sourceUrl) => ({ kind: 'video', sourceUrl }))
      : imageUrls.map((sourceUrl) => ({ kind: 'image', sourceUrl }));

    posts.push(Number.parseInt(postId, 10));
    media.forEach((item, sequence) => {
      records.push({
        id: buildAssetId(postId, sequence, media.length),
        kind: item.kind,
        sourceUrl: item.sourceUrl,
        sourcePostId: postId,
        sequence,
        caption,
      });
    });
  }

  return {
    posts,
    records,
    nextBefore: posts.length ? Math.min(...posts) : null,
  };
}
