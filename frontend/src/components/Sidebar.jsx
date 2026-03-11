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

function Sidebar({ isOpen, onClose }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        {isOpen && (
          <div
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 1099,
            }}
          />
        )}

        {/* Drawer — starts below the navbar */}
        <aside
          style={{
            position: 'fixed',
            top: '64px',
            left: 0,
            bottom: 0,
            width: '240px',
            backgroundColor: '#283593',
            zIndex: 1100,
            overflowY: 'auto',
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease',
          }}
        >
          <NavLinks onLinkClick={onClose} />
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