import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../../context/CartContext'

export default function StoreLayout({ children }) {
  const { totalItems } = useCart()
  const location = useLocation()

  const navLinkStyle = (path) => ({
    color: location.pathname === path ? 'var(--color-primary)' : 'var(--color-text-secondary)',
    textDecoration: 'none',
    fontWeight: location.pathname === path ? '600' : '400',
    fontSize: '14px',
    padding: '6px 10px',
    borderRadius: '6px',
    transition: 'color 150ms ease',
  })

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text)',
      fontFamily: 'var(--font-family)',
    }}>
      {/* Navbar */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--color-bg-elevated)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 24px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link to="/store" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🃏</span>
          <span style={{ fontWeight: '700', fontSize: '16px', color: 'var(--color-text)' }}>TCG Store</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link to="/store" style={navLinkStyle('/store')}>
            Prodotti
          </Link>
          <Link to="/store/cart" style={{
            ...navLinkStyle('/store/cart'),
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            position: 'relative',
          }}>
            <span style={{ fontSize: '16px' }}>🛒</span>
            <span>Carrello</span>
            {totalItems > 0 && (
              <span style={{
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                borderRadius: '999px',
                padding: '1px 6px',
                fontSize: '11px',
                fontWeight: '700',
                lineHeight: '1.4',
                minWidth: '18px',
                textAlign: 'center',
              }}>
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: '1200px', margin: '0 auto' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        fontSize: '13px',
        marginTop: '48px',
      }}>
        <p>🃏 TCG Store — Gestione Magazzino</p>
      </footer>
    </div>
  )
}
