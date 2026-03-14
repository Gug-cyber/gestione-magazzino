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
