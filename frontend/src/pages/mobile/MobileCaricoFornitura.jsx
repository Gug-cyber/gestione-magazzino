import { useNavigate } from 'react-router-dom'

function MobileCaricoFornitura() {
  const navigate = useNavigate()

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📥</div>
        <h1 style={{
          fontSize: '1.4rem',
          fontWeight: '700',
          color: '#1a237e',
          margin: '0 0 6px',
        }}>
          Carico Fornitura
        </h1>
      </div>

      {/* Info card */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom: '20px',
      }}>
        <p style={{
          color: '#475569',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          margin: '0 0 20px',
          textAlign: 'center',
        }}>
          Qui potrai registrare l'arrivo di nuova merce dal fornitore, scansionando i barcode dei prodotti in ingresso.
        </p>

        <button
          disabled
          style={{
            display: 'block',
            width: '100%',
            padding: '14px',
            backgroundColor: '#e2e8f0',
            color: '#94a3b8',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'not-allowed',
          }}
        >
          🔧 Funzionalità in arrivo
        </button>
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate('/mobile')}
        style={{
          display: 'block',
          width: '100%',
          padding: '14px',
          backgroundColor: 'transparent',
          color: '#1565c0',
          border: '2px solid #1565c0',
          borderRadius: '10px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        ← Torna alla Home
      </button>
    </div>
  )
}

export default MobileCaricoFornitura
