import { useState } from 'react'

export default function ProductGallery({ fotoUrl, nome, extraImages = [] }) {
  // Deduplication: Drive images already include foto_url as first photo.
  // If Drive images are present, use them all; otherwise fallback to foto_url.
  const images = extraImages.length > 0
    ? extraImages
    : fotoUrl
      ? [fotoUrl]
      : []

  const [selected, setSelected] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [hoverLeft, setHoverLeft] = useState(false)
  const [hoverRight, setHoverRight] = useState(false)

  const current = images[selected]

  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'flex-start' }}>

      {/* Vertical thumbnails on the left (Vinted style) — only if more than 1 image */}
      {images.length > 1 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0,
          width: '72px',
        }}>
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => { setSelected(idx); setImgLoaded(false); setImgError(false) }}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '10px',
                overflow: 'hidden',
                padding: 0,
                border: idx === selected
                  ? '2px solid var(--color-primary)'
                  : '2px solid transparent',
                cursor: 'pointer',
                backgroundColor: 'var(--color-surface)',
                outline: 'none',
                transition: 'border-color 150ms ease',
                opacity: idx === selected ? 1 : 0.7,
              }}
            >
              <img
                src={img}
                alt={`${nome} ${idx + 1}`}
                loading="lazy"
                decoding="async"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.currentTarget.style.opacity = '0.2' }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div style={{
        flex: 1,
        position: 'relative',
        aspectRatio: '1',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Skeleton */}
        {!imgLoaded && !imgError && current && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-hover) 50%, var(--color-surface) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }} />
        )}

        {/* Empty placeholder */}
        {(!current || imgError) && (
          <svg width="72" height="72" viewBox="0 0 56 56" fill="none" style={{ opacity: 0.15, color: 'var(--color-text-secondary)' }}>
            <rect x="10" y="14" width="36" height="30" rx="3" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="20" cy="24" r="3" stroke="currentColor" strokeWidth="1.8" />
            <polyline points="10,38 20,28 30,34 38,26 46,34 46,44 10,44" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
          </svg>
        )}

        {/* Image */}
        {current && !imgError && (
          <img
            key={current}
            src={current}
            alt={nome}
            onLoad={() => { setImgLoaded(true); setImgError(false) }}
            onError={() => { setImgError(true); setImgLoaded(false) }}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'contain',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 250ms ease',
              padding: '8px',
            }}
          />
        )}

        {/* Left/right arrow navigation — only if more than 1 image */}
        {images.length > 1 && (
          <>
            <button
              aria-label="Foto precedente"
              onClick={() => {
                const prev = (selected - 1 + images.length) % images.length
                setSelected(prev)
                setImgLoaded(false)
                setImgError(false)
              }}
              onMouseEnter={() => setHoverLeft(true)}
              onMouseLeave={() => setHoverLeft(false)}
              style={{
                position: 'absolute', left: 8, top: '50%',
                transform: 'translateY(-50%)',
                width: 36, height: 36,
                borderRadius: '50%',
                backgroundColor: hoverLeft ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.45)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white',
                transition: 'background-color 150ms ease',
                zIndex: 2,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              aria-label="Foto successiva"
              onClick={() => {
                const next = (selected + 1) % images.length
                setSelected(next)
                setImgLoaded(false)
                setImgError(false)
              }}
              onMouseEnter={() => setHoverRight(true)}
              onMouseLeave={() => setHoverRight(false)}
              style={{
                position: 'absolute', right: 8, top: '50%',
                transform: 'translateY(-50%)',
                width: 36, height: 36,
                borderRadius: '50%',
                backgroundColor: hoverRight ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.45)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white',
                transition: 'background-color 150ms ease',
                zIndex: 2,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        {/* Photo counter bottom-right */}
        {images.length > 1 && (
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            backgroundColor: 'rgba(0,0,0,0.55)',
            color: 'white',
            fontSize: '12px',
            fontWeight: '600',
            borderRadius: '20px',
            padding: '3px 10px',
            backdropFilter: 'blur(4px)',
          }}>
            {selected + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  )
}

