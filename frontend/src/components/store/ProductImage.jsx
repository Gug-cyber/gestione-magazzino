import { useState } from 'react'

function PlaceholderSVG() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.22, color: 'var(--color-text-secondary)' }}
    >
      {/* Box / product outline */}
      <rect x="10" y="14" width="36" height="30" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <polyline points="10,22 28,30 46,22" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <line x1="28" y1="30" x2="28" y2="44" stroke="currentColor" strokeWidth="1.8" />
      <polyline points="18,10 28,14 38,10" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * ProductImage
 * Props:
 *   src          – image URL or null/undefined
 *   alt          – alt text
 *   aspectRatio  – 'card' (4/3 ratio, no border) | 'detail' (1:1, border + shadow)
 *   className    – optional extra class
 *   hovered      – whether the parent card is hovered (for scale effect on card)
 */
export default function ProductImage({ src, alt, aspectRatio = 'card', className, hovered = false }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  const isDetail = aspectRatio === 'detail'

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: isDetail ? '1' : '4/3',
        borderRadius: isDetail ? '12px' : '0',
        border: isDetail ? '1px solid var(--color-border)' : undefined,
        boxShadow: isDetail ? '0 8px 32px rgba(0,0,0,0.35)' : undefined,
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface-hover)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Shimmer while loading */}
      {!loaded && !errored && src && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, var(--color-surface-hover) 25%, var(--color-surface-active) 50%, var(--color-surface-hover) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
        }} />
      )}

      {/* Elegant SVG placeholder (shown when no src or on error) */}
      {(!src || errored) && <PlaceholderSVG />}

      {/* Actual image */}
      {src && !errored && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 300ms ease, transform 350ms ease',
            transform: !isDetail && hovered ? 'scale(1.06)' : 'scale(1)',
          }}
        />
      )}
    </div>
  )
}
