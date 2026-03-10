import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <nav style={{
      backgroundColor: '#1a237e',
      color: 'white',
      padding: '0 24px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    }}>
      <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '1.4rem', fontWeight: 'bold' }}>
        🏭 Gestione Magazzino
      </Link>
      <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>v1.0.0</span>
    </nav>
  )
}

export default Navbar
