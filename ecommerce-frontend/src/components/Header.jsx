import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import SearchBar from './SearchBar.jsx';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { CartDrawer } from './CartDrawer';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { totalItems } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const accountRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    }
    if (accountOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [accountOpen]);

  function handleLogout() {
    logout();
    setAccountOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  }

  const handleSearch = (value) => {
    navigate(`/catalogo?q=${encodeURIComponent(value)}`);
  };

  const isActive = (path) => {
    if (path === '/catalogo') {
      return location.pathname === '/catalogo' || location.pathname.startsWith('/product');
    }
    return location.pathname === path;
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <span className="header-logo-icon">TC</span>
          TCG Store
        </Link>

        <SearchBar onSearch={handleSearch} />

        <nav className="header-nav">
          <Link 
            to="/" 
            className={isActive('/') ? 'active' : ''}
          >
            Home
          </Link>
          <Link 
            to="/catalogo"
            className={isActive('/catalogo') ? 'active' : ''}
          >
            Catalogo
          </Link>
          <Link 
            to="/pagina/chi-siamo"
            className={isActive('/pagina/chi-siamo') ? 'active' : ''}
          >
            Chi siamo
          </Link>
        </nav>

        <button className="header-cart" aria-label="Carrello" onClick={() => setCartOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          {totalItems > 0 && (
            <span className="header-cart-badge">{totalItems}</span>
          )}
        </button>

        {/* Account Button */}
        {isAuthenticated ? (
          <div ref={accountRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setAccountOpen(!accountOpen)}
              aria-label="Account"
              aria-expanded={accountOpen}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                background: accountOpen ? 'var(--color-accent-subtle)' : 'var(--color-surface-elevated)',
                border: `1px solid ${accountOpen ? 'var(--color-accent)' : 'var(--color-border)'}`,
                color: accountOpen ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>

            {/* Dropdown */}
            {accountOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 220,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 120,
                  overflow: 'hidden',
                }}
              >
                {/* User info */}
                <div
                  style={{
                    padding: 'var(--spacing-md)',
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-surface-elevated)',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {user.username}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </p>
                </div>

                {/* Links */}
                <div style={{ padding: 'var(--spacing-sm)' }}>
                  <Link
                    to="/account"
                    onClick={() => setAccountOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)',
                      padding: '10px var(--spacing-sm)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 14,
                      color: 'var(--color-text-secondary)',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Il mio account
                  </Link>
                  <Link
                    to="/ordini"
                    onClick={() => setAccountOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)',
                      padding: '10px var(--spacing-sm)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 14,
                      color: 'var(--color-text-secondary)',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                    I miei ordini
                  </Link>

                  <div style={{ margin: 'var(--spacing-xs) 0', borderTop: '1px solid var(--color-border)' }} />

                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)',
                      width: '100%',
                      padding: '10px var(--spacing-sm)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 14,
                      color: 'var(--color-error)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Esci
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              padding: '8px 14px',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              transition: 'all var(--transition-fast)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Accedi
          </Link>
        )}

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 150
          }}
        />
      )}

      {/* Mobile Menu */}
      <nav 
        className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '280px',
          maxWidth: '80vw',
          background: 'var(--color-surface)',
          zIndex: 151,
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--spacing-lg)'
        }}
      >
        <button 
          onClick={() => setMobileMenuOpen(false)}
          style={{
            alignSelf: 'flex-end',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: 'var(--spacing-sm)'
          }}
          aria-label="Chiudi menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
          <Link 
            to="/" 
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              color: isActive('/') ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              background: isActive('/') ? 'var(--color-accent-subtle)' : 'transparent',
              fontWeight: 500
            }}
          >
            Home
          </Link>
          <Link 
            to="/catalogo"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              color: isActive('/catalogo') ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              background: isActive('/catalogo') ? 'var(--color-accent-subtle)' : 'transparent',
              fontWeight: 500
            }}
          >
            Catalogo
          </Link>
          <Link 
            to="/pagina/chi-siamo"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              color: isActive('/pagina/chi-siamo') ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              background: isActive('/pagina/chi-siamo') ? 'var(--color-accent-subtle)' : 'transparent',
              fontWeight: 500
            }}
          >
            Chi siamo
          </Link>

          {/* Mobile account section */}
          <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
            {isAuthenticated ? (
              <>
                <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', marginBottom: 'var(--spacing-xs)' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{user.username}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>{user.email}</p>
                </div>
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'block', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)', fontWeight: 500 }}
                >
                  Il mio account
                </Link>
                <Link
                  to="/ordini"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'block', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)', fontWeight: 500 }}
                >
                  I miei ordini
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: 'var(--spacing-md)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-error)',
                    background: 'transparent',
                    border: 'none',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: 'inherit',
                  }}
                >
                  Esci
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                style={{ display: 'block', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', color: 'var(--color-accent)', fontWeight: 500 }}
              >
                Accedi
              </Link>
            )}
          </div>
        </div>
      </nav>
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
}
