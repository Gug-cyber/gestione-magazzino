import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'


const BASE_SECTIONS = [
  {
    label: '📊 Panoramica',
    links: [
      { to: '/', label: '📊 Dashboard', end: true },
      { to: '/analisi', label: '📈 Analisi' },
    ],
  },
  {
    label: '📦 Catalogo',
    links: [
      { to: '/prodotti', label: '📦 Prodotti' },
      { to: '/categorie', label: '🏷️ Categorie' },
      { to: '/ubicazioni', label: '📍 Ubicazioni' },
    ],
  },
  {
    label: '🛒 Vendite',
    links: [
      { to: '/ordini', label: '🛒 Ordini' },
      { to: '/clienti', label: '👥 Clienti' },
      { to: '/fatture', label: '🧾 Fatture' },
    ],
  },
  {
    label: '🚚 Acquisti',
    links: [
      { to: '/fornitori', label: '🏢 Fornitori' },
      { to: '/forniture', label: '🚚 Forniture' },
      { to: '/forniture/nuova', label: '➕ Nuova Fornitura' },
    ],
  },
  {
    label: '🏭 Magazzino',
    links: [
      { to: '/movimenti', label: '🔄 Movimenti' },
      { to: '/scanner', label: '📷 Scanner Barcode' },
    ],
  },
]

const SISTEMA_LINKS_BASE = [
  { to: '/profilo', label: '👤 Profilo' },
  { to: '/cardtrader', label: '🃏 CardTrader' },
]

function NavLinks({ onLinkClick }) {
  const { user } = useAuth()
  const [hoveredTo, setHoveredTo] = useState(null)

  const sistemaLinks = user?.is_admin
    ? [{ to: '/amministrazione', label: '⚙️ Amministrazione' }, ...SISTEMA_LINKS_BASE]
    : SISTEMA_LINKS_BASE

  const sections = [
    ...BASE_SECTIONS,
    { label: '⚙️ Sistema', links: sistemaLinks },
  ]

  const [openSections, setOpenSections] = useState(() => sections.map(() => false))

  const toggleSection = (index) => {
    setOpenSections(prev => prev.map((open, i) => i === index ? !open : open))
  }

  return (
    <div>
      {sections.map((section, idx) => (
        <div key={section.label} style={{ marginBottom: 2 }}>
          <button
            onClick={() => toggleSection(idx)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '12px 16px 4px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.68rem',
              fontWeight: '700',
              letterSpacing: '0.1em',
              color: '#94a3b8',
              textTransform: 'uppercase',
              userSelect: 'none',
            }}
          >
            <span>{section.label}</span>
            <span style={{
              fontSize: '0.8rem',
              transition: 'transform 0.2s',
              transform: openSections[idx] ? 'rotate(90deg)' : 'rotate(0deg)',
              color: '#64748b',
            }}>›</span>
          </button>

          <div style={{
            overflow: 'hidden',
            maxHeight: openSections[idx] ? '1000px' : '0px',
            transition: 'max-height 0.25s ease',
          }}>
            {section.links.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onLinkClick}
                onMouseEnter={() => setHoveredTo(to)}
                onMouseLeave={() => setHoveredTo(null)}
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '9px 16px 9px 20px',
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.72)',
                  textDecoration: 'none',
                  backgroundColor: isActive
                    ? 'rgba(99,102,241,0.35)'
                    : hoveredTo === to
                      ? 'rgba(255,255,255,0.07)'
                      : 'transparent',
                  borderLeft: isActive ? '3px solid #818cf8' : '3px solid transparent',
                  borderRadius: '0 8px 8px 0',
                  marginRight: '8px',
                  fontWeight: isActive ? '600' : '400',
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease',
                })}
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
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
            backgroundColor: '#1e1b4b',
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
      backgroundColor: '#1e1b4b',
      borderRight: '1px solid rgba(255,255,255,0.04)',
      boxShadow: '2px 0 8px rgba(0,0,0,0.12)',
      minHeight: 'calc(100vh - 64px)',
      padding: '16px 0',
    }}>
      <NavLinks />
    </aside>
  )
}

export default Sidebar