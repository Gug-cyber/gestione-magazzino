import { useState, useEffect, useRef } from 'react'
import StoreLayout from '../../components/store/StoreLayout'
import ProductCard from '../../components/store/ProductCard'
import { storeAPI } from '../../api/store'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { trackPageView } from '../../utils/analytics'

const PAGE_LIMIT = 40

function CategoryDropdown({ value, onChange, options }) {
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

  const selectedLabel = (options.find(o => o.value === value) || options[0])?.label || 'Tutte le categorie'

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: '1 1 160px' }}>
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
            overflow: 'hidden',
          }}
        >
          {options.map(opt => {
            const isSelected = opt.value === value
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
                  padding: '10px 14px',
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
  const [categorie, setCategorie] = useState([])
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
  const [bannerIdx, setBannerIdx] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Reset pagination when filters change
  const prevFilters = useRef({ search, categoriaId, disponibiliOnly, offerteSolo })
  useEffect(() => {
    const prev = prevFilters.current
    if (prev.search !== search || prev.categoriaId !== categoriaId || prev.disponibiliOnly !== disponibiliOnly || prev.offerteSolo !== offerteSolo) {
      prevFilters.current = { search, categoriaId, disponibiliOnly, offerteSolo }
      setProdotti([])
      setPage(1)
      setHasMore(false)
    }
  }, [search, categoriaId, disponibiliOnly, offerteSolo])

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
      } catch {}
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
          const catRes = await storeAPI.getCategorie()
          if (!cancelled) setCategorie(catRes.data)
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
        {/* Header */}
        <div style={{ marginBottom: '24px', textAlign: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: '700', margin: '0 0 4px', color: 'var(--color-text)' }}>
            🃏 TCG Store
          </h1>
          {!loading && prodotti.length > 0 && (
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '12px' }}>
              {prodotti.length} {prodotti.length === 1 ? t('store_product_count_one') : t('store_product_count_many')}
            </p>
          )}
        </div>

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
                <div key={b.id} style={{ position: 'relative' }}>
                  {b.immagine_url && (
                    <img
                      src={b.immagine_url}
                      alt={b.titolo}
                      style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  )}
                  {(b.link_url || b.descrizione) && (
                    <div style={{
                      position: b.immagine_url ? 'absolute' : 'relative',
                      bottom: b.immagine_url ? 0 : undefined,
                      left: 0, right: 0,
                      background: b.immagine_url ? 'linear-gradient(transparent, rgba(0,0,0,0.65))' : 'transparent',
                      padding: '20px 20px 16px',
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
                    }}>
                      <div>
                        {b.descrizione && (
                          <div style={{ color: b.immagine_url ? 'rgba(255,255,255,0.85)' : 'var(--color-text-secondary)', fontSize: '13px' }}>
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
                  {!b.immagine_url && (
                    <div style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--color-text)', fontSize: '16px' }}>{b.titolo}</div>
                      {b.descrizione && <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>{b.descrizione}</div>}
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
        <div style={{
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
            options={[{ value: '', label: t('filter_all_categories') }, ...categorie.map(c => ({ value: String(c.id), label: c.nome }))]}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-muted)', opacity: 0.75 }}>
            <input
              type="checkbox"
              checked={disponibiliOnly}
              onChange={e => setDisponibiliOnly(e.target.checked)}
              style={{ accentColor: 'var(--color-primary)', width: '13px', height: '13px' }}
            />
            {t('filter_available_only')}
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-muted)', opacity: 0.75 }}>
            <input
              type="checkbox"
              checked={offerteSolo}
              onChange={e => setOfferteSolo(e.target.checked)}
              style={{ accentColor: 'var(--color-primary)', width: '13px', height: '13px' }}
            />
            {t('filter_offers_only')}
          </label>
        </div>

        {/* Content */}
        {loading ? (
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
            <style>{`
              @media (max-width: 640px) {
                .store-product-grid {
                  grid-template-columns: repeat(2, 1fr) !important;
                  gap: 12px !important;
                }
              }
            `}</style>
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
