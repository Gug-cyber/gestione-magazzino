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
        background: '#09090b',
      }}
    >
      <header style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#a5b4fc' }}>
          📦 Gestione Magazzino
        </h1>
        <p style={{ marginTop: 8, color: '#a1a1aa', fontSize: '0.95rem' }}>
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
              background: '#6366f1',
              color: '#fff',
              borderRadius: 14,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
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
            background: '#1f1f26',
            borderRadius: 14,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            opacity: 0.6,
            cursor: 'not-allowed',
          }}
        >
          <span style={{ fontSize: '2rem' }}>📥</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#a5b4fc' }}>
              Carico Fornitura
            </div>
            <div style={{ fontSize: '0.85rem', color: '#71717a', marginTop: 4 }}>
              Prossimamente
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#1f1f26',
            borderRadius: 14,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            opacity: 0.6,
            cursor: 'not-allowed',
          }}
        >
          <span style={{ fontSize: '2rem' }}>🛒</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#a5b4fc' }}>
              Nuovo Ordine
            </div>
            <div style={{ fontSize: '0.85rem', color: '#71717a', marginTop: 4 }}>
              Prossimamente
            </div>
          </div>
        </div>
      </nav>
    </main>
  )
}
