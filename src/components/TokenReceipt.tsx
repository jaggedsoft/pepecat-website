import { useState } from 'react'

export const MINT = 'CRAMvzDsSpXYsFpcoDr6vFLJMBeftez1E7277xwPpump'
export const RAYDIUM_URL = `https://raydium.io/swap/?inputMint=sol&outputMint=${MINT}`
export const DEXSCREENER_URL = 'https://dexscreener.com/solana/CycVvS19mPJ1cCWfiiWk3M32LTdrW8akChLMf8u75py1'
export const DEXTOOLS_URL = 'https://www.dextools.io/app/en/solana/pair-explorer/CycVvS19mPJ1cCWfiiWk3M32LTdrW8akChLMf8u75py1'
export const EXPLORER_URL = `https://explorer.solana.com/address/${MINT}`

const facts = [
  ['Network', 'Solana mainnet'],
  ['Decimals', '6'],
  ['Current supply', '989,738,717.726281'],
  ['Mint authority', 'Revoked'],
  ['Freeze authority', 'Revoked'],
  ['Verified', '12 Aug 2026'],
]

const destinations = [
  ['Explorer', EXPLORER_URL],
  ['Dexscreener', DEXSCREENER_URL],
  ['DEXTools', DEXTOOLS_URL],
  ['Raydium', RAYDIUM_URL],
] as const

export function TokenReceipt() {
  const [status, setStatus] = useState('')

  const copyContract = async () => {
    try {
      await navigator.clipboard.writeText(MINT)
      setStatus('Contract copied')
    } catch {
      setStatus('Copy failed. Select the contract text to copy it manually.')
    }
  }

  return (
    <div className="receipt">
      <div className="receipt__contract">
        <span className="mono">MINT</span>
        <code>{MINT}</code>
        <button className="copy-button" type="button" onClick={copyContract}>Copy contract</button>
        <p className="sr-only" role="status" aria-live="polite">{status}</p>
      </div>
      <dl className="receipt__facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="mono">{label}</dt>
            <dd>{value}{label === 'Current supply' && <small> PEPECAT</small>}</dd>
          </div>
        ))}
      </dl>
      <nav className="receipt__links" aria-label="Verified token destinations">
        {destinations.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer noopener">{label} <span aria-hidden="true">↗</span></a>)}
      </nav>
    </div>
  )
}
