import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MemeWall } from './MemeWall'
import { createAsset } from '../test/fixtures'

afterEach(() => {
  vi.useRealTimers()
})

describe('MemeWall', () => {
  it('replaces a failed media item with an unused archive asset', async () => {
    const manifest = Array.from({ length: 21 }, (_, index) => createAsset(index + 1))
    const visible = manifest.slice(0, 20)
    sessionStorage.setItem('pepecat:meme-selection:v3', JSON.stringify(visible.map(({ id }) => id)))

    render(<MemeWall manifest={manifest} totalCount={manifest.length} />)

    fireEvent.error(screen.getByRole('img', { name: visible[0].alt }))

    await waitFor(() => {
      expect(screen.queryByRole('img', { name: visible[0].alt })).not.toBeInTheDocument()
    })

    const renderedMedia = screen.getAllByRole('img')
    expect(renderedMedia).toHaveLength(20)
    expect(screen.getByRole('img', { name: manifest[20].alt })).toBeVisible()
  })

  it('opens selected media through an accessible control', async () => {
    const asset = createAsset(1)

    render(<MemeWall manifest={[asset]} totalCount={1} />)

    fireEvent.click(screen.getByRole('button', { name: new RegExp(`open ${asset.alt}`, 'i') }))

    expect(screen.getByRole('dialog', { name: /archive view/i })).toBeVisible()
  })

  it('replaces the visible set and persists it when shuffled', () => {
    const manifest = Array.from({ length: 50 }, (_, index) => createAsset(index + 1))
    const current = manifest.slice(0, 20)
    sessionStorage.setItem('pepecat:meme-selection:v3', JSON.stringify(current.map(({ id }) => id)))

    render(<MemeWall manifest={manifest} totalCount={manifest.length} />)
    fireEvent.click(screen.getByRole('button', { name: /more memes/i }))

    const currentLabels = new Set(current.map(({ alt }) => `Open ${alt}`))
    const openers = screen.getAllByRole('button', { name: /^open pepecat meme/i })
    expect(openers).toHaveLength(20)
    expect(openers.every((opener) => !currentLabels.has(opener.getAttribute('aria-label') ?? ''))).toBe(true)

    const persisted = JSON.parse(sessionStorage.getItem('pepecat:meme-selection:v3') ?? '[]') as string[]
    expect(persisted).toHaveLength(20)
    expect(persisted.every((id) => !current.some((asset) => asset.id === id))).toBe(true)
  })

  it('autoplays archive video on mute with native controls', () => {
    const video = createAsset(391, 'video')

    render(<MemeWall manifest={[video]} totalCount={1} />)

    const element = screen.getByLabelText(video.alt) as HTMLVideoElement
    expect(element.controls).toBe(true)
    expect(element.autoplay).toBe(true)
    expect(element.muted).toBe(true)
    expect(element.loop).toBe(true)
    expect(element.playsInline).toBe(true)
  })

  it('shows the newest archive images first when no session exists', () => {
    const manifest = Array.from({ length: 25 }, (_, index) => createAsset(index + 1))

    render(<MemeWall manifest={manifest} totalCount={manifest.length} />)

    const openers = screen.getAllByRole('button', { name: /^open pepecat meme/i })
    expect(openers).toHaveLength(20)
    expect(openers.map((opener) => opener.getAttribute('aria-label'))).toEqual(
      Array.from({ length: 20 }, (_, index) => `Open PEPECAT meme artwork ${25 - index}`),
    )
  })

  it('clicks shuffle automatically every two minutes', () => {
    vi.useFakeTimers()
    const manifest = Array.from({ length: 50 }, (_, index) => createAsset(index + 1))

    render(<MemeWall manifest={manifest} totalCount={manifest.length} />)

    const before = screen.getAllByRole('button', { name: /^open pepecat meme/i }).map((opener) => opener.getAttribute('aria-label'))
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    const after = screen.getAllByRole('button', { name: /^open pepecat meme/i }).map((opener) => opener.getAttribute('aria-label'))

    expect(after).toHaveLength(20)
    expect(after).not.toEqual(before)
    vi.useRealTimers()
  })
})
