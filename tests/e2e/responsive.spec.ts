import { expect, test } from '@playwright/test'

const widths = [320, 375, 414, 768, 1024, 1440] as const

for (const width of widths) {
  test(`has no horizontal overflow or clipped archive controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 812 : 900 })
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: /see more memes/i })).toBeVisible()

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }))

    expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport)
    expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewport)

    const controls = page.locator('a, button, input, select, textarea')
    const controlCount = await controls.count()
    for (let index = 0; index < controlCount; index += 1) {
      const control = controls.nth(index)
      if (!(await control.isVisible())) continue

      const box = await control.boundingBox()
      expect(box, `Interactive control ${index} should have a layout box`).not.toBeNull()
      if (!box) continue

      expect(box.x, `Interactive control ${index} starts outside the viewport`).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, `Interactive control ${index} ends outside the viewport`).toBeLessThanOrEqual(
        width + 0.5,
      )
      expect(box.width, `Interactive control ${index} is narrower than the 44px target`).toBeGreaterThanOrEqual(44)
      expect(box.height, `Interactive control ${index} is shorter than the 44px target`).toBeGreaterThanOrEqual(44)
    }
  })
}

test('honors reduced motion without hiding content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('#archive')).toBeVisible()

  const animated = await page.locator('[data-motion], .hero__stage, .meme-tile').evaluateAll((elements) =>
    elements.filter((element) => {
      const style = getComputedStyle(element)
      const animation = Number.parseFloat(style.animationDuration)
      const transition = Number.parseFloat(style.transitionDuration)
      return animation > 0.01 || transition > 0.01
    }).length,
  )

  expect(animated).toBe(0)
})
