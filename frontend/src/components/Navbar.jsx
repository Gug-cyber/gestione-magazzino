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

  const navStyle = {
    background: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    paddingTop: 'env(safe-area-inset-top, 0px)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  }

  const iconBtnStyle = {
    backgroundColor: 'var(--color-surface-hover)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    cursor: 'pointer',
    textDecoration: 'none',
    flexShrink: 0,
    transition: 'all 150ms ease',
  }

  const iconBtnHoverStyle = {
    backgroundColor: 'var(--color-surface-active)',
    color: 'var(--color-text)',
    borderColor: 'var(--color-border-hover)',
  }

  const IconButton = ({ onClick, to, ariaLabel, children }) => {
    const [isHovered, setIsHovered] = useState(false)
    const style = { ...iconBtnStyle, ...(isHovered ? iconBtnHoverStyle : {}) }
    
    if (to) {
      return (
        <Link
          to={to}
          aria-label={ariaLabel}
          style={style}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {children}
        </Link>
      )
    }
    
    return (
      <button
        onClick={onClick}
        aria-label={ariaLabel}
        style={style}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </button>
    )
  }

  // Icons as SVG for cleaner look
  const MenuIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )

  const SettingsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )

  const LogoutIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )

  const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )

  if (isMobile) {
    return (
      <nav style={navStyle}>
        <div style={{
          height: '56px',
          paddingLeft: '12px',
          paddingRight: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}>
          <IconButton onClick={onMenuClick} ariaLabel="Apri menu">
            <MenuIcon />
          </IconButton>

          <span style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontWeight: '600',
            fontSize: '1rem',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--color-text)',
          }}>
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Logo" 
                style={{ 
                  height: '32px', 
                  width: 'auto', 
                  objectFit: 'contain', 
                  borderRadius: '6px' 
                }} 
              />
            )}
            <span>{portalTitle}</span>
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            {user && (
              <IconButton to="/profilo" ariaLabel="Profilo">
                <SettingsIcon />
              </IconButton>
            )}
            {user && (
              <IconButton onClick={handleLogout} ariaLabel="Logout">
                <LogoutIcon />
              </IconButton>
            )}
          </div>
        </div>
      </nav>
    )
  }

  // Desktop button component
  const NavButton = ({ onClick, to, children, variant = 'secondary' }) => {
    const [isHovered, setIsHovered] = useState(false)
    
    const baseStyle = {
      borderRadius: '8px',
      padding: '0 16px',
      height: '36px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      textDecoration: 'none',
      transition: 'all 150ms ease',
      border: '1px solid var(--color-border)',
      backgroundColor: isHovered ? 'var(--color-surface-hover)' : 'var(--color-surface)',
      color: 'var(--color-text-secondary)',
    }

    if (variant === 'danger' && isHovered) {
      baseStyle.borderColor = 'var(--color-danger-border)'
      baseStyle.backgroundColor = 'var(--color-danger-bg)'
      baseStyle.color = '#f87171'
    } else if (isHovered) {
      baseStyle.borderColor = 'var(--color-border-hover)'
      baseStyle.color = 'var(--color-text)'
    }

    const props = {
      style: baseStyle,
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
    }

    if (to) {
      return <Link to={to} {...props}>{children}</Link>
    }
    return <button onClick={onClick} {...props}>{children}</button>
  }

  return (
    <nav style={{
      ...navStyle,
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Link 
        to="/dashboard" 
        style={{ 
          color: 'var(--color-text)', 
          textDecoration: 'none', 
          fontSize: '1.25rem', 
          fontWeight: '600', 
          letterSpacing: '-0.02em', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
        }}
      >
        {logoUrl && (
          <img 
            src={logoUrl} 
            alt="Logo" 
            style={{ 
              height: '36px', 
              width: 'auto', 
              objectFit: 'contain', 
              borderRadius: '6px' 
            }} 
          />
        )}
        <span className="gradient-text">{portalTitle}</span>
      </Link>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-surface-hover)',
            border: '1px solid var(--color-border)',
          }}>
            <UserIcon />
            <span style={{ 
              fontSize: '13px', 
              color: 'var(--color-text-secondary)',
              fontWeight: '500',
            }}>
              {user.username}
            </span>
          </div>
        )}
        {user && (
          <NavButton to="/profilo">
            <SettingsIcon />
            <span>Profilo</span>
          </NavButton>
        )}
        {user ? (
          <NavButton onClick={handleLogout} variant="danger">
            <LogoutIcon />
            <span>Logout</span>
          </NavButton>
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>v1.0.0</span>
        )}
      </div>
    </nav>
  )
}

export default Navbar
