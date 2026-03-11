import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/analisi', label: '📈 Analisi' },
  { to: '/ordini', label: '🛒 Ordini' },
  { to: '/prodotti', label: '📦 Prodotti' },
  { to: '/clienti', label: '👥 Clienti' },
  { to: '/movimenti', label: '🔄 Movimenti' },
  { to: '/fatture', label: '🧾 Fatture' },
  { to: '/fornitori', label: '🏢 Fornitori' },
  { to: '/ubicazioni', label: '📍 Ubicazioni' },
  { to: '/categorie', label: '🏷️ Categorie' },
] 

function NavLinks({ onLinkClick }) {
  return links.map(({ to, label }) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      onClick={onLinkClick}
      style={({ isActive }) => ({
        display: 'block',
        padding: '12px 24px',
        color: isActive ? '#ffeb3b' : 'rgba(255,255,255,0.85)',
        textDecoration: 'none',
        backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
        borderLeft: isActive ? '4px solid #ffeb3b' : '4px solid transparent',
        fontWeight: isActive ? 'bold' : 'normal',
        transition: 'all 0.2s',
      })}
    >
      {label}
    </NavLink>
  ))
}

function Sidebar() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setIsOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (isMobile) {
    return (
      <>
        {/* Hamburger button */}
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Apri menu"
          style={{
            position: 'fixed',
            top: '14px',
            left: '12px',
            zIndex: 1100,
            backgroundColor: '#283593',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            width: '36px',
            height: '36px',
            fontSize: '1.3rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          ☰
        </button>

        {/* Overlay */}
        {isOpen && (
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 1099,
            }}
          />
        )}

        {/* Drawer */}
        <aside
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: '240px',
            backgroundColor: '#283593',
            zIndex: 1100,
            overflowY: 'auto',
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease',
            paddingTop: '8px',
          }}
        >
          {/* Close button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px' }}>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Chiudi menu"
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.85)',
                fontSize: '1.4rem',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
          <NavLinks onLinkClick={() => setIsOpen(false)} />
        </aside>
      </>
    )
  }

  return (
    <aside style={{
      width: '220px',
      flexShrink: 0,
      backgroundColor: '#283593',
      minHeight: 'calc(100vh - 64px)',
      padding: '16px 0',
    }}>
      <NavLinks />
    </aside>
  )
}

export default Sidebar