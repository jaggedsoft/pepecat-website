export const FEATURED_MEME_IDS = [
  'supp-green-night',
  'supp-neon-race',
  'supp-green-rock-show',
  'supp-space-feast',
  'supp-green-crowd',
  'supp-green-flight',
  'supp-snort-night',
  'supp-night-drink',
] as const

export const FEATURED_MEME_ID_SET: ReadonlySet<string> = new Set(FEATURED_MEME_IDS)
