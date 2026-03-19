import { useNavigate } from 'react-router-dom'

function MobileHome() {
  const navigate = useNavigate()

  const cardStyle = (bg) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    minHeight: '120px',
    padding: '24px 16px',
    backgroundColor: bg,
    color: '#ffffff',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    fontSize: '1rem',
    fontWeight: '600',
    textAlign: 'center',
    boxSizing: 'border-box',
  })

  return (
    <div>
      {/* Hero header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>📦</div>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#1a237e',
          margin: '0 0 6px',
        }}>
          App Magazzino
        </h1>
        <p style={{
          fontSize: '0.9rem',
          color: '#64748b',
          margin: 0,
        }}>
          Operazioni rapide da mobile
        </p>
      </div>

      {/* Action cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button
          style={cardStyle('#1565c0')}
          onClick={() => navigate('/mobile/carico-fornitura')}
        >
          <span style={{ fontSize: '2.2rem' }}>📥</span>
          <span style={{ fontSize: '1.15rem' }}>Carico Fornitura</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: '400' }}>
            Registra l'arrivo di merce dal fornitore
          </span>
        </button>

        <button
          style={cardStyle('#2e7d32')}
          onClick={() => navigate('/mobile/nuovo-ordine')}
        >
          <span style={{ fontSize: '2.2rem' }}>🛒</span>
          <span style={{ fontSize: '1.15rem' }}>Nuovo Ordine</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: '400' }}>
            Crea rapidamente un nuovo ordine di vendita
          </span>
        </button>
      </div>
    </div>
  )
}

export default MobileHome
