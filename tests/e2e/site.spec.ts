import { expect, test } from '@playwright/test'

const MINT = 'CRAMvzDsSpXYsFpcoDr6vFLJMBeftez1E7277xwPpump'
const PAIR = 'CycVvS19mPJ1cCWfiiWk3M32LTdrW8akChLMf8u75py1'

const expectedDestinations = [
  `https://explorer.solana.com/address/${MINT}`,
  `https://dexscreener.com/solana/${PAIR}`,
  `https://www.dextools.io/app/en/solana/pair-explorer/${PAIR}`,
  `https://raydium.io/swap/?inputMint=sol&outputMint=${MINT}`,
  'https://x.com/pepecattoken',
  'https://t.me/PepeCat_Token_Solana',
  'https://x.com/jaggedsoft',
  'https://x.com/TrystanNFT',
]

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('publishes complete Open Graph and Twitter social metadata', async ({ page, request }) => {
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://pepecat.fun/')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#070414')
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveAttribute('href', '/media/hero/pepecat-hero-960.avif')
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website')
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /The Cat Has Entered the Chat/)
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /community-made collection of memes/)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://pepecat.fun/social-card-pepecat-v3.png')
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200')
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '675')
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /PEPECAT.*mascot/)
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', /community-made collection of memes/)
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', 'https://pepecat.fun/social-card-pepecat-v3.png')
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute('content', /PEPECAT.*mascot/)

  const card = await request.get('/social-card-pepecat-v3.png')
  expect(card.ok()).toBe(true)
  expect(card.headers()['content-type']).toContain('image/png')
})

test('renders the editorial page structure and working anchor navigation', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('The cat has entered the chat.')
  await expect(page.locator('.hero__lede')).toContainText('A community-made collection of memes,')
  await expect(page.locator('.hero__stage img')).toHaveAttribute('src', '/media/hero/pepecat-hero-960.webp')
  await expect(page.locator('img[src*="/media/avatars/pc03"]')).toHaveCount(0)
  await expect(page.locator('.hero__verified')).toContainText(/verified by culture/i)
  await expect(page.locator('.hero__verified img')).toHaveAttribute('src', '/media/hero/verified-by-culture.png')
  await expect(page.getByRole('heading', { level: 2, name: 'Join the fun meme magic community' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /40 moods/i })).toHaveCount(0)

  const anchors = [
    ['Memes', '#archive'],
    ['Lore', '#lore'],
    ['Token', '#token'],
    ['Community', '#community'],
  ] as const

  for (const [label, hash] of anchors) {
    const link = page.getByRole('navigation').getByRole('link', { name: label, exact: true })
    await expect(link).toHaveAttribute('href', hash)
    await link.click()
    await expect(page).toHaveURL(new RegExp(`${hash}$`))
    await page.locator(hash).scrollIntoViewIfNeeded()
    await expect(page.locator(hash)).toBeInViewport()
  }

  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: /^buy$/i })).toHaveCount(1)
  await expect(page.getByRole('link', { name: /buy/i }).first()).toHaveAttribute(
    'href',
    `https://raydium.io/swap/?inputMint=sol&outputMint=${MINT}`,
  )
})

test('mobile navigation discloses, navigates, and closes cleanly', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.reload()

  const menu = page.getByRole('button', { name: 'Menu' })
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await menu.click()
  await expect(page.getByRole('button', { name: 'Close' })).toHaveAttribute('aria-expanded', 'true')

  const lore = page.getByRole('navigation').getByRole('link', { name: 'Lore', exact: true })
  await expect(lore).toBeVisible()
  await lore.click()
  await expect(page.locator('#lore')).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false')
})

