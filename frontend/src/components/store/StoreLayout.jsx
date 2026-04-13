import { useState, useEffect, useRef } from 'react'
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
      <path d="M3 9.5C3 7 5 5.5 8.5 5.5c3.2 0 5.5 1.3 5.5 4.5v.5H6c0 2 1.3 3 3.5 3 1.5 0 2.8-.5 3.5-1.5l2 1.5C13.8 15 11.8 16 9 16c-4 0-6-2-6-6.5zm3-1h5.5c0-1.5-1-2.5-2.8-2.5C7 6 6 7 6 8.5zm7.5 1C13.5 7 15.5 5.5 19 5.5c1.5 0 2.5.3 2.5.3v2.2S20.5 7.5 19 7.5c-2 0-3 1-3 2.5v.5h5v2H16v.5c0 1.5 1 2.5 3 2.5 1.5 0 2.5-.5 2.5-.5V17s-1 .5-2.5.5c-3.5 0-5.5-1.5-5.5-4.5V9.5z" />
    </svg>
  )
}

// ─── Footer Component ─────────────────────────────────────────────────────────

function StoreFooter() {
  const [footerPages, setFooterPages] = useState([])
  const [storeSettings, setStoreSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('store_settings_cache')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    storeAPI.getFooterPages()
      .then(res => setFooterPages(res.data || []))
      .catch(() => {})
    storeAPI.getStoreSettings()
      .then(res => {
        setStoreSettings(res.data)
        try {
          localStorage.setItem('store_settings_cache', JSON.stringify(res.data))
        } catch {}
      })
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

  const colTitleStyle = {
    fontSize: '13px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-primary)',
    marginBottom: '16px',
    borderBottom: '2px solid var(--color-primary)',
    paddingBottom: '6px',
    display: 'inline-block',
  }
  const linkStyle = {
    display: 'block',
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
    fontSize: '13px',
    lineHeight: '1.6',
    marginBottom: '6px',
    transition: 'color 150ms ease',
  }

  const servizioPages = bySection('servizio')

  return (
    <footer style={{
      backgroundColor: storeSettings?.footer_bg_color || 'var(--color-bg-elevated)',
      borderTop: '2px solid var(--color-border)',
      color: storeSettings?.footer_text_color || 'var(--color-text)',
      fontFamily: storeSettings?.footer_font_family || undefined,
      fontSize: storeSettings?.footer_font_size ? `${storeSettings.footer_font_size}px` : undefined,
      marginTop: '48px',
    }}>
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
              onMouseEnter={e => { e.target.style.color = 'var(--color-primary)' }}
              onMouseLeave={e => { e.target.style.color = 'var(--color-text-secondary)' }}>
              {p.titolo}
            </Link>
          ))}
        </div>

        {/* Col 2 — Scopri + Social */}
        <div>
          <div style={colTitleStyle}>Scopri</div>
          {bySection('scopri').map(p => (
            <Link key={p.slug} to={`/store/pagina/${p.slug}`} style={linkStyle}
              onMouseEnter={e => { e.target.style.color = 'var(--color-primary)' }}
              onMouseLeave={e => { e.target.style.color = 'var(--color-text-secondary)' }}>
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
                    backgroundColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                    textDecoration: 'none',
                    transition: 'background-color 150ms ease, color 150ms ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text)' }}
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
              onMouseEnter={e => { e.target.style.color = 'var(--color-primary)' }}
              onMouseLeave={e => { e.target.style.color = 'var(--color-text-secondary)' }}>
              {p.titolo}
            </Link>
          ))}
        </div>

        {/* Col 4 — Servizio Clienti */}
        <div>
          <div style={colTitleStyle}>Servizio Clienti</div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '10px' }}>
            Da Lunedì a Venerdì<br />09:00–12:00 // 13:00–17:00
          </p>
          {servizioPages.map(p => (
            <Link key={p.slug} to={`/store/pagina/${p.slug}`} style={linkStyle}
              onMouseEnter={e => { e.target.style.color = 'var(--color-primary)' }}
              onMouseLeave={e => { e.target.style.color = 'var(--color-text-secondary)' }}>
              {p.titolo}
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
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
  const [isWide, setIsWide] = useState(() => {
    try { return window.innerWidth >= 1200 } catch { return false }
  })
  const [storeSettings, setStoreSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('store_settings_cache')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const langMenuRef = useRef(null)

  useEffect(() => {
    storeAPI.getStoreSettings()
      .then(res => {
        setStoreSettings(res.data)
        try {
          localStorage.setItem('store_settings_cache', JSON.stringify(res.data))
        } catch {}
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!storeSettings) return

    // Aggiorna title
    if (storeSettings.store_nome) {
      document.title = storeSettings.store_nome
    }

    // Aggiorna favicon: rimuovi tutti i link icon esistenti e aggiungine uno nuovo
    if (storeSettings.store_logo_url) {
      const existingLinks = document.querySelectorAll("link[rel~='icon'], link[rel='shortcut icon']")
      existingLinks.forEach(l => l.parentNode?.removeChild(l))

      const link = document.createElement('link')
      link.rel = 'icon'
      link.type = 'image/png'
      try {
        const iconUrl = new URL(storeSettings.store_logo_url)
        iconUrl.searchParams.set('v', Date.now())
        link.href = iconUrl.toString()
      } catch {
        link.href = storeSettings.store_logo_url + '?v=' + Date.now()
      }
      document.head.appendChild(link)

      const appleLink = document.createElement('link')
      appleLink.rel = 'apple-touch-icon'
      appleLink.href = storeSettings.store_logo_url
      document.head.appendChild(appleLink)
    }
  }, [storeSettings])

  useEffect(() => {
    storeAPI.getBannersPublici()
      .then(res => {
        const all = res.data || []
        setSideBanners(all.filter(b => b.posizione === 'sidebar_left' || b.posizione === 'sidebar_right' || b.posizione === 'sidebar_both'))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const MIN_WIDTH = 1200
    function handleResize() {
      setIsWide(window.innerWidth >= MIN_WIDTH)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangMenuOpen(false)
      }
    }
    if (langMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [langMenuOpen])

  const leftBanners = sideBanners.filter(b => (b.posizione === 'sidebar_left' || b.posizione === 'sidebar_both') && b.immagine_url)
  const rightBanners = sideBanners.filter(b => (b.posizione === 'sidebar_right' || b.posizione === 'sidebar_both') && b.immagine_url)
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
      color: 'var(--color-text)',
      fontFamily: 'var(--font-family)',
      ...(storeSettings?.store_sfondo_url ? {
        backgroundImage: `url(${storeSettings.store_sfondo_url})`,
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center',
        backgroundColor: 'transparent',
      } : {
        backgroundColor: 'var(--color-bg)',
      }),
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
          {storeSettings?.store_logo_url ? (
            <img
              src={storeSettings.store_logo_url}
              alt={storeSettings.store_nome || 'Store'}
              style={{ height: '36px', maxWidth: '120px', objectFit: 'contain', borderRadius: '4px' }}
              onError={e => { e.target.style.display = 'none' }}
            />
          ) : null}
          <span style={{ fontWeight: '800', fontSize: '18px', color: 'var(--color-text)' }}>
            {storeSettings?.store_nome || 'TCG Store'}
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Language dropdown */}
          <div ref={langMenuRef} style={{ position: 'relative', marginRight: '8px' }}>
            <button
              onClick={() => setLangMenuOpen(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'var(--color-text)',
              }}
            >
              <span>{lang === 'it' ? '🇮🇹' : '🇬🇧'}</span>
              <span style={{ fontWeight: '600' }}>{lang.toUpperCase()}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {langMenuOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                zIndex: 200,
                overflow: 'hidden', minWidth: '120px',
              }}>
                {[{code:'it', label:'Italiano', flag:'🇮🇹'}, {code:'en', label:'English', flag:'🇬🇧'}].map(l => (
                  <button key={l.code} onClick={() => { setLanguage(l.code); setLangMenuOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      width: '100%', padding: '10px 14px', background: 'none',
                      border: 'none', cursor: 'pointer', fontSize: '13px',
                      color: lang === l.code ? 'var(--color-primary)' : 'var(--color-text)',
                      fontWeight: lang === l.code ? '700' : '400',
                    }}
                  >
                    <span>{l.flag}</span> <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
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
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {totalItems > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  borderRadius: '999px',
                  padding: '1px 5px',
                  fontSize: '10px',
                  fontWeight: '700',
                  lineHeight: '1.4',
                  minWidth: '16px',
                  textAlign: 'center',
                }}>
                  {totalItems}
                </span>
              )}
            </span>
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
                  style={{ width: '100%', borderRadius: '8px', display: 'block', minHeight: '100px', objectFit: 'cover' }}
                  onError={e => { e.target.closest('a').style.display = 'none' }}
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
                  style={{ width: '100%', borderRadius: '8px', display: 'block', minHeight: '100px', objectFit: 'cover' }}
                  onError={e => { e.target.closest('a').style.display = 'none' }}
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

