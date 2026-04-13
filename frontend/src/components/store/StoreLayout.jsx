import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { storeAPI } from '../../api/store'

// ─── SVG Social Icons ────────────────────────────────────────────────────────

function IconFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function IconInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function IconTikTok() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.84 4.84 0 0 1-1.01-.08z" />
    </svg>
  )
}

function IconTwitch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  )
}

function IconYouTube() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#fff" />
    </svg>
  )
}

function IconEbay() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <text x="2" y="18" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="18">e</text>
    </svg>
  )
}

// ─── Footer Component ─────────────────────────────────────────────────────────

function StoreFooter() {
  const [footerPages, setFooterPages] = useState([])
  const [storeSettings, setStoreSettings] = useState(null)

  useEffect(() => {
    storeAPI.getFooterPages()
      .then(res => setFooterPages(res.data || []))
      .catch(() => {})
    storeAPI.getStoreSettings()
      .then(res => setStoreSettings(res.data))
      .catch(() => {})
  }, [])

  const bySection = (section) =>
    footerPages.filter(p => p.sezione === section).sort((a, b) => a.ordine - b.ordine)

  const socialLinks = [
    { key: 'facebook', url: storeSettings?.social_facebook_url, label: 'Facebook', Icon: IconFacebook },
    { key: 'instagram', url: storeSettings?.social_instagram_url, label: 'Instagram', Icon: IconInstagram },
    { key: 'tiktok', url: storeSettings?.social_tiktok_url, label: 'TikTok', Icon: IconTikTok },
    { key: 'twitch', url: storeSettings?.social_twitch_url, label: 'Twitch', Icon: IconTwitch },
    { key: 'youtube', url: storeSettings?.social_youtube_url, label: 'YouTube', Icon: IconYouTube },
    { key: 'ebay', url: storeSettings?.social_ebay_url, label: 'eBay', Icon: IconEbay },
  ].filter(s => s.url)

  const footerBg = '#0f2e3d'
  const footerText = 'rgba(255,255,255,0.85)'
  const footerMuted = 'rgba(255,255,255,0.5)'
  const footerLink = 'rgba(255,255,255,0.75)'
  const footerLinkHover = '#fff'
  const colTitleStyle = {
    fontSize: '13px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#fff',
    marginBottom: '16px',
  }
  const linkStyle = {
    display: 'block',
    color: footerLink,
    textDecoration: 'none',
    fontSize: '13px',
    lineHeight: '1.6',
    marginBottom: '6px',
    transition: 'color 150ms ease',
  }

  const servizioPages = bySection('servizio')

  return (
    <footer style={{ backgroundColor: footerBg, color: footerText, marginTop: '48px' }}>
      {/* Main 4-column area */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '48px 24px 32px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '40px',
      }}>

        {/* Col 1 — Informative */}
        <div>
          <div style={colTitleStyle}>Informative</div>
          {bySection('informative').map(p => (
            <Link key={p.slug} to={`/store/pagina/${p.slug}`} style={linkStyle}
              onMouseEnter={e => { e.target.style.color = footerLinkHover }}
              onMouseLeave={e => { e.target.style.color = footerLink }}>
              {p.titolo}
            </Link>
          ))}
        </div>

        {/* Col 2 — Scopri + Social */}
        <div>
          <div style={colTitleStyle}>Scopri Fantasia</div>
          {bySection('scopri').map(p => (
            <Link key={p.slug} to={`/store/pagina/${p.slug}`} style={linkStyle}
              onMouseEnter={e => { e.target.style.color = footerLinkHover }}
              onMouseLeave={e => { e.target.style.color = footerLink }}>
              {p.titolo}
            </Link>
          ))}

          {socialLinks.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
              {socialLinks.map(({ key, url, label, Icon }) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    textDecoration: 'none',
                    transition: 'background-color 150ms ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.30)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)' }}
                >
                  <Icon />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Col 3 — Il Tuo Account */}
        <div>
          <div style={colTitleStyle}>Il Tuo Account</div>
          {bySection('account').map(p => (
            <Link key={p.slug} to={`/store/pagina/${p.slug}`} style={linkStyle}
              onMouseEnter={e => { e.target.style.color = footerLinkHover }}
              onMouseLeave={e => { e.target.style.color = footerLink }}>
              {p.titolo}
            </Link>
          ))}
        </div>

        {/* Col 4 — Servizio Clienti */}
        <div>
          <div style={colTitleStyle}>Servizio Clienti</div>
          <p style={{ fontSize: '13px', color: footerMuted, lineHeight: '1.6', marginBottom: '10px' }}>
            Da Lunedì a Venerdì<br />09:00–12:00 // 13:00–17:00
          </p>
          {servizioPages.map(p => (
            <Link key={p.slug} to={`/store/pagina/${p.slug}`} style={linkStyle}
              onMouseEnter={e => { e.target.style.color = footerLinkHover }}
              onMouseLeave={e => { e.target.style.color = footerLink }}>
              {p.titolo}
            </Link>
          ))}
          <a href="mailto:servizioclienti@fantasiastore.it" style={{ ...linkStyle, marginTop: '6px' }}
            onMouseEnter={e => { e.target.style.color = footerLinkHover }}
            onMouseLeave={e => { e.target.style.color = footerLink }}>
            servizioclienti@fantasiastore.it
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '12px',
        color: footerMuted,
      }}>
        © {new Date().getFullYear()} {storeSettings?.store_nome || 'TCG Store'} — Tutti i diritti riservati
      </div>
    </footer>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function StoreLayout({ children }) {
  const { totalItems } = useCart()
  const { lang, setLanguage, t } = useLanguage()
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
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <Link to="/store" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '22px' }}>🃏</span>
          <span style={{ fontWeight: '800', fontSize: '18px', color: 'var(--color-text)' }}>TCG Store</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Language switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginRight: '8px' }}>
            <button
              onClick={() => setLanguage('it')}
              title="Italiano"
              style={{
                background: 'none',
                border: lang === 'it' ? '1px solid var(--color-primary)' : '1px solid transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: '13px',
                fontWeight: lang === 'it' ? '700' : '400',
                color: lang === 'it' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                transition: 'all 150ms ease',
              }}
            >
              🇮🇹 IT
            </button>
            <span style={{ color: 'var(--color-border)', fontSize: '12px' }}>|</span>
            <button
              onClick={() => setLanguage('en')}
              title="English"
              style={{
                background: 'none',
                border: lang === 'en' ? '1px solid var(--color-primary)' : '1px solid transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: '13px',
                fontWeight: lang === 'en' ? '700' : '400',
                color: lang === 'en' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                transition: 'all 150ms ease',
              }}
            >
              🇬🇧 EN
            </button>
          </div>

          <Link to="/store" style={navLinkStyle('/store')}>
            {t('nav_products')}
          </Link>
          <Link to="/store/cart" style={{
            ...navLinkStyle('/store/cart'),
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            position: 'relative',
          }}>
            <span style={{ fontSize: '18px' }}>🛒</span>
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
        minHeight: 'calc(100vh - 64px)',
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
      <StoreFooter />
    </div>
  )
}

