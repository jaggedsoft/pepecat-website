import { useEffect, useState } from 'react'
import { MemeWall } from './components/MemeWall'
import { TokenReceipt, RAYDIUM_URL } from './components/TokenReceipt'
import { fallbackMemes } from './data/fallbackMemes'
import { avatarSrcSet, heroAvatar } from './data/avatars'
import { parseMemeManifest } from './lib/manifest'
import type { MemeManifest } from './types/media'

const COMMUNITY_URL = 'https://t.me/PepeCat_Token_Solana'
const X_URL = 'https://x.com/pepecattoken'

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [manifest, setManifest] = useState<MemeManifest | null>(null)

  useEffect(() => {
    let active = true
    fetch('/media/memes/manifest.json')
      .then((response) => {
        if (!response.ok) throw new Error('Manifest unavailable')
        return response.json()
      })
      .then((data) => {
        if (active) setManifest(parseMemeManifest(data))
      })
      .catch(() => {
        if (active) {
          setManifest({
            snapshotDate: '2026-08-11',
            auditedBaseline: { photos: 391, videos: 1 },
            finalCount: fallbackMemes.length,
            assets: fallbackMemes,
          })
        }
      })
    return () => { active = false }
  }, [])

  const memeCount = manifest?.finalCount ?? fallbackMemes.length

  const navigateFromMenu = (targetId: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    setMenuOpen(false)
    const target = document.getElementById(targetId)
    requestAnimationFrame(() => target?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    window.history.replaceState(null, '', `#${targetId}`)
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="PEPECAT home">$PEPECAT</a>
        <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-nav" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? 'Close' : 'Menu'}</button>
        <nav id="site-nav" className={menuOpen ? 'site-nav is-open' : 'site-nav'} aria-label="Primary navigation">
          <a href="#archive" onClick={navigateFromMenu('archive')}>Memes</a>
          <a href="#lore" onClick={navigateFromMenu('lore')}>Lore</a>
          <a href="#token" onClick={navigateFromMenu('token')}>Token</a>
          <a href="#community" onClick={navigateFromMenu('community')}>Community</a>
          <a className="nav-buy" href={RAYDIUM_URL} target="_blank" rel="noreferrer noopener">Buy <span aria-hidden="true">↗</span></a>
        </nav>
      </header>

      <main id="main">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero__copy">
            <p className="eyebrow">CULTURE ARCHIVE <span>•</span> PEPECAT <span>•</span> ON-CHAIN</p>
            <h1 id="hero-title">THE CAT HAS ENTERED THE CHAT<span aria-hidden="true">.</span></h1>
            <p className="hero__lede">Pepe energy. Cat attitude. A community-made archive of memes, fan art, and on-chain chaos.</p>
            <div className="hero__actions">
              <a className="action-button" href="#archive" onClick={navigateFromMenu('archive')} aria-label="Explore the PEPECAT archive">
                Explore Archive
              </a>
            </div>
            <dl className="hero__stats mono" aria-label="Archive quick stats">
              <div>
                <dt>Meme Art</dt>
                <dd>{memeCount}</dd>
              </div>
              <div>
                <dt>Contributors</dt>
                <dd>∞</dd>
              </div>
              <div>
                <dt>Chain</dt>
                <dd>SOLANA</dd>
              </div>
              <div className="is-verified">
                <dt>Verified</dt>
                <dd>By Culture</dd>
              </div>
            </dl>
          </div>
          <div className="hero__stage" aria-label="Featured PEPECAT mascot">
            <picture>
              <source type="image/avif" srcSet={avatarSrcSet(heroAvatar.id, 'avif')} sizes="(max-width: 700px) 100vw, 55vw" />
              <source type="image/webp" srcSet={avatarSrcSet(heroAvatar.id, 'webp')} sizes="(max-width: 700px) 100vw, 55vw" />
              <img src="/media/avatars/pc03-960.webp" width="2000" height="2000" fetchPriority="high" alt={heroAvatar.label} />
            </picture>
          </div>
        </section>

        <section className="section archive" id="archive" aria-labelledby="archive-title">
          <header className="section-heading section-heading--split">
            <div>
              <h2 id="archive-title">The Archive</h2>
            </div>
            <p>A fresh pull from the community vault. New session, new wall.</p>
          </header>
          {manifest ? (
            <>
              <MemeWall manifest={manifest.assets} totalCount={manifest.finalCount} />
              <p className="snapshot-note mono">{manifest.finalCount} MEDIA FILES</p>
            </>
          ) : (
            <p className="archive-loading mono" role="status">OPENING THE LOCAL ARCHIVE…</p>
          )}
        </section>

        <section className="section lore" id="lore" aria-labelledby="lore-title">
          <div className="lore__label">
            <h2 id="lore-title">The Lore</h2>
          </div>
          <p className="lore__lead">Pepe found the internet. Then the internet gave him a cat.</p>
          <p className="lore__body"><strong>PEPECAT</strong> is that cat: moody, loud, endlessly remixable, and living on Solana.</p>
        </section>

        <section className="section token" id="token" aria-labelledby="token-title">
          <header className="section-heading section-heading--split">
            <div>
              <h2 id="token-title">The Receipts</h2>
            </div>
            <p>No tricks. Just independently checked token facts, frozen in this static build.</p>
          </header>
          <TokenReceipt />
        </section>

        <section className="section founders" aria-labelledby="founders-title">
          <div>
            <h2 id="founders-title">Founded by</h2>
          </div>
          <p><a href="https://x.com/jaggedsoft" target="_blank" rel="noreferrer noopener">Jaggedsoft <span aria-hidden="true">↗</span></a> and <a href="https://x.com/TrystanNFT" target="_blank" rel="noreferrer noopener">TrystanNFT <span aria-hidden="true">↗</span></a>.</p>
        </section>

        <section className="closing" id="community" aria-labelledby="closing-title">
          <div className="closing__art">
            <picture>
              <source type="image/avif" srcSet="/media/memes/supp-forest-rest-480.avif 480w, /media/memes/supp-forest-rest-960.avif 960w, /media/memes/supp-forest-rest-1200.avif 1200w" sizes="(max-width: 760px) 100vw, 46vw" />
              <source type="image/webp" srcSet="/media/memes/supp-forest-rest-480.webp 480w, /media/memes/supp-forest-rest-960.webp 960w, /media/memes/supp-forest-rest-1200.webp 1200w" sizes="(max-width: 760px) 100vw, 46vw" />
              <img src="/media/memes/supp-forest-rest-960.webp" width="1200" height="1200" loading="lazy" alt="PEPECAT resting in a leafy forest clearing with friends" />
            </picture>
          </div>
          <div className="closing__copy">
            <p className="section-kicker mono">JOIN THE CULTURE</p>
            <h2 id="closing-title">One cat.<br />Every mood<span aria-hidden="true">.</span></h2>
            <div className="closing__actions">
              <a className="action-button" href={COMMUNITY_URL} target="_blank" rel="noreferrer noopener">Join Telegram <span aria-hidden="true">↗</span></a>
              <a className="outline-button" href={X_URL} target="_blank" rel="noreferrer noopener">Follow on X <span aria-hidden="true">↗</span></a>
              <a className="outline-button" href={RAYDIUM_URL} target="_blank" rel="noreferrer noopener">Buy $PEPECAT <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p className="footer-brand">$PEPECAT</p>
        <p className="disclaimer"><strong>Risk disclaimer:</strong> $PEPECAT is a meme token with no intrinsic value or expectation of financial return. It is not financial advice. Crypto assets are highly volatile; only participate with funds you can afford to lose, and always do your own research.</p>
        <p className="mono">SOLANA · CULTURE ARCHIVE · 2026</p>
      </footer>
    </div>
  )
}

export default App
