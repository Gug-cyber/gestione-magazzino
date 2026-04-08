import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { storeAPI } from '../../api/store'

export default function StoreLayout({ children }) {
  const { totalItems } = useCart()
  const location = useLocation()
  const [sideBanners, setSideBanners] = useState([])
  const [isWide, setIsWide] = useState(() => window.innerWidth >= 1500)

  useEffect(() => {
    storeAPI.getBannersPublici()
      .then(res => {
        const all = res.data || []
        setSideBanners(all.filter(b => b.posizione === 'sidebar_left' || b.posizione === 'sidebar_right' || b.posizione === 'sidebar_both'))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const MIN_WIDTH = 1500
    function handleResize() {
      setIsWide(window.innerWidth >= MIN_WIDTH)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const leftBanners = sideBanners.filter(b => b.posizione === 'sidebar_left' || b.posizione === 'sidebar_both')
  const rightBanners = sideBanners.filter(b => b.posizione === 'sidebar_right' || b.posizione === 'sidebar_both')
  const showSidebars = isWide && (leftBanners.length > 0 || rightBanners.length > 0)

  const navLinkStyle = (path) => ({
    color: location.pathname === path ? 'var(--color-primary)' : 'var(--color-text-secondary)',
    textDecoration: 'none',
    fontWeight: location.pathname === path ? '600' : '400',
    fontSize: '14px',
    padding: '6px 10px',
    borderRadius: '6px',
    transition: 'color 150ms ease',
  })

  const sidebarStyle = {
    width: '160px',
    flexShrink: 0,
    padding: '16px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    position: 'sticky',
    top: '72px',
    alignSelf: 'flex-start',
  }

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

      {/* Body: sidebar sinistra + contenuto principale + sidebar destra */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        minHeight: 'calc(100vh - 56px)',
      }}>
        {/* Colonna banner sinistra */}
        {showSidebars && leftBanners.length > 0 && (
          <aside style={sidebarStyle}>
            {leftBanners.map(b => (
              <a key={b.id} href={b.link_url || '#'} target="_blank" rel="noopener noreferrer">
                <img
                  src={b.immagine_url}
                  alt={b.titolo}
                  style={{ width: '100%', borderRadius: '8px', display: 'block' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              </a>
            ))}
          </aside>
        )}

        {/* Contenuto principale */}
        <main style={{ flex: 1, minWidth: 0, padding: 'clamp(16px, 3vw, 32px)', maxWidth: '1200px', margin: showSidebars ? '0' : '0 auto' }}>
          {children}
        </main>

        {/* Colonna banner destra */}
        {showSidebars && rightBanners.length > 0 && (
          <aside style={sidebarStyle}>
            {rightBanners.map(b => (
              <a key={b.id} href={b.link_url || '#'} target="_blank" rel="noopener noreferrer">
                <img
                  src={b.immagine_url}
                  alt={b.titolo}
                  style={{ width: '100%', borderRadius: '8px', display: 'block' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              </a>
            ))}
          </aside>
        )}
      </div>

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

