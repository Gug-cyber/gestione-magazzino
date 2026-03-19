import { useNavigate, useLocation } from 'react-router-dom'

function MobileAppLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/mobile' || location.pathname === '/app'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f0f2f5',
      fontFamily: 'var(--font-family, system-ui, sans-serif)',
    }}>
      {/* Top bar — rispetta la safe area in alto (notch / Dynamic Island / barra di stato) */}
      <header style={{
        backgroundColor: '#1a237e',
        color: '#ffffff',
        paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
        paddingBottom: '12px',
        paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 16px))',
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
            onClick={() => navigate(location.pathname.startsWith('/app/') ? '/app' : '/mobile')}
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
              minHeight: '44px',
              minWidth: '44px',
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
        maxWidth: '480px',
        width: '100%',
        margin: '0 auto',
        paddingTop: '20px',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
        paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 16px))',
        boxSizing: 'border-box',
      }}>
        {children}
      </main>
    </div>
  )
}

export default MobileAppLayout
