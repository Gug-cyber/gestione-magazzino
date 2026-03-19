import { useNavigate, useLocation } from 'react-router-dom'

function MobileAppLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/mobile'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f0f2f5',
      fontFamily: 'var(--font-family, system-ui, sans-serif)',
    }}>
      {/* Top bar */}
      <header style={{
        backgroundColor: '#1a237e',
        color: '#ffffff',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: '12px',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {!isHome && (
          <button
            onClick={() => navigate('/mobile')}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '1rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: 0.9,
            }}
          >
            ← Indietro
          </button>
        )}
        <span style={{
          fontSize: '1.1rem',
          fontWeight: '600',
          flex: 1,
          textAlign: isHome ? 'center' : 'left',
        }}>
          📦 App Magazzino
        </span>
      </header>

      {/* Content */}
      <main style={{
        flex: 1,
        maxWidth: 'min(480px, 100%)',
        width: '100%',
        margin: '0 auto',
        paddingTop: '20px',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        boxSizing: 'border-box',
      }}>
        {children}
      </main>
    </div>
  )
}

export default MobileAppLayout