test('opens the meme lightbox, traps focus, closes with Escape, and restores focus', async ({ page }) => {
  const opener = page.getByRole('button', { name: /^open pepecat meme/i }).first()
  await opener.scrollIntoViewIfNeeded()
  await opener.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')

  const description = dialog.locator('.lightbox__footer p')
  const initialDescription = await description.textContent()
  await page.keyboard.press('ArrowRight')
  await expect(description).not.toHaveText(initialDescription ?? '')
  await page.keyboard.press('ArrowLeft')
  await expect(description).toHaveText(initialDescription ?? '')

  const focusable = dialog.getByRole('button', { name: /close/i })
  await expect(focusable).toBeFocused()
  await page.keyboard.press('Tab')
  await expect
    .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))))
    .toBe(true)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
})

test('copies the full contract and presents an accessible confirmation', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  const copy = page.getByRole('button', { name: /copy contract/i })
  await copy.scrollIntoViewIfNeeded()
  await copy.click()

  await expect(page.getByText(/copied/i)).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(MINT)
})

test('publishes every verified external destination without placeholders', async ({ page }) => {
  for (const href of expectedDestinations) {
    const links = page.locator(`a[href="${href}"]`)
    await expect(links.first(), `Missing external destination: ${href}`).toBeAttached()

    for (const link of await links.all()) {
      await expect(link).not.toHaveAttribute('href', '#')
      if ((await link.getAttribute('target')) === '_blank') {
        await expect(link).toHaveAttribute('rel', /noreferrer|noopener/)
      }
    }
  }

  await expect(page.locator('a[href="#"]')).toHaveCount(0)
  await expect(page.locator(`a[href="https://raydium.io/swap/"]`)).toHaveCount(0)
})

test('autoplays gallery video on mute and provides a text alternative', async ({ page }) => {
  const manifestResponse = await page.request.get('/media/memes/manifest.json')
  expect(manifestResponse.ok()).toBe(true)

  const manifest = (await manifestResponse.json()) as {
    assets: Array<{ id: string; kind: 'image' | 'video'; alt: string }>
  }
  expect(manifest.assets.filter((asset) => asset.id.startsWith('supp-'))).toHaveLength(26)
  expect(manifest.assets).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'supp-summer-squad', kind: 'image' }),
    expect.objectContaining({ id: 'supp-neon-fries', kind: 'image' }),
    expect.objectContaining({ id: 'supp-trading-desk', kind: 'image' }),
  ]))
  const video = manifest.assets.find((asset) => asset.kind === 'video')
  expect(video, 'The local Telegram snapshot must include its audited video').toBeTruthy()

  const videoIndex = manifest.assets.findIndex((asset) => asset.id === video!.id)
  await page.evaluate(() => sessionStorage.clear())
  await page.addInitScript((targetIndex) => {
    let calls = 0
    Object.defineProperty(window.crypto, 'getRandomValues', {
      configurable: true,
      value: <T extends ArrayBufferView | null>(array: T): T => {
        calls += 1
        if (!array) return array
        const values = array as unknown as { length: number; [index: number]: number }
        for (let index = 0; index < values.length; index += 1) values[index] = 0
        // The wall mounts once from the fetched manifest. Its first draw then
        // deterministically selects the audited video.
        if (calls === 1 && values.length > 0) values[0] = targetIndex
        return array
      },
    })
  }, videoIndex)
  await page.goto('/')

  const videoElement = page.getByLabel(video!.alt)
  await expect(videoElement).toBeVisible()
  await expect(videoElement).toHaveJSProperty('controls', true)
  await expect(videoElement).toHaveJSProperty('autoplay', true)
  await expect(videoElement).toHaveJSProperty('muted', true)
  await expect(videoElement).toHaveJSProperty('loop', true)
  await expect(videoElement).toHaveAttribute('aria-label', video!.alt)
  await expect(videoElement.locator('p')).toContainText(video!.alt)
})

test('loads without page errors, console errors, or broken fallback images', async ({ page }) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.reload()
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight)
    await new Promise((resolve) => window.setTimeout(resolve, 250))
  })

  const brokenImages = await page.locator('img').evaluateAll((images) =>
    images
      .filter((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth === 0)
      .map((image) => (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src),
  )

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
  expect(brokenImages).toEqual([])
})
