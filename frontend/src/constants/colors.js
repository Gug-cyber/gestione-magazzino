/**
 * Costanti di colore condivise per badge e stati.
 */

/** Colori per lo stato di conservazione dei prodotti (es. Near Mint, Played...) */
export const STATO_CONSERVAZIONE_COLORS = {
  'Mint':         { bg: '#e8f5e9', text: '#2e7d32' },
  'Near Mint':    { bg: '#f1f8e9', text: '#558b2f' },
  'Excellent':    { bg: '#e3f2fd', text: '#1565c0' },
  'Good':         { bg: '#fff8e1', text: '#f57f17' },
  'Light Played': { bg: '#fff3e0', text: '#e65100' },
  'Played':       { bg: '#fce4ec', text: '#c62828' },
  'Poor':         { bg: '#ffebee', text: '#b71c1c' },
}

/** Colori per lo stato degli ordini */
export const STATO_ORDINE_COLORS = {
  bozza:      { bg: '#f5f5f5',  text: '#757575' },
  confermato: { bg: '#e3f2fd',  text: '#1565c0' },
  spedito:    { bg: '#fff3e0',  text: '#e65100' },
  completato: { bg: '#e8f5e9',  text: '#2e7d32' },
  annullato:  { bg: '#ffebee',  text: '#c62828' },
}

/** Colori per il tipo di movimento (carico/scarico) */
export const TIPO_MOVIMENTO_COLORS = {
  carico:  { bg: '#e8f5e9', text: '#2e7d32' },
  scarico: { bg: '#ffebee', text: '#c62828' },
}

/** Colore primario dell'applicazione */
export const PRIMARY_COLOR = '#1a237e'
