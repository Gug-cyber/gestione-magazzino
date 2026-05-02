import { useLanguage } from '../../context/LanguageContext'

/**
 * StockBadge — dot + text availability indicator with enhanced styling
 * Props:
 *   quantita       – number (0 = out of stock)
 *   in_esaurimento – boolean (low stock flag from backend)
 *   soglia         – threshold below which "Solo N disponibili" is shown (default 3)
 */
export default function StockBadge({ quantita, in_esaurimento, soglia = 3 }) {
  const { t } = useLanguage()
  if (quantita === 0) {
    return (
      <StatusBadge 
        color="#dc2626" 
        bgColor="rgba(220, 38, 38, 0.08)"
        borderColor="rgba(220, 38, 38, 0.25)"
        icon="x"
      >
        {t('stock_out')}
      </StatusBadge>
    )
  }
  if (in_esaurimento && quantita > 0) {
    return (
      <StatusBadge 
        color="#d97706" 
        bgColor="rgba(217, 119, 6, 0.08)"
        borderColor="rgba(217, 119, 6, 0.25)"
        icon="alert"
        pulse
      >
        {t('stock_low')}
      </StatusBadge>
    )
  }
  if (quantita > 0 && quantita <= soglia) {
    return (
      <StatusBadge 
        color="#ea580c" 
        bgColor="rgba(234, 88, 12, 0.08)"
        borderColor="rgba(234, 88, 12, 0.25)"
        icon="clock"
      >
        {t('stock_only_n', quantita)}
      </StatusBadge>
    )
  }
  return (
    <StatusBadge 
      color="#16a34a" 
      bgColor="rgba(22, 163, 74, 0.08)"
      borderColor="rgba(22, 163, 74, 0.25)"
      icon="check"
    >
      {t('stock_available')}
    </StatusBadge>
  )
}

function StatusBadge({ color, bgColor, borderColor, icon, pulse, children }) {
  const icons = {
    check: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    x: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
    alert: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    clock: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  }

  return (
    <>
      {pulse && (
        <style>{`
          @keyframes pulseStock {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        `}</style>
      )}
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '600',
        color: color,
        backgroundColor: bgColor,
        padding: '8px 14px',
        borderRadius: '10px',
        border: `1px solid ${borderColor || color}`,
        animation: pulse ? 'pulseStock 2s ease-in-out infinite' : 'none',
      }}>
        <span style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
        }}>
          {icons[icon]}
        </span>
        {children}
      </span>
    </>
  )
}
