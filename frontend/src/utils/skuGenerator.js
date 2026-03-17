/**
 * Genera uno SKU dal nome, stato di conservazione e lingua del prodotto.
 * Stessa logica usata in NuovoProdotto.jsx.
 * Formato: [PREFIX_NOME]-[CODICE_PARENTESI]-[SIGLA_STATO]-[SIGLA_LINGUA]
 */

export const STATO_MAP = {
  'Mint': 'MT', 'Near Mint': 'NM', 'Excellent': 'EX',
  'Good': 'GD', 'Light Played': 'LP', 'Played': 'PL', 'Poor': 'PO',
}

export const LINGUA_MAP = {
  'Italiano': 'IT', 'Inglese': 'EN', 'Giapponese': 'JP',
  'Cinese': 'CN', 'Coreano': 'KR',
}

export function generateSKU(nome, statoConservazione, lingua) {
  const parenMatch = nome.match(/\(([^)]+)\)/)
  const parenCode = parenMatch
    ? parenMatch[1].replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toUpperCase()
    : null

  const nomePulito = nome.replace(/\([^)]*\)/g, '').replace(/[^a-zA-Z0-9 ]/g, '').trim()
  const prefix = nomePulito.replace(/\s+/g, '').substring(0, 3).toUpperCase()

  const statoCode = STATO_MAP[statoConservazione] || null
  const linguaCode = LINGUA_MAP[lingua] || null

  const parts = [prefix, parenCode, statoCode, linguaCode].filter(Boolean)
  return parts.join('-')
}
