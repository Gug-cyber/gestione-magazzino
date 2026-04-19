import { useState, useEffect, useRef } from 'react'
import StoreLayout from '../../components/store/StoreLayout'
import ProductCard from '../../components/store/ProductCard'
import { storeAPI } from '../../api/store'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { trackPageView } from '../../utils/analytics'

const PAGE_LIMIT = 40

function flattenTree(nodes, level = 0) {
  const result = []
  for (const node of nodes) {
    result.push({ value: String(node.id), label: node.nome, level })
    if (node.figli && node.figli.length > 0) {
      result.push(...flattenTree(node.figli, level + 1))
    }
  }
  return result
}

function CategoryDropdown({ value, onChange, treeOptions, allLabel }) {
  const [open, setOpen] = useState(false)
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

  const flatOptions = flattenTree(treeOptions)
  const selectedLabel = value
    ? (flatOptions.find(o => o.value === value)?.label || allLabel)
    : allLabel

  return (
    <div ref={containerRef} className="store-category-dropdown" style={{ position: 'relative', flex: '1 1 160px' }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Seleziona categoria"
        onClick={() => setOpen(prev => !prev)}
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
            overflowY: 'auto',
            maxHeight: '320px',
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

          {flatOptions.map(opt => {
            const isSelected = opt.value === value
            const paddingLeft = 14 + opt.level * 16
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  paddingTop: '8px',
                  paddingBottom: opt.level === 0 ? '4px' : '8px',
                  paddingLeft,
                  paddingRight: '14px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: opt.level === 0 ? '11px' : '14px',
                  fontWeight: opt.level === 0 ? 700 : 400,
                  textTransform: opt.level === 0 ? 'uppercase' : 'none',
                  letterSpacing: opt.level === 0 ? '0.06em' : 'normal',
                  color: isSelected
                    ? 'var(--color-primary)'
                    : opt.level === 0
                      ? 'var(--color-text-secondary)'
                      : 'var(--color-text)',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <span style={{ width: '14px', flexShrink: 0 }}>{isSelected ? '✓' : ''}</span>
                {opt.label}
              </button>
            )
          })}
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
        {/* Banners */}
        {showBanners && (
          <div style={{ marginBottom: '28px', position: 'relative' }}>
            <div style={{
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            }}>
              {banners.map((b, idx) => idx === bannerIdx && (
                <div key={b.id} style={{ position: 'relative', minHeight: '120px' }}>
                  {b.immagine_url && (
                    <img
                      src={b.immagine_url}
                      alt={b.titolo}
                      style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  )}
                  {(b.titolo || b.descrizione || b.link_url) && (
                    <div style={{
                      position: b.immagine_url ? 'absolute' : 'relative',
                      bottom: b.immagine_url ? 0 : undefined,
                      left: 0, right: 0,
                      background: b.immagine_url ? 'linear-gradient(transparent, rgba(0,0,0,0.65))' : 'transparent',
                      padding: '20px 20px 16px',
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
                    }}>
                      <div>
                        {b.titolo && (
                          <div style={{ fontWeight: '600', color: b.immagine_url ? 'rgba(255,255,255,0.95)' : 'var(--color-text)', fontSize: '16px' }}>{b.titolo}</div>
                        )}
                        {b.descrizione && (
                          <div style={{ color: b.immagine_url ? 'rgba(255,255,255,0.85)' : 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                            {b.descrizione}
                          </div>
                        )}
                      </div>
                      {b.link_url && (
                        <a href={b.link_url} className="gm-btn gm-btn-primary gm-btn-sm" target="_blank" rel="noopener noreferrer">
                          {t('banner_discover')}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {banners.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setBannerIdx(idx)}
                    style={{
                      width: idx === bannerIdx ? '20px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: idx === bannerIdx ? 'var(--color-primary)' : 'var(--color-border)',
                      transition: 'all 200ms ease',
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
          marginBottom: '20px',
          padding: '10px 0 12px',
          backgroundColor: 'transparent',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <input
            type="text"
            placeholder={t('filter_search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: '1 1 200px',
              padding: '10px 14px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text)',
              fontSize: '14px',
              outline: 'none',
            }}
          />

          <CategoryDropdown
            value={categoriaId}
            onChange={val => setCategoriaId(val)}
            treeOptions={categorieTree}
            allLabel={t('filter_all_categories')}
          />

          <div className="store-filter-checks" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              <input
                type="checkbox"
                checked={disponibiliOnly}
                onChange={e => setDisponibiliOnly(e.target.checked)}
                style={{ accentColor: 'var(--color-primary)', width: '14px', height: '14px' }}
              />
              {t('filter_available_only')}
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              <input
                type="checkbox"
                checked={offerteSolo}
                onChange={e => setOfferteSolo(e.target.checked)}
                style={{ accentColor: 'var(--color-primary)', width: '14px', height: '14px' }}
              />
              {t('filter_offers_only')}
            </label>
          </div>
        </div>

        {/* Content */}
        {loading || (offerteSolo && !promozioniLoaded) ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
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
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
            <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🔍</p>
            <p style={{ fontSize: '16px', margin: 0 }}>{t('no_products_found')}</p>
            {(search || categoriaId) && (
              <button
                className="gm-btn gm-btn-ghost"
                onClick={() => { setSearch(''); setCategoriaId('') }}
                style={{ marginTop: '16px' }}
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
                  gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
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
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
                <button
                  className="gm-btn gm-btn-ghost"
                  onClick={() => setPage(p => p + 1)}
                  disabled={loadingMore}
                  style={{ minWidth: '200px' }}
                >
                  {loadingMore ? t('loading') : t('load_more')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </StoreLayout>
  )
}
