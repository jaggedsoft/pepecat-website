import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const heroSource = 'C:/Users/AI/Documents/pepecat/!!ChatGPT Image Aug 14, 2026, 01_56_27 PM.png'
const socialSource = 'C:/Users/AI/Documents/pepecat/ChatGPT Image Aug 14, 2026, 02_09_47 PM.png'
const publicDirectory = path.join(root, 'public')
const heroDirectory = path.join(publicDirectory, 'media', 'hero')

await mkdir(heroDirectory, { recursive: true })

for (const width of [640, 960, 1254]) {
  await sharp(heroSource)
    .resize({ width, withoutEnlargement: true, kernel: 'lanczos3' })
    .avif({ quality: 64, effort: 7, chromaSubsampling: '4:4:4' })
    .toFile(path.join(heroDirectory, `pepecat-hero-${width}.avif`))

  await sharp(heroSource)
    .resize({ width, withoutEnlargement: true, kernel: 'lanczos3' })
    .webp({ quality: 88, effort: 6, smartSubsample: true })
    .toFile(path.join(heroDirectory, `pepecat-hero-${width}.webp`))
}

// Preserve the supplied handwritten culture mark while keying out the nearly
// black reference-card background so the mark blends into the live hero.
const signature = await sharp(socialSource)
  .extract({ left: 538, top: 723, width: 244, height: 65 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

for (let index = 0; index < signature.data.length; index += 4) {
  const red = signature.data[index]
  const green = signature.data[index + 1]
  const blue = signature.data[index + 2]
  const greenSignal = Math.max(0, green - Math.max(red, blue))
  signature.data[index + 3] = Math.min(255, greenSignal * 3)
}

await sharp(signature.data, {
  raw: {
    width: signature.info.width,
    height: signature.info.height,
    channels: 4,
  },
})
  .png({ compressionLevel: 9 })
  .toFile(path.join(heroDirectory, 'verified-by-culture.png'))

// A new, cache-busted 16:9 social card built from the user-approved artwork.
await sharp(socialSource)
  .resize(1200, 675, { fit: 'fill', kernel: 'lanczos3' })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(path.join(publicDirectory, 'social-card-pepecat-v3.png'))

await sharp(heroSource)
  .resize(64, 64, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toFile(path.join(publicDirectory, 'favicon.png'))

await sharp(heroSource)
  .resize(180, 180, { fit: 'cover' })
  .png({ compressionLevel: 9 })
  .toFile(path.join(publicDirectory, 'apple-touch-icon.png'))

console.log('Created the PEPECAT hero, exact culture signature, social card, and icons.')
