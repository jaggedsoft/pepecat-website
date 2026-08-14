import { avatarSrcSet, featuredAvatars } from '../data/avatars'

export function ExpressionReel() {
  return (
    <div className="expression-reel" role="region" aria-label="PEPECAT expression collection" tabIndex={0}>
      <div className="expression-reel__track">
        {featuredAvatars.map((avatar, index) => (
          <figure className="expression-card" key={avatar.id}>
            <span className="expression-card__index mono">{String(index + 1).padStart(2, '0')}<small>/40</small></span>
            <picture>
              <source type="image/avif" srcSet={avatarSrcSet(avatar.id, 'avif')} sizes="(max-width: 700px) 70vw, 28vw" />
              <source type="image/webp" srcSet={avatarSrcSet(avatar.id, 'webp')} sizes="(max-width: 700px) 70vw, 28vw" />
              <img src={`/media/avatars/${avatar.id}-960.webp`} width="2000" height="2000" loading="lazy" decoding="async" alt={avatar.label} />
            </picture>
          </figure>
        ))}
      </div>
    </div>
  )
}
