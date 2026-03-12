/**
 * Componente badge generico riutilizzabile per visualizzare stati con colori.
 *
 * Accetta:
 * - value: stringa da visualizzare
 * - colors: mappa { [valore]: { bg, text } } — se omessa si usa una mappa vuota
 */
export default function StatoBadge({ value, colors = {}, capitalize = false }) {
  if (!value) return <span>—</span>
  const c = colors[value] || { bg: '#f5f5f5', text: '#555' }
  return (
    <span
      style={{
        backgroundColor: c.bg,
        color: c.text,
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '0.82rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        textTransform: capitalize ? 'capitalize' : 'none',
      }}
    >
      {value}
    </span>
  )
}
