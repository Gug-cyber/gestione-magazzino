import { useState, useEffect, useRef } from 'react'
import StoreLayout from '../../components/store/StoreLayout'
import ProductCard from '../../components/store/ProductCard'
import { storeAPI } from '../../api/store'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { trackPageView } from '../../utils/analytics'

const PAGE_LIMIT = 40

function findLabelInTree(nodes, id) {
  for (const node of nodes) {
    if (String(node.id) === id) return node.nome
    if (node.figli && node.figli.length > 0) {
      const found = findLabelInTree(node.figli, id)
      if (found) return found
    }
  }
  return null
}

function CategoryDropdown({ value, onChange, treeOptions, allLabel }) {
  const [open, setOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  const selectedLabel = value
    ? (findLabelInTree(treeOptions, value) || allLabel)
    : allLabel

  function renderNode(node, depth = 0) {
    const hasChildren = node.figli && node.figli.length > 0
    const isExpanded = expandedIds.has(String(node.id))
    const isSelected = String(node.id) === value
    const pl = 14 + depth * 16

    if (hasChildren) {
      return (
        <div key={node.id}>
          <button
            type="button"
            onClick={() => setExpandedIds(prev => {
              const next = new Set(prev)
              if (next.has(String(node.id))) {
                next.delete(String(node.id))
              } else {
                next.add(String(node.id))
              }
              return next
            })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: `9px 14px 9px ${pl}px`,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: depth === 0 ? '11px' : '13px',
              fontWeight: 600,
              textTransform: depth === 0 ? 'uppercase' : 'none',
              letterSpacing: depth === 0 ? '0.06em' : 'normal',
              color: 'var(--color-text-secondary)',
              textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <span>{node.nome}</span>
            <span style={{
              fontSize: '10px',
              opacity: 0.5,
              marginLeft: 8,
              display: 'inline-block',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.18s',
            }}>▼</span>
          </button>
          {isExpanded && node.figli.map(child => renderNode(child, depth + 1))}
        </div>
      )
    }

    return (
      <button
        key={node.id}
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={() => { onChange(String(node.id)); setOpen(false) }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: `9px 14px 9px ${pl}px`,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
          textAlign: 'left',
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        <span style={{ width: '14px', flexShrink: 0 }}>{isSelected ? '✓' : ''}</span>
        {node.nome}
      </button>
    )
  }

  return (
    <div ref={containerRef} className="store-category-dropdown" style={{ position: 'relative', flex: '1 1 160px' }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Seleziona categoria"
        onClick={() => { setExpandedIds(new Set()); setOpen(prev => !prev) }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          color: 'var(--color-text)',
          fontSize: '14px',
          cursor: 'pointer',
          outline: 'none',
          textAlign: 'left',
        }}
      >
        <span>{selectedLabel}</span>
        <span style={{ marginLeft: '8px', opacity: 0.6, fontSize: '12px' }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Categorie"
          className="store-category-dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            maxHeight: '360px',
            overflowY: 'auto',
          }}
        >
          {/* "All categories" option */}
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => { onChange(''); setOpen(false) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--color-border)',
              cursor: 'pointer',
              fontSize: '14px',
              color: !value ? 'var(--color-primary)' : 'var(--color-text)',
              textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <span style={{ width: '14px', flexShrink: 0 }}>{!value ? '✓' : ''}</span>
            {allLabel}
          </button>

          {treeOptions.map(node => renderNode(node, 0))}
        </div>
      )}
    </div>
  )
}

