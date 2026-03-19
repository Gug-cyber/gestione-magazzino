import { useNavigate } from 'react-router-dom'

export default function AppHome() {
  const navigate = useNavigate()

  const cards = [
    {
      emoji: '📦',
      title: 'Carico Fornitura',
      description: 'Scansiona i prodotti in arrivo e aggiorna il magazzino in pochi secondi.',
      path: '/app/carico-fornitura',
      color: '#1a237e',
      bg: 'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)',
      btnColor: '#1a237e',
    },
    {
      emoji: '🛒',
      title: 'Nuovo Ordine',
      description: 'Crea un ordine cliente scansionando i prodotti da spedire.',
      path: '/app/nuovo-ordine',
      color: '#1b5e20',
      bg: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
      btnColor: '#2e7d32',
    },
  ]

  return (
    <div style={{
      maxWidth: 600,
      margin: '0 auto',
      padding: 'clamp(16px, 4vw, 32px)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📱</div>
        <h1 style={{ color: '#1a237e', margin: 0, fontSize: 'clamp(1.4rem, 5vw, 2rem)' }}>
          App Mobile
        </h1>
        <p style={{ color: '#666', marginTop: 8, fontSize: '0.95rem' }}>
          Operazioni rapide ottimizzate per smartphone e tablet
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {cards.map(card => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            style={{
              background: card.bg,
              border: `2px solid ${card.btnColor}22`,
              borderRadius: 16,
              padding: 'clamp(20px, 5vw, 32px)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              minHeight: 120,
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
            onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <div style={{ fontSize: 'clamp(2.5rem, 8vw, 3.5rem)', lineHeight: 1, flexShrink: 0 }}>
              {card.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 'clamp(1.1rem, 4vw, 1.4rem)',
                fontWeight: 700,
                color: card.color,
                marginBottom: 6,
              }}>
                {card.title}
              </div>
              <div style={{ fontSize: 'clamp(0.82rem, 2.5vw, 0.95rem)', color: '#555', lineHeight: 1.4 }}>
                {card.description}
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', color: card.btnColor, flexShrink: 0 }}>›</div>
          </button>
        ))}
      </div>
    </div>
  )
}
