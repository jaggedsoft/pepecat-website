import type { MemeAsset } from '../types/media'

const image = (
  fileId: string,
  widths: number[],
  width: number,
  height: number,
  alt: string,
  sourcePostId: string,
): MemeAsset => ({
  id: fileId,
  kind: 'image',
  sources: widths.map((sourceWidth) => ({
    width: sourceWidth,
    avif: `/media/memes/${fileId}-${sourceWidth}.avif`,
    webp: `/media/memes/${fileId}-${sourceWidth}.webp`,
  })),
  width,
  height,
  alt,
  hash: `fallback-${fileId}`,
  sourcePostId,
})

const video = (
  fileId: string,
  width: number,
  height: number,
  alt: string,
): MemeAsset => ({
  id: fileId,
  kind: 'video',
  sources: [{ width, src: `/media/memes/${fileId}.mp4` }],
  poster: `/media/memes/${fileId}-poster.webp`,
  width,
  height,
  alt,
  hash: `fallback-${fileId}`,
  sourcePostId: `supplemental-${fileId}`,
})

export const fallbackMemes: MemeAsset[] = [
  image('supp-night-bar', [400], 400, 400, 'PEPECAT in a loosened tie at a night bar with a glowing glass of beer', 'supplemental-supp-night-bar'),
  image('supp-green-stage', [480, 960, 1024], 1024, 1024, 'PEPECAT performing on stage above a crowd of glowing green candles', 'supplemental-supp-green-stage'),
  image('supp-space-launch', [480, 823], 823, 1024, 'PEPECAT riding a giant green candle into space with friends and junk food', 'supplemental-supp-space-launch'),
  image('supp-fomo-buy', [480, 960, 1024], 1024, 1024, 'PEPECAT reaching from a Raydium screen toward a glowing BUY button', 'supplemental-supp-fomo-buy'),
  image('supp-green-gains', [480, 960, 1024], 1024, 1024, 'PEPECAT flying through neon green gain symbols', 'supplemental-supp-green-gains'),
  image('supp-green-lines', [480, 960, 1024], 1024, 1024, 'PEPECAT meme illustration with glowing green lines on a table under a night sky', 'supplemental-supp-green-lines'),
  image('supp-temple-expedition', [480, 960, 1440], 2000, 2000, 'PEPECAT explorers discovering a golden cat monument in a jungle temple', 'supplemental-supp-temple-expedition'),
  image('supp-surfing-coins', [480, 960, 1440], 2000, 2000, 'PEPECAT surfing above waves, fish, and falling gold coins', 'supplemental-supp-surfing-coins'),
  image('supp-treasure-cave', [480, 960, 1440], 2000, 2000, 'PEPECAT carrying a torch through a treasure-filled cave', 'supplemental-supp-treasure-cave'),
  video('supp-buy-chat', 1500, 1500, 'Animated PEPECAT buy banner with the cat climbing into the chat'),
  video('supp-hypnotic-cat', 1200, 1200, 'Animated PEPECAT against a pink and cyan spiral'),
  video('supp-party-night', 1500, 1500, 'Animated PEPECAT hosting a colorful party'),
  image('supp-pond-float', [480, 960, 1200], 1200, 1200, 'PEPECAT floating peacefully in a sunlit forest pond', 'supplemental-supp-pond-float'),
  image('supp-forest-rest', [480, 960, 1200], 1200, 1200, 'PEPECAT resting in a leafy forest clearing with friends', 'supplemental-supp-forest-rest'),
  image('supp-laser-heist', [480, 960, 1007], 1007, 1280, 'PEPECAT dodging red security lasers above a vault of golden coins and a key', 'supplemental-supp-laser-heist'),
  image('supp-summer-squad', [480, 900], 900, 778, 'A colorful PEPECAT squad splashing together in the ocean under a smiling sun', 'supplemental-supp-summer-squad'),
  image('supp-neon-fries', [480, 960, 1440], 3072, 2678, 'PEPECAT serving glowing green fries in a graffiti-covered city alley', 'supplemental-supp-neon-fries'),
  image('supp-trading-desk', [480, 960, 1440], 1920, 1080, 'A realistic PEPECAT trader watching crypto charts at a late-night trading desk', 'supplemental-supp-trading-desk'),
  image('tg-00005-01', [480, 712], 712, 800, 'PEPECAT meme artwork from archive post 5', '5'),
  image('tg-00005-02', [480, 686], 686, 800, 'PEPECAT meme artwork from archive post 5', '5'),
  image('tg-00005-03', [480, 800], 800, 800, 'PEPECAT meme artwork from archive post 5', '5'),
  image('tg-00005-04', [480, 600], 600, 800, 'PEPECAT meme artwork from archive post 5', '5'),
]
