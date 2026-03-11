import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (isMobile) {
    const iconBtnStyle = {
      backgroundColor: 'rgba(255,255,255,0.15)',
      color: 'white',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '6px',
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.1rem',
      cursor: 'pointer',
      textDecoration: 'none',
      flexShrink: 0,
    }

    return (
      <nav style={{
        backgroundColor: '#1a237e',
        color: 'white',
        padding: '0 12px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        position: 'relative',
      }}>
        {/* Left: hamburger */}
        <button onClick={onMenuClick} aria-label="Apri menu" style={iconBtnStyle}>☰</button>

        {/* Center: title */}
        <span style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontWeight: 'bold',
          fontSize: '1.1rem',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          🏭 Gestione Magazzino
        </span>

        {/* Right: icon-only buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {user && (
            <Link to="/profilo" aria-label="Profilo" style={iconBtnStyle}>⚙️</Link>
          )}
          {user && (
            <button onClick={handleLogout} aria-label="Logout" style={iconBtnStyle}>🚪</button>
          )}
        </div>
      </nav>
    )
  }

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
      <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', fontSize: '1.4rem', fontWeight: 'bold' }}>
        🏭 Gestione Magazzino
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user && (
          <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>
            👤 {user.username}
          </span>
        )}
        {user && (
          <Link
            to="/profilo"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 600,
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '6px',
              padding: '6px 14px',
            }}
          >
            ⚙️ Profilo
          </Link>
        )}
        {user ? (
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '6px',
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            🚪 Logout
          </button>
        ) : (
          <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>v1.0.0</span>
        )}
      </div>
    </nav>
  )
}

export default Navbar
