/**
 * Funzioni pure di business logic per gli alert intelligenti.
 * Nessun side effect, nessuna chiamata API.
 */

/**
 * Restituisce i prodotti la cui quantita è inferiore o uguale alla quantita_minima.
 * @param {Array} products
 * @returns {Array}
 */
export function lowStockProducts(products) {
  if (!Array.isArray(products)) return []
  return products.filter(
    (p) =>
      p.quantita_minima != null &&
      p.quantita_minima > 0 &&
      p.quantita != null &&
      p.quantita <= p.quantita_minima
  )
}

/**
 * Restituisce i prodotti che non hanno avuto movimenti negli ultimi `days` giorni.
 * Usa il campo `data_ultimo_movimento` del prodotto.
 * @param {Array} products
 * @param {number} days
 * @returns {Array}
 */
export function stagnantProducts(products, days) {
  if (!Array.isArray(products)) return []
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return products.filter((p) => {
    if (!p.data_ultimo_movimento) {
      if (!p.created_at) return false
      return new Date(p.created_at) < cutoff
    }
    return new Date(p.data_ultimo_movimento) < cutoff
  })
}

/**
 * Restituisce i prodotti il cui margine percentuale è inferiore a `thresholdPercent`.
 * Margine % = ((prezzo_vendita - prezzo_acquisto) / prezzo_vendita) * 100
 * Includi solo prodotti con ENTRAMBI i prezzi valorizzati e > 0.
 * @param {Array} products
 * @param {number} thresholdPercent
 * @returns {Array}
 */
export function lowMarginProducts(products, thresholdPercent) {
  if (!Array.isArray(products)) return []
  return products.filter((p) => {
    const pv = parseFloat(p.prezzo_vendita)
    const pa = parseFloat(p.prezzo_acquisto)
    if (!pv || !pa || pv <= 0 || pa <= 0) return false
    const margin = ((pv - pa) / pv) * 100
    return margin < thresholdPercent
  })
}

/**
 * Restituisce i prodotti privi di prezzo_acquisto O prezzo_vendita (null, undefined o 0).
 * @param {Array} products
 * @returns {Array}
 */
export function productsWithMissingPricing(products) {
  if (!Array.isArray(products)) return []
  return products.filter(
    (p) =>
      !p.prezzo_acquisto ||
      parseFloat(p.prezzo_acquisto) <= 0 ||
      !p.prezzo_vendita ||
      parseFloat(p.prezzo_vendita) <= 0
  )
}

/**
 * Restituisce gli ordini con stato 'confermato' o 'spedito' (da completare/spedire).
 * @param {Array} orders
 * @returns {Array}
 */
export function pendingOrders(orders) {
  if (!Array.isArray(orders)) return []
  return orders.filter(
    (o) => o.stato === 'confermato' || o.stato === 'spedito'
  )
}

/**
 * Restituisce le fatture con pagata === false.
 * @param {Array} invoices
 * @returns {Array}
 */
export function unpaidInvoices(invoices) {
  if (!Array.isArray(invoices)) return []
  return invoices.filter((f) => f.pagata === false)
}
