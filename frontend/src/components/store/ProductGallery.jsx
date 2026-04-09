import { useState } from 'react'

export default function ProductGallery({ fotoUrl, nome, extraImages = [] }) {
  const images = [
    ...(fotoUrl ? [fotoUrl] : []),
    ...extraImages,
  ]
  const [selected, setSelected] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)

  const current = images[selected]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Main image container */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1',
          borderRadius: '20px',
          overflow: 'hidden',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: hovered
            ? '0 24px 60px rgba(0,0,0,0.5)'
            : '0 8px 32px rgba(0,0,0,0.35)',
          transition: 'box-shadow 300ms ease',
        }}
      >
        {/* Skeleton shimmer */}
        {!imgLoaded && !imgError && current && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-hover) 50%, var(--color-surface) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }} />
        )}

        {/* Fallback SVG placeholder */}
        {(!current || imgError) && (
          <svg width="72" height="72" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.18, color: 'var(--color-text-secondary)' }}>
            <rect x="10" y="14" width="36" height="30" rx="3" stroke="currentColor" strokeWidth="1.8" />
            <polyline points="10,22 28,30 46,22" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <line x1="28" y1="30" x2="28" y2="44" stroke="currentColor" strokeWidth="1.8" />
            <polyline points="18,10 28,14 38,10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        )}

        {/* Image */}
        {current && !imgError && (
          <img
            key={current}
            src={current}
            alt={nome}
            onLoad={() => { setImgLoaded(true); setImgError(false) }}
            onError={() => setImgError(true)}
            width="1"
            height="1"
            loading="lazy"
            decoding="async"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 300ms ease, transform 400ms ease',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
            }}
          />
        )}

      </div>

      {/* Thumbnail strip — shown only if multiple images */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => { setSelected(idx); setImgLoaded(false); setImgError(false) }}
              style={{
                width: '64px', height: '64px',
                borderRadius: '10px',
                overflow: 'hidden',
                padding: 0,
                border: idx === selected
                  ? '2px solid var(--color-primary)'
                  : '2px solid var(--color-border)',
                cursor: 'pointer',
                transition: 'border-color 150ms ease',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <img
                src={img}
                alt={`${nome} ${idx + 1}`}
                loading="lazy"
                decoding="async"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