export default function StorePage() {
  const { addItem } = useCart()
  const { t } = useLanguage()
  const [prodotti, setProdotti] = useState([])
  const [categorieTree, setCategorieTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [disponibiliOnly, setDisponibiliOnly] = useState(false)
  const [offerteSolo, setOfferteSolo] = useState(false)
  const [flags, setFlags] = useState({})
  const [banners, setBanners] = useState([])
  const [promozioni, setPromozioni] = useState([])
  const [promozioniLoaded, setPromozioniLoaded] = useState(false)
  const [bannerIdx, setBannerIdx] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Reset pagination when API-affecting filters change (offerteSolo is client-side only)
  const prevFilters = useRef({ search, categoriaId, disponibiliOnly })
  useEffect(() => {
    const prev = prevFilters.current
    if (prev.search !== search || prev.categoriaId !== categoriaId || prev.disponibiliOnly !== disponibiliOnly) {
      prevFilters.current = { search, categoriaId, disponibiliOnly }
      setProdotti([])
      setPage(1)
      setHasMore(false)
    }
  }, [search, categoriaId, disponibiliOnly])

  useEffect(() => {
    trackPageView('/store')
  }, [])

  useEffect(() => {
    async function fetchPublic() {
      try {
        const [flagsRes, bannersRes, promosRes] = await Promise.allSettled([
          storeAPI.getFlagsPublici(),
          storeAPI.getBannersPublici(),
          storeAPI.getPromozioniAttive(),
        ])
        if (flagsRes.status === 'fulfilled') setFlags(flagsRes.value.data)
        if (bannersRes.status === 'fulfilled') setBanners((bannersRes.value.data || []).filter(b => !b.posizione || b.posizione === 'top'))
        if (promosRes.status === 'fulfilled') setPromozioni(promosRes.value.data)
        setPromozioniLoaded(true)
      } catch {
        setPromozioniLoaded(true)
      }
    }
    fetchPublic()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      if (page === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)
      try {
        const skip = (page - 1) * PAGE_LIMIT
        const prodRes = await storeAPI.getProdotti({
          search: search || undefined,
          categoria_id: categoriaId || undefined,
          include_descendants: categoriaId ? true : undefined,
          disponibili_only: disponibiliOnly,
          limit: PAGE_LIMIT,
          skip,
        })
        if (!cancelled) {
          const newProdotti = prodRes.data
          setProdotti(prev => page === 1 ? newProdotti : [...prev, ...newProdotti])
          setHasMore(newProdotti.length === PAGE_LIMIT)
        }
        if (page === 1) {
          const catRes = await storeAPI.getCategorieTree()
          if (!cancelled) setCategorieTree(catRes.data || [])
        }
      } catch (err) {
        if (!cancelled) setError('error_loading_products')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [search, categoriaId, disponibiliOnly, page])

  function handleAddToCart(prodotto) {
    const activePromos = flags.discounts_enabled !== false ? promozioni : []
    const promo = activePromos.find(p =>
      (p.prodotto_id != null && prodotto.id != null && Number(p.prodotto_id) === Number(prodotto.id)) ||
      (p.categoria_id != null && prodotto.categoria_id != null && Number(p.categoria_id) === Number(prodotto.categoria_id))
    ) || null

    const prezzoBase = prodotto.prezzo_vendita != null ? Number(prodotto.prezzo_vendita) : null
    const prezzoUnitario = promo && prezzoBase != null
      ? Math.max(0, promo.tipo === 'percentage'
          ? prezzoBase * (1 - promo.valore / 100)
          : prezzoBase - promo.valore)
      : prezzoBase

    addItem({
      ...prodotto,
      quantita_disponibile: prodotto.quantita,
      prezzo_unitario: prezzoUnitario,
    }, 1)
  }

  // Se store_enabled è esplicitamente false, mostra pagina di indisponibilità
  if (flags.store_enabled === false) {
    return (
      <StoreLayout>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🔒</p>
          <h2 style={{ color: 'var(--color-text)', margin: '0 0 8px' }}>{t('store_unavailable_title')}</h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{t('store_unavailable_msg')}</p>
        </div>
      </StoreLayout>
    )
  }

  const showBanners = flags.banners_enabled !== false && banners.length > 0

  return (
    <StoreLayout>
      <div className="animate-fade-in">
        {/* Banners con animazione */}
        {showBanners && (
          <div style={{ marginBottom: '32px', position: 'relative' }}>
            <style>{`
              @keyframes bannerSlideIn {
                from { opacity: 0; transform: scale(0.98); }
                to { opacity: 1; transform: scale(1); }
              }
            `}</style>
            <div style={{
              borderRadius: '20px',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}>
              {banners.map((b, idx) => idx === bannerIdx && (
                <div 
                  key={b.id} 
                  style={{ 
                    position: 'relative', 
                    minHeight: '160px',
                    animation: 'bannerSlideIn 0.4s ease-out',
                  }}
                >
                  {b.immagine_url && (
                    <img
                      src={b.immagine_url}
                      alt={b.titolo}
                      style={{ 
                        width: '100%', 
                        maxHeight: '320px', 
                        objectFit: 'cover', 
                        display: 'block',
                      }}
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  )}
                  {(b.titolo || b.descrizione || b.link_url) && (
                    <div style={{
                      position: b.immagine_url ? 'absolute' : 'relative',
                      bottom: b.immagine_url ? 0 : undefined,
                      left: 0, right: 0,
                      background: b.immagine_url 
                        ? 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)' 
                        : 'transparent',
                      padding: '32px 28px 24px',
                      display: 'flex', 
                      alignItems: 'flex-end', 
                      justifyContent: 'space-between', 
                      gap: '16px', 
                      flexWrap: 'wrap',
                    }}>
                      <div style={{ maxWidth: '70%' }}>
                        {b.titolo && (
                          <div style={{ 
                            fontWeight: '700', 
                            color: b.immagine_url ? '#fff' : 'var(--color-text)', 
                            fontSize: '22px',
                            textShadow: b.immagine_url ? '0 2px 4px rgba(0,0,0,0.3)' : 'none',
                            lineHeight: '1.3',
                          }}>
                            {b.titolo}
                          </div>
                        )}
                        {b.descrizione && (
                          <div style={{ 
                            color: b.immagine_url ? 'rgba(255,255,255,0.9)' : 'var(--color-text-secondary)', 
                            fontSize: '14px', 
                            marginTop: '8px',
                            lineHeight: '1.5',
                          }}>
                            {b.descrizione}
                          </div>
                        )}
                      </div>
                      {b.link_url && (
                        <a 
                          href={b.link_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            backgroundColor: 'var(--color-primary)',
                            color: '#fff',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'transform 150ms ease, box-shadow 200ms ease',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.03)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                          }}
                        >
                          {t('banner_discover')}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="m9 18 6-6-6-6"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Banner navigation arrows */}
            {banners.length > 1 && (
              <>
                <button
                  onClick={() => setBannerIdx(prev => (prev - 1 + banners.length) % banners.length)}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'transform 150ms ease, background-color 150ms ease',
                    zIndex: 2,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'
                    e.currentTarget.style.backgroundColor = '#fff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2.5">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </button>
                <button
                  onClick={() => setBannerIdx(prev => (prev + 1) % banners.length)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'transform 150ms ease, background-color 150ms ease',
                    zIndex: 2,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'
                    e.currentTarget.style.backgroundColor = '#fff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)'
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2.5">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              </>
            )}
            
            {/* Dots indicator */}
            {banners.length > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '8px', 
                marginTop: '12px',
              }}>
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setBannerIdx(idx)}
                    style={{
                      width: idx === bannerIdx ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: idx === bannerIdx ? 'var(--store-primary, #0891b2)' : 'var(--store-border, #e2e8f0)',
                      transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .store-product-grid > * {
            animation: fadeInUp 0.4s ease-out forwards;
            opacity: 0;
          }
          .store-product-grid > *:nth-child(1) { animation-delay: 0.02s; }
          .store-product-grid > *:nth-child(2) { animation-delay: 0.04s; }
          .store-product-grid > *:nth-child(3) { animation-delay: 0.06s; }
          .store-product-grid > *:nth-child(4) { animation-delay: 0.08s; }
          .store-product-grid > *:nth-child(5) { animation-delay: 0.10s; }
          .store-product-grid > *:nth-child(6) { animation-delay: 0.12s; }
          .store-product-grid > *:nth-child(7) { animation-delay: 0.14s; }
          .store-product-grid > *:nth-child(8) { animation-delay: 0.16s; }
          .store-product-grid > *:nth-child(n+9) { animation-delay: 0.18s; }
          
          @media (max-width: 640px) {
            .store-product-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 12px !important;
            }
            .store-filters {
              flex-direction: column !important;
              gap: 6px !important;
            }
            .store-filters input[type="text"] {
              flex: none !important;
              width: 100% !important;
            }
            .store-filters .store-filter-checks {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-top: 2px;
            }
            .store-filters label {
              font-size: 14px !important;
              padding: 4px 0;
            }
            .store-category-dropdown {
              width: 100% !important;
              flex: none !important;
            }
            .store-category-dropdown-menu {
              left: 0 !important;
              right: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
            }
          }
        `}</style>
        <div className="store-filters" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '28px',
          padding: '18px 22px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          <div style={{ 
            flex: '1 1 200px', 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}>
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="var(--color-text-muted)" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ 
                position: 'absolute', 
                left: '14px', 
                pointerEvents: 'none',
              }}
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder={t('filter_search_placeholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px 12px 44px',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                color: 'var(--color-text)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 200ms ease, box-shadow 200ms ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-primary)'
                e.target.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-rgb, 59, 130, 246), 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-border)'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <CategoryDropdown
            value={categoriaId}
            onChange={val => setCategoriaId(val)}
            treeOptions={categorieTree}
            allLabel={t('filter_all_categories')}
          />

          <div className="store-filter-checks" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer', 
              fontSize: '13px', 
              color: disponibiliOnly ? '#0891b2' : '#475569',
              fontWeight: disponibiliOnly ? '600' : '500',
              padding: '10px 16px',
              borderRadius: '10px',
              backgroundColor: disponibiliOnly ? 'rgba(8, 145, 178, 0.08)' : 'transparent',
              border: `1px solid ${disponibiliOnly ? '#0891b2' : '#e2e8f0'}`,
              transition: 'all 200ms ease',
            }}>
              <input
                type="checkbox"
                checked={disponibiliOnly}
                onChange={e => setDisponibiliOnly(e.target.checked)}
                style={{ display: 'none' }}
              />
              <span style={{
                width: '18px',
                height: '18px',
                borderRadius: '5px',
                border: `2px solid ${disponibiliOnly ? '#0891b2' : '#cbd5e1'}`,
                backgroundColor: disponibiliOnly ? '#0891b2' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 200ms ease',
              }}>
                {disponibiliOnly && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </span>
              {t('filter_available_only')}
            </label>

            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer', 
              fontSize: '13px', 
              color: offerteSolo ? '#059669' : '#475569',
              fontWeight: offerteSolo ? '600' : '500',
              padding: '10px 16px',
              borderRadius: '10px',
              backgroundColor: offerteSolo ? 'rgba(5, 150, 105, 0.1)' : 'transparent',
              border: `1px solid ${offerteSolo ? '#059669' : '#e2e8f0'}`,
              transition: 'all 200ms ease',
            }}>
              <input
                type="checkbox"
                checked={offerteSolo}
                onChange={e => setOfferteSolo(e.target.checked)}
                style={{ display: 'none' }}
              />
              <span style={{
                width: '18px',
                height: '18px',
                borderRadius: '5px',
                border: `2px solid ${offerteSolo ? '#059669' : '#cbd5e1'}`,
                backgroundColor: offerteSolo ? '#059669' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 200ms ease',
              }}>
                {offerteSolo && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </span>
              🏷️ {t('filter_offers_only')}
            </label>
          </div>
        </div>

        {/* Content */}
        {loading || (offerteSolo && !promozioniLoaded) ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center', 
            padding: '80px 20px',
            gap: '20px',
          }}>
            {/* Skeleton grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '24px',
              width: '100%',
            }}>
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{
                    aspectRatio: '4/5',
                    background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-surface-hover) 50%, var(--color-surface) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.4s infinite',
                  }} />
                  <div style={{ padding: '14px' }}>
                    <div style={{
                      height: '18px',
                      width: '80%',
                      backgroundColor: 'var(--color-surface-hover)',
                      borderRadius: '6px',
                      marginBottom: '10px',
                    }} />
                    <div style={{
                      height: '14px',
                      width: '50%',
                      backgroundColor: 'var(--color-surface-hover)',
                      borderRadius: '6px',
                      marginBottom: '16px',
                    }} />
                    <div style={{
                      height: '44px',
                      width: '100%',
                      backgroundColor: 'var(--color-surface-hover)',
                      borderRadius: '10px',
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <style>{`
              @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
          </div>
        ) : error ? (
          <div style={{
            padding: '24px',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger)',
            borderRadius: '8px',
            color: 'var(--color-danger)',
            textAlign: 'center',
          }}>
            {t(error)}
          </div>
        ) : prodotti.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '80px 20px', 
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-surface-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <p style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px', color: 'var(--color-text)' }}>
              {t('no_products_found')}
            </p>
            <p style={{ fontSize: '14px', margin: '0 0 20px', color: 'var(--color-text-secondary)' }}>
              Prova a modificare i filtri di ricerca
            </p>
            {(search || categoriaId) && (
              <button
                onClick={() => { setSearch(''); setCategoriaId('') }}
                style={{ 
                  padding: '12px 24px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 150ms ease, box-shadow 200ms ease',
                  boxShadow: '0 2px 8px rgba(var(--color-primary-rgb, 59, 130, 246), 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                {t('remove_filters')}
              </button>
            )}
          </div>
        ) : (
          <>
            {(() => {
              const activePromos = flags.discounts_enabled !== false ? promozioni : []
              const prodottiFiltrati = offerteSolo
                ? prodotti.filter(p =>
                    activePromos.some(promo =>
                      (promo.prodotto_id != null && p.id != null && Number(promo.prodotto_id) === Number(p.id)) ||
                      (promo.categoria_id != null && p.categoria_id != null && Number(promo.categoria_id) === Number(p.categoria_id))
                    )
                  )
                : prodotti
              return prodottiFiltrati.length === 0 && offerteSolo ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
                  <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🏷️</p>
                  <p style={{ fontSize: '16px', margin: 0 }}>{t('no_products_found')}</p>
                </div>
              ) : (
                <div className="store-product-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '24px',
                }}>
                  {prodottiFiltrati.map((p, i) => (
                    <ProductCard
                      key={p.id}
                      prodotto={p}
                      index={i}
                      onAddToCart={handleAddToCart}
                      promozioni={activePromos}
                    />
                  ))}
                </div>
              )
            })()}

            {hasMore && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginTop: '48px',
                paddingBottom: '24px',
              }}>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={loadingMore}
                  style={{ 
                    minWidth: '240px',
                    padding: '14px 32px',
                    backgroundColor: loadingMore ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                    color: 'var(--color-text)',
                    border: '2px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                    transition: 'all 200ms ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                  onMouseEnter={(e) => {
                    if (!loadingMore) {
                      e.currentTarget.style.borderColor = 'var(--color-primary)'
                      e.currentTarget.style.color = 'var(--color-primary)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                    e.currentTarget.style.color = 'var(--color-text)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {loadingMore ? (
                    <>
                      <svg 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                        style={{ animation: 'spin 1s linear infinite' }}
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      {t('loading')}
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      {t('load_more')}
                    </>
                  )}
                </button>
                <style>{`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            )}
          </>
        )}
      </div>
    </StoreLayout>
  )
}
