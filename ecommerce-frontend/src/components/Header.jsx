import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import SearchBar from './SearchBar.jsx';
import { useCart } from '../hooks/useCart';
import { CartDrawer } from './CartDrawer';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { totalItems } = useCart();

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
        </div>
      </nav>
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
}
