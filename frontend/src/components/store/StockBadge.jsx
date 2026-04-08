export default function StockBadge({ quantita, soglia = 3 }) {
  if (quantita === 0) {
    return (
      <Badge bg="var(--color-danger-bg)" color="var(--color-danger)" border="var(--color-danger-border)">
        ✕ Esaurito
      </Badge>
    )
  }
  if (quantita <= soglia) {
    return (
      <Badge bg="var(--color-warning-bg)" color="var(--color-warning)" border="var(--color-warning-border)">
        ⚡ Solo {quantita} disponibili
      </Badge>
    )
  }
  return (
    <Badge bg="var(--color-success-bg)" color="var(--color-success)" border="var(--color-success-border)">
      ✓ Disponibile
    </Badge>
  )
}

function Badge({ bg, color, border, children }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      backgroundColor: bg,
      color,
      border: `1px solid ${border}`,
      borderRadius: '20px',
      padding: '5px 14px',
      fontSize: '13px',
      fontWeight: '600',
    }}>
      {children}
    </span>
  )
}
