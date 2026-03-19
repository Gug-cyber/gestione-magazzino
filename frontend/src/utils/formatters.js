/**
 * Formattatori condivisi per date, valute e normalizzazione SKU.
 */

/**
 * Normalize SKU to be CODE39-compatible and ensure consistent storage/matching.
 * - Converts to uppercase (CODE39 standard)
 * - Replaces underscore with hyphen (underscore not supported by CODE39)
 * - Removes characters not supported by CODE39
 * - Collapses multiple hyphens into one
 * - Trims hyphens from start/end
 * CODE39 charset: 0-9, A-Z, - . $ / + % (space)
 */
export function normalizeSkuForCode39(sku) {
  if (!sku) return ''
  return sku
    .toUpperCase()
    .replace(/[_]/g, '-')
    .replace(/[^0-9A-Z\-. $/+%]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

/**
 * Returns background and text color for an activity log action badge.
 * crea_* → green, modifica_* → orange, elimina_* → red, login/logout → blue, default → gray
 */
export function getAzioneBadge(azione) {
  if (!azione) return { bg: '#f5f5f5', color: '#616161' }
  if (azione.startsWith('crea_')) return { bg: '#e8f5e9', color: '#2e7d32' }
  if (azione.startsWith('modifica_')) return { bg: '#fff3e0', color: '#e65100' }
  if (azione.startsWith('elimina_')) return { bg: '#ffebee', color: '#c62828' }
  if (azione === 'login' || azione === 'logout') return { bg: '#e3f2fd', color: '#1565c0' }
  return { bg: '#f5f5f5', color: '#616161' }
}
