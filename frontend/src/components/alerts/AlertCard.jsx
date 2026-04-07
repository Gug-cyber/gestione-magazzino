import { useState } from 'react'
import { Link } from 'react-router-dom'

const VARIANT_COLORS = {
  danger: {
    accent: '#f87171',
    bg: 'var(--color-danger-bg)',
    border: 'var(--color-danger-border)',
    glow: 'rgba(248, 113, 113, 0.18)',
  },
  warning: {
    accent: '#fbbf24',
    bg: 'var(--color-warning-bg)',
    border: 'var(--color-warning-border)',
    glow: 'rgba(251, 191, 36, 0.18)',
  },
  info: {
    accent: '#60a5fa',
    bg: 'var(--color-info-bg)',
    border: 'var(--color-info-border)',
    glow: 'rgba(96, 165, 250, 0.18)',
  },
  success: {
    accent: '#4ade80',
    bg: 'var(--color-success-bg)',
    border: 'var(--color-success-border)',
    glow: 'rgba(74, 222, 128, 0.18)',
  },
}

/**
 * Card riutilizzabile per un singolo alert.
 */
export default function AlertCard({
  title,
  count,
  variant = 'info',
  icon,
  linkTo,
  linkLabel = 'Vedi dettagli',
  description,
}) {
  const [hovered, setHovered] = useState(false)
  const isZero = count === 0
  const colors = isZero
    ? {
        accent: 'var(--color-border)',
        bg: 'var(--color-surface)',
        border: 'var(--color-border)',
        glow: 'none',
      }
    : VARIANT_COLORS[variant] || VARIANT_COLORS.info

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: '12px',
        border: `1px solid ${hovered && !isZero ? colors.border : 'var(--color-border)'}`,
        borderLeft: `3px solid ${colors.accent}`,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 200ms ease',
        boxShadow: hovered && !isZero ? `0 0 20px ${colors.glow}` : 'none',
        opacity: isZero ? 0.5 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row: icon + count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Icon */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: isZero ? 'var(--color-surface-hover)' : colors.bg,
            border: `1px solid ${isZero ? 'var(--color-border)' : colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isZero ? 'var(--color-text-muted)' : colors.accent,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        {/* Count */}
        <span
          style={{
            fontSize: '32px',
            fontWeight: '800',
            color: isZero ? 'var(--color-text-muted)' : colors.accent,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {count}
        </span>
      </div>

      {/* Title */}
      <div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: isZero ? 'var(--color-text-muted)' : 'var(--color-text)',
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              marginTop: '4px',
            }}
          >
            {description}
          </div>
        )}
      </div>

      {/* Link */}
      {linkTo && (
        <Link
          to={linkTo}
          className="gm-btn gm-btn-ghost gm-btn-sm"
          style={{
            alignSelf: 'flex-start',
            textDecoration: 'none',
            color: isZero ? 'var(--color-text-muted)' : colors.accent,
            pointerEvents: isZero ? 'none' : 'auto',
          }}
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  )
}
