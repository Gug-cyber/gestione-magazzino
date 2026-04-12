import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Icons as clean SVG components
const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  Analytics: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Package: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Tag: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  MapPin: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  ShoppingCart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  FileText: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>
  ),
  Building: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </svg>
  ),
  Truck: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16,8 20,8 23,11 23,16 16,16 16,8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  Plus: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Refresh: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23,4 23,10 17,10" />
      <polyline points="1,20 1,14 7,14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Camera: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  User: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  CreditCard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  List: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,18 15,12 9,6" />
    </svg>
  ),
  Sliders: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  ),
  PieChart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  ),
}

const BASE_SECTIONS = [
  {
    label: 'Panoramica',
    links: [
      { to: '/', label: 'Dashboard', icon: 'Dashboard', end: true },
      { to: '/analisi', label: 'Analisi', icon: 'Analytics' },
      { to: '/statistiche', label: 'Report & Statistiche', icon: 'PieChart' },
    ],
  },
  {
    label: 'Catalogo',
    links: [
      { to: '/prodotti', label: 'Prodotti', icon: 'Package' },
      { to: '/categorie', label: 'Categorie', icon: 'Tag' },
      { to: '/ubicazioni', label: 'Ubicazioni', icon: 'MapPin' },
    ],
  },
  {
    label: 'Vendite',
    links: [
      { to: '/ordini', label: 'Ordini', icon: 'ShoppingCart' },
      { to: '/clienti', label: 'Clienti', icon: 'Users' },
      { to: '/fatture', label: 'Fatture', icon: 'FileText' },
    ],
  },
  {
    label: 'Acquisti',
    links: [
      { to: '/fornitori', label: 'Fornitori', icon: 'Building' },
      { to: '/forniture', label: 'Forniture', icon: 'Truck' },
    ],
  },
  {
    label: 'Magazzino',
    links: [
      { to: '/movimenti', label: 'Movimenti', icon: 'Refresh' },
    ],
  },
  {
    label: 'Negozio',
    links: [
      { to: '/store', label: 'Store Pubblico', icon: 'ShoppingCart', external: true },
    ],
  },
]

const SISTEMA_LINKS_BASE = [
  { to: '/profilo', label: 'Profilo', icon: 'User' },
  { to: '/cardtrader', label: 'CardTrader', icon: 'CreditCard' },
]

function NavLinks({ onLinkClick }) {
  const { user } = useAuth()
  const [hoveredTo, setHoveredTo] = useState(null)

  const sistemaLinks = user?.is_admin
    ? [
        { to: '/amministrazione', label: 'Amministrazione', icon: 'Settings' }, 
        { to: '/control-panel', label: 'Control Panel', icon: 'Sliders' }, 
        { to: '/activity-log', label: 'Log Attivita', icon: 'List' }, 
        ...SISTEMA_LINKS_BASE
      ]
    : SISTEMA_LINKS_BASE

  const sections = [
    ...BASE_SECTIONS,
    { label: 'Sistema', links: sistemaLinks },
  ]

  const [openSections, setOpenSections] = useState(() => sections.map(() => true))

  const toggleSection = (index) => {
    setOpenSections(prev => prev.map((open, i) => i === index ? !open : open))
  }

  const renderIcon = (iconName) => {
    const IconComponent = Icons[iconName]
    return IconComponent ? <IconComponent /> : null
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {sections.map((section, idx) => (
        <div key={section.label} style={{ marginBottom: '4px' }}>
          <button
            onClick={() => toggleSection(idx)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              userSelect: 'none',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
          >
            <span>{section.label}</span>
            <span style={{
              transition: 'transform 200ms ease',
              transform: openSections[idx] ? 'rotate(90deg)' : 'rotate(0deg)',
              display: 'flex',
              alignItems: 'center',
            }}>
              <Icons.ChevronRight />
            </span>
          </button>

          <div style={{
            overflow: 'hidden',
            maxHeight: openSections[idx] ? '500px' : '0px',
            transition: 'max-height 250ms ease',
          }}>
            {section.links.map(({ to, label, icon, end, external }) => (
              external ? (
                <a
                  key={to}
                  href={to}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onLinkClick}
                  onMouseEnter={() => setHoveredTo(to)}
                  onMouseLeave={() => setHoveredTo(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 16px',
                    marginLeft: '8px',
                    marginRight: '8px',
                    marginBottom: '2px',
                    color: 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    backgroundColor: hoveredTo === to ? 'var(--color-surface-hover)' : 'transparent',
                    borderRadius: '8px',
                    fontWeight: '400',
                    fontSize: '14px',
                    transition: 'all 150ms ease',
                    borderLeft: '2px solid transparent',
                  }}
                >
                  <span style={{ opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'inherit' }}>
                    {renderIcon(icon)}
                  </span>
                  <span>{label}</span>
                  <span style={{ fontSize: '11px', opacity: 0.5, marginLeft: 'auto' }}>↗</span>
                </a>
              ) : (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onLinkClick}
                onMouseEnter={() => setHoveredTo(to)}
                onMouseLeave={() => setHoveredTo(null)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  marginLeft: '8px',
                  marginRight: '8px',
                  marginBottom: '2px',
                  color: isActive ? 'var(--color-text)' : 'var(--color-text-secondary)',
                  textDecoration: 'none',
                  backgroundColor: isActive
                    ? 'var(--color-primary-glow)'
                    : hoveredTo === to
                      ? 'var(--color-surface-hover)'
                      : 'transparent',
                  borderRadius: '8px',
                  fontWeight: isActive ? '500' : '400',
                  fontSize: '14px',
                  transition: 'all 150ms ease',
                  borderLeft: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                })}
              >
                <span style={{ 
                  opacity: 0.8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: 'inherit',
                }}>
                  {renderIcon(icon)}
                </span>
                <span>{label}</span>
              </NavLink>
              )
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

  const sidebarStyle = {
    backgroundColor: 'var(--color-surface)',
    borderRight: '1px solid var(--color-border)',
  }

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
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 1099,
              transition: 'opacity 200ms ease',
            }}
          />
        )}

        {/* Drawer */}
        <aside
          style={{
            ...sidebarStyle,
            position: 'fixed',
            top: '56px',
            left: 0,
            bottom: 0,
            width: '260px',
            zIndex: 1100,
            overflowY: 'auto',
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isOpen ? '4px 0 24px rgba(0, 0, 0, 0.3)' : 'none',
          }}
        >
          <NavLinks onLinkClick={onClose} />
        </aside>
      </>
    )
  }

  return (
    <aside style={{
      ...sidebarStyle,
      width: '240px',
      flexShrink: 0,
      minHeight: 'calc(100vh - 60px)',
      overflowY: 'auto',
    }}>
      <NavLinks />
    </aside>
  )
}

export default Sidebar
