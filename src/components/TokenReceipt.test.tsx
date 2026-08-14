import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MINT, TokenReceipt } from './TokenReceipt'

describe('TokenReceipt', () => {
  it('copies the complete mint address and announces confirmation', async () => {
    render(<TokenReceipt />)

    expect(screen.getByText(MINT)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /copy contract/i }))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(MINT)
    const status = await screen.findByText(/contract copied/i)
    expect(status).toHaveAttribute('role', 'status')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('reports a clipboard failure without claiming the mint was copied', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('clipboard unavailable'))

    render(<TokenReceipt />)

    fireEvent.click(screen.getByRole('button', { name: /copy contract/i }))

    const status = await screen.findByText(/copy failed|unable to copy/i)
    expect(status).toHaveAttribute('role', 'status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(screen.queryByText(/^copied!?$/i)).not.toBeInTheDocument()
  })
})
