import Link from 'next/link'

export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        minHeight: '100vh',
      }}
    >
      <header style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a237e' }}>
          📦 Gestione Magazzino
        </h1>
        <p style={{ marginTop: 8, color: '#555', fontSize: '0.95rem' }}>
          Mini-app mobile per operazioni di magazzino
        </p>
      </header>

      <nav
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <Link href="/scanner-demo" style={{ textDecoration: 'none' }}>
          <div
            style={{
              background: '#1a237e',
              color: '#fff',
              borderRadius: 14,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 4px 12px rgba(26,35,126,0.25)',
              transition: 'opacity 0.15s',
            }}
          >
            <span style={{ fontSize: '2rem' }}>📷</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                Scanner Demo
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: 4 }}>
                Testa il componente scanner barcode/QR
              </div>
            </div>
          </div>
        </Link>

        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            opacity: 0.6,
            cursor: 'not-allowed',
          }}
        >
          <span style={{ fontSize: '2rem' }}>📥</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1a237e' }}>
              Carico Fornitura
            </div>
            <div style={{ fontSize: '0.85rem', color: '#777', marginTop: 4 }}>
              Prossimamente
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            opacity: 0.6,
            cursor: 'not-allowed',
          }}
        >
          <span style={{ fontSize: '2rem' }}>🛒</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1a237e' }}>
              Nuovo Ordine
            </div>
            <div style={{ fontSize: '0.85rem', color: '#777', marginTop: 4 }}>
              Prossimamente
            </div>
          </div>
        </div>
      </nav>
    </main>
  )
}
