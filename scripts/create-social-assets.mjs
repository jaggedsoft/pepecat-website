import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'public', 'media', 'avatars', 'pc03-1440.webp')
const backgroundSource = path.join(root, 'design', 'social-card-background-v2.png')
const output = path.join(root, 'public')

const typographySvg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <path d="M51 48h250l-28 42H51z" fill="#ff625c"/>
  <text x="76" y="78" fill="#12101c" font-family="Arial Black,Arial,sans-serif" font-size="27" font-weight="900" letter-spacing="-1">$PEPECAT</text>
  <text x="62" y="154" fill="#bcb3dc" font-family="Courier New,monospace" font-size="18" font-weight="700" letter-spacing="2">SOLANA · CULTURE ARCHIVE</text>
  <text x="58" y="259" fill="#f0ecff" font-family="Arial Black,Arial,sans-serif" font-size="72" font-weight="900" letter-spacing="-3">THE CAT HAS</text>
  <text x="58" y="339" fill="#f0ecff" font-family="Arial Black,Arial,sans-serif" font-size="72" font-weight="900" letter-spacing="-3">ENTERED</text>
  <text x="58" y="419" fill="#f0ecff" font-family="Arial Black,Arial,sans-serif" font-size="72" font-weight="900" letter-spacing="-3">THE CHAT.</text>
  <path d="M61 465h405" stroke="#ff625c" stroke-width="5"/>
  <text x="61" y="512" fill="#bcb3dc" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="700">PEPE ENERGY. CAT ATTITUDE.</text>
  <text x="61" y="547" fill="#8f87ab" font-family="Courier New,monospace" font-size="15" letter-spacing="1.5">MEMES / FAN ART / ON-CHAIN CHAOS</text>
</svg>`

const avatar = await sharp(source)
  .resize({ width: 560, height: 560, fit: 'contain' })
  .png()
  .toBuffer()

const background = await sharp(backgroundSource)
  .resize(1200, 630, { fit: 'cover' })
  .modulate({ brightness: 0.9, saturation: 0.92 })
  .png()
  .toBuffer()

await sharp(background)
  .composite([
    { input: avatar, left: 650, top: 56 },
    { input: Buffer.from(typographySvg), left: 0, top: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(path.join(output, 'social-card-pepecat-v2.png'))

await sharp(source).resize(64, 64, { fit: 'contain' }).png().toFile(path.join(output, 'favicon.png'))
await sharp(source).resize(180, 180, { fit: 'contain' }).png().toFile(path.join(output, 'apple-touch-icon.png'))

console.log('Created PEPECAT social card and icons from the Pc03 hero artwork')
