import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Lightbox } from './Lightbox'
import { createAsset } from '../test/fixtures'

describe('Lightbox', () => {
  it('has dialog semantics and closes on Escape', () => {
    const asset = createAsset(1)
    const onClose = vi.fn()

    render(<Lightbox assets={[asset]} activeIndex={0} onChange={vi.fn()} onClose={onClose} />)

    const dialog = screen.getByRole('dialog', { name: /archive view/i })
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders video with autoplay, loop, and muted playback', () => {
    const asset = createAsset(391, 'video')

    render(<Lightbox assets={[asset]} activeIndex={0} onChange={vi.fn()} onClose={vi.fn()} />)

    const video = screen.getByLabelText(asset.alt) as HTMLVideoElement
    expect(video.autoplay).toBe(true)
    expect(video.loop).toBe(true)
    expect(video.muted).toBe(true)
  })
})
