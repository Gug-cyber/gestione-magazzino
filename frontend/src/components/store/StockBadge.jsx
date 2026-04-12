import { useLanguage } from '../../context/LanguageContext'

/**
 * StockBadge — dot + text availability indicator
 * Props:
 *   quantita       – number (0 = out of stock)
 *   in_esaurimento – boolean (low stock flag from backend)
 *   soglia         – threshold below which "Solo N disponibili" is shown (default 3)
 */
export default function StockBadge({ quantita, in_esaurimento, soglia = 3 }) {
  const { t } = useLanguage()
  if (quantita === 0) {
    return <DotBadge dotColor="var(--color-danger)">{t('stock_out')}</DotBadge>
  }
  if (in_esaurimento && quantita > 0) {
    return <DotBadge dotColor="var(--color-warning)">{t('stock_low')}</DotBadge>
  }
  if (quantita > 0 && quantita <= soglia) {
    return <DotBadge dotColor="var(--color-info)">{t('stock_only_n', quantita)}</DotBadge>
  }
  return <DotBadge dotColor="var(--color-success)">{t('stock_available')}</DotBadge>
}

function DotBadge({ dotColor, children }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '7px',
      fontSize: '14px',
      fontWeight: '500',
      color: 'var(--color-text-secondary)',
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: dotColor,
        flexShrink: 0,
        boxShadow: `0 0 0 3px color-mix(in srgb, ${dotColor} 20%, transparent)`,
      }} />
      {children}
    </span>
  )
}
