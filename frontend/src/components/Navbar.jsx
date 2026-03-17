import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useLogoSettings from '../hooks/useLogoSettings'

function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const { logoUrl, portalTitle } = useLogoSettings()

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
      backgroundColor: 'rgba(255,255,255,0.12)',
      color: 'white',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '8px',
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
        background: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 100%)',
        color: 'white',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 1px 3px rgba(0,0,0,0.15), 0 4px 12px rgba(79,70,229,0.2)',
      }}>
        {/* Inner row with fixed height for the actual controls */}
        <div style={{
          height: '64px',
          paddingLeft: '12px',
          paddingRight: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}>
          {/* Left: hamburger */}
          <button onClick={onMenuClick} aria-label="Apri menu" style={iconBtnStyle}>☰</button>

          {/* Center: logo/title */}
          <span style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontWeight: '600',
            fontSize: '1.1rem',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />}
            <span>{portalTitle}</span>
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
        </div>
      </nav>
    )
  }

  return (
    <nav style={{
      background: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 100%)',
      color: 'white',
      padding: '0 24px',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      minHeight: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 1px 3px rgba(0,0,0,0.15), 0 4px 12px rgba(79,70,229,0.2)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
    }}>
      <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', fontSize: '1.4rem', fontWeight: '600', letterSpacing: '0.01em', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain', borderRadius: '4px' }} />}
        <span>{portalTitle}</span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user && (
          <span style={{ fontSize: '0.875rem', opacity: 0.85 }}>
            👤 {user.username}
          </span>
        )}
        {user && (
          <Link
            to="/profilo"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              padding: '0 14px',
              height: '36px',
              display: 'inline-flex',
              alignItems: 'center',
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
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              padding: '0 14px',
              height: '36px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🚪 Logout
          </button>
        ) : (
          <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>v1.0.0</span>
        )}
      </div>
    </nav>
  )
}

export default Navbar
