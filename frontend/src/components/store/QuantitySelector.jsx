export default function QuantitySelector({ value, min = 1, max, onChange }) {
  const canDec = value > min
  const canInc = max == null || value < max

  const btnStyle = (enabled) => ({
    width: '40px', height: '40px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: enabled ? 'var(--color-surface-hover)' : 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    color: enabled ? 'var(--color-text)' : 'var(--color-text-muted)',
    fontSize: '20px',
    fontWeight: '400',
    transition: 'background-color 120ms ease',
    userSelect: 'none',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{
        fontSize: '14px',
        fontWeight: '500',
        color: 'var(--color-text-secondary)',
        minWidth: '72px',
      }}>
        Quantità:
      </span>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '4px',
      }}>
        <button onClick={() => canDec && onChange(value - 1)} style={btnStyle(canDec)} aria-label="Diminuisci">
          −
        </button>
        <span style={{
          minWidth: '36px', textAlign: 'center',
          fontWeight: '700', fontSize: '16px',
          color: 'var(--color-text)',
        }}>
          {value}
        </span>
        <button onClick={() => canInc && onChange(value + 1)} style={btnStyle(canInc)} aria-label="Aumenta">
          +
        </button>
      </div>
    </div>
  )
}
