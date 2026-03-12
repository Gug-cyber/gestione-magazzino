/**
 * Formattatori condivisi per date e valute.
 */

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
