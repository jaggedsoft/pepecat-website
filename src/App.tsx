import { useEffect, useState } from 'react'
import { MemeWall } from './components/MemeWall'
import { TokenReceipt, RAYDIUM_URL } from './components/TokenReceipt'
import { fallbackMemes } from './data/fallbackMemes'
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
            snapshotDate: '2026-08-13',
            auditedBaseline: { photos: 391, videos: 1 },
            finalCount: fallbackMemes.length,
            assets: fallbackMemes,
          })
        }
      })
    return () => { active = false }
  }, [])

  const navigateFromMenu = (targetId: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    setMenuOpen(false)
    const target = document.getElementById(targetId)
    requestAnimationFrame(() => target?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    window.history.replaceState(null, '', `#${targetId}`)
  }

  return (
    <div className="site-shell">
      <div className="site-bloom" aria-hidden="true" />
      <div className="site-grain" aria-hidden="true" />

      <header className="site-header">
        <nav id="site-nav" className={menuOpen ? 'nav-pill is-open' : 'nav-pill'} aria-label="Primary navigation">
          <a className="brand" href="#top" aria-label="PEPECAT home">$PEPECAT</a>
          <div id="site-nav-links" className="nav-pill__links">
            <a href="#archive" onClick={navigateFromMenu('archive')}>Memes</a>
            <a href="#lore" onClick={navigateFromMenu('lore')}>Lore</a>
            <a href="#token" onClick={navigateFromMenu('token')}>Token</a>
            <a href="#community" onClick={navigateFromMenu('community')}>Community</a>
          </div>
          <a className="nav-buy" href={RAYDIUM_URL} target="_blank" rel="noreferrer noopener">
            Buy
            <span className="btn-icon" aria-hidden="true">↗</span>
          </a>
          <button
            className="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="site-nav-links"
            aria-label={menuOpen ? 'Close' : 'Menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="menu-toggle__bars" aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </nav>
      </header>

      <main id="main">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero__copy">
            <p className="hero__kicker mono">
              <strong>Catcoin Supercycle</strong>
              <span aria-hidden="true">·</span>
              <span>PEPECAT</span>
              <span aria-hidden="true">·</span>
              <span>On-chain meme fun</span>
            </p>

            <h1 id="hero-title" aria-label="The cat has entered the chat.">
              <span>The cat has</span>
              <span>entered the chat<span className="hero__period" aria-hidden="true">.</span></span>
            </h1>

            <div className="hero__rule" aria-hidden="true"><span /></div>

            <p className="hero__lede">
              <span>Pepe energy. Cat attitude.</span>
              <span>A community-made collection of memes,</span>
              <span>fan art, and on-chain chaos.</span>
            </p>

            <dl className="hero__metrics mono">
              <div>
                <dt>Artworks</dt>
                <dd>{manifest?.finalCount ?? 418}</dd>
              </div>
              <div>
                <dt>Contributors</dt>
                <dd aria-label="Countless contributors">∞</dd>
              </div>
              <div>
                <dt>Chain</dt>
                <dd>Solana</dd>
              </div>
              <div className="hero__verified">
                <dt>Verified by culture</dt>
                <dd>
                  <img src="/media/hero/verified-by-culture.png" width="244" height="65" alt="" aria-hidden="true" />
                  <span className="sr-only">Handwritten culture verification signature with check seal</span>
                </dd>
              </div>
            </dl>

            <a className="hero__cta mono" href="#archive">
              <span>Explore the memes</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="hero__stage" aria-label="Featured PEPECAT mascot">
            <div className="hero__frame">
              <picture>
                <source type="image/avif" srcSet="/media/hero/pepecat-hero-640.avif 640w, /media/hero/pepecat-hero-960.avif 960w, /media/hero/pepecat-hero-1254.avif 1254w" sizes="(max-width: 820px) 100vw, 58vw" />
                <source type="image/webp" srcSet="/media/hero/pepecat-hero-640.webp 640w, /media/hero/pepecat-hero-960.webp 960w, /media/hero/pepecat-hero-1254.webp 1254w" sizes="(max-width: 820px) 100vw, 58vw" />
                <img src="/media/hero/pepecat-hero-960.webp" width="1254" height="1254" fetchPriority="high" alt="PEPECAT grinning against a textured midnight-violet background" />
              </picture>
            </div>
          </div>
        </section>

        <section className="section archive" id="archive" aria-labelledby="archive-title">
          <header className="section-heading">
            <h2 id="archive-title">The Memes</h2>
            <p>Are you ready for the catcoin supercycle?</p>
          </header>
          {manifest ? (
            <MemeWall manifest={manifest.assets} totalCount={manifest.finalCount} />
          ) : (
            <p className="archive-loading mono" role="status">Opening the local archive…</p>
          )}
        </section>

        <section className="section lore" id="lore" aria-labelledby="lore-title">
          <h2 id="lore-title">The Lore</h2>
          <p className="lore__lead">Pepe found the internet. Then the internet gave him a cat.</p>
          <p className="lore__body"><strong>PEPECAT</strong> is that cat: moody, loud, endlessly remixable, and living on Solana.</p>
        </section>

        <section className="section token" id="token" aria-labelledby="token-title">
          <header className="section-heading">
            <h2 id="token-title">Token Info</h2>
            <p>You can fade the noise, but not the movement. He who controls the memes, controls the universe. Don&apos;t let your memes be dreams.</p>
          </header>
          <TokenReceipt />
        </section>

        <section className="section founders" aria-labelledby="founders-title">
          <h2 id="founders-title">Founded by</h2>
          <p>
            <a href="https://x.com/jaggedsoft" target="_blank" rel="noreferrer noopener">Jaggedsoft <span aria-hidden="true">↗</span></a>
            {' '}&amp;{' '}
            <a href="https://x.com/TrystanNFT" target="_blank" rel="noreferrer noopener">TrystanNFT <span aria-hidden="true">↗</span></a>.
          </p>
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
            <h2 id="closing-title">Join the community, memes included</h2>
            <div className="closing__actions">
              <a className="action-button" href={COMMUNITY_URL} target="_blank" rel="noreferrer noopener">
                Join Telegram
                <span className="btn-icon" aria-hidden="true">↗</span>
              </a>
              <a className="outline-button" href={X_URL} target="_blank" rel="noreferrer noopener">
                Follow on X
                <span className="btn-icon" aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p className="footer-line">The cat stays in the chat.</p>
        <div className="footer-meta">
          <p className="footer-brand">$PEPECAT</p>
          <p className="disclaimer"><strong>Risk disclaimer:</strong> $PEPECAT is a meme token with no intrinsic value or expectation of financial return. It is not financial advice. Crypto assets are highly volatile; only participate with funds you can afford to lose, and always do your own research.</p>
          <p className="mono">Solana · Catcoin Culture · 2026</p>
        </div>
      </footer>
    </div>
  )
}

export default App
