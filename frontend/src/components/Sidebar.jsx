import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/analisi', label: '📈 Analisi' },
  { to: '/prodotti', label: '📦 Prodotti' },
  { to: '/movimenti', label: '🔄 Movimenti' },
  { to: '/fornitori', label: '🏢 Fornitori' },
  { to: '/ubicazioni', label: '📍 Ubicazioni' },
  { to: '/categorie', label: '🏷️ Categorie' },
]

function Sidebar() {
  return (
    <aside style={{
      width: '220px',
      backgroundColor: '#283593',
      minHeight: 'calc(100vh - 64px)',
      padding: '16px 0',
    }}>
      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
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
      ))}
    </aside>
  )
}

export default Sidebar
