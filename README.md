# PEPECAT Culture Archive

A culture-first, one-page PEPECAT website built with React, Vite, TypeScript, and plain CSS. The site is a static editorial archive: mascot art and memes lead the experience, while verified token information and the Raydium purchase route remain easy to find.

## Run locally

```powershell
npm install
npm run dev
```

The production acceptance commands are:

```powershell
npm run lint
npm run test
npm run build
npm run test:e2e
```

## Media snapshot

The bundled archive combines a one-time local snapshot of the publicly reachable `PepeCat_Memes` Telegram history taken on 2026-08-11 with nine user-supplied additions imported on 2026-08-12. It contains 404 locally served assets: 395 still images and nine locally optimized videos/animations. Telegram's channel header reported an audited baseline of 391 photos and one video; its public history exposed 389 photo files plus five separately classified animations at snapshot time.

Raw downloads and normalized avatar PNGs live under `media-raw/` and are deliberately excluded from `dist`. The production bundle contains only responsive AVIF/WebP derivatives, six optimized MP4 files, local manifests, and generated social artwork. Telegram's preview CDN exposes most photo masters at no more than 800 pixels, so the processor generates 480-pixel and intrinsic-width variants without inventing blurry 960/1440 upscales. The supplied avatar masters do receive 480, 960, and 1440-pixel derivatives.

The importer is resumable and hash-aware:

```powershell
npm run media:snapshot
npm run media:avatars
npm run media:supplemental
npm run media:social
```

Refreshing the Telegram snapshot requires network access. The website itself performs no Telegram, Solana RPC, analytics, pricing, or other remote data request at runtime.

## Verified receipt

The static token copy was rechecked against finalized Solana mainnet state on 2026-08-12 and publishes only the Solana mint, six decimals, current on-chain supply of `989,738,717.726281 PEPECAT`, revoked mint and freeze authorities, and the verified PEPECAT/SOL pair. Volatile price, liquidity, holder, allocation, and safety claims are intentionally omitted.

## Project map

- `src/App.tsx` — page composition and editorial copy.
- `src/components/` — archive wall, lightbox, responsive media, and token receipt.
- `src/lib/` — manifest validation and session-randomized selection logic.
- `src/styles.css` — Hallmark visual system and responsive layout.
- `public/media/` — generated production assets and manifests.
- `scripts/` — resumable Telegram, supplemental-art, avatar, and social media-processing pipeline.
- `design/concepts/` — the five approved implementation reference renders.
- `tests/` — Vitest and Playwright coverage.

Deployment to `pepecat.vip` is intentionally outside this repository handoff.
