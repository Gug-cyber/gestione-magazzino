import { useState, useEffect } from 'react'
import StoreLayout from '../../components/store/StoreLayout'
import ProductCard from '../../components/store/ProductCard'
import { storeAPI } from '../../api/store'
import { useCart } from '../../context/CartContext'

export default function StorePage() {
  const { addItem } = useCart()
  const [prodotti, setProdotti] = useState([])
  const [categorie, setCategorie] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [disponibiliOnly, setDisponibiliOnly] = useState(true)
  const [flags, setFlags] = useState({})
  const [banners, setBanners] = useState([])
  const [promozioni, setPromozioni] = useState([])
  const [bannerIdx, setBannerIdx] = useState(0)

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
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const [prodRes, catRes] = await Promise.all([
          storeAPI.getProdotti({
            search: search || undefined,
            categoria_id: categoriaId || undefined,
            disponibili_only: disponibiliOnly,
            limit: 200,
          }),
          storeAPI.getCategorie(),
        ])
        setProdotti(prodRes.data)
        setCategorie(catRes.data)
      } catch (err) {
        setError('Errore nel caricamento dei prodotti.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [search, categoriaId, disponibiliOnly])

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
          <h2 style={{ color: 'var(--color-text)', margin: '0 0 8px' }}>Store temporaneamente non disponibile</h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Torneremo presto. Grazie per la pazienza.</p>
        </div>
      </StoreLayout>
    )
  }

  const showBanners = flags.banners_enabled !== false && banners.length > 0

  return (
    <StoreLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div style={{ marginBottom: '40px', textAlign: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '24px' }}>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: '700', margin: '0 0 8px', color: 'var(--color-text)' }}>
            🃏 TCG Store
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '15px' }}>
            Scopri la nostra selezione di carte, giochi e collezioni
          </p>
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
                      style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  )}
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--color-text)', fontSize: '16px' }}>{b.titolo}</div>
                      {b.descrizione && <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>{b.descrizione}</div>}
                    </div>
                    {b.link_url && (
                      <a href={b.link_url} className="gm-btn gm-btn-primary gm-btn-sm" target="_blank" rel="noopener noreferrer">
                        Scopri →
                      </a>
                    )}
                  </div>
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
          marginBottom: '28px',
          padding: '20px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
        }}>
          <input
            type="text"
            placeholder="Cerca prodotti..."
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

          <select
            value={categoriaId}
            onChange={e => setCategoriaId(e.target.value)}
            style={{
              flex: '1 1 160px',
              padding: '10px 14px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text)',
              fontSize: '14px',
              outline: 'none',
            }}
          >
            <option value="">Tutte le categorie</option>
            {categorie.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            <input
              type="checkbox"
              checked={disponibiliOnly}
              onChange={e => setDisponibiliOnly(e.target.checked)}
              style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
            />
            Solo disponibili
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
            {error}
          </div>
        ) : prodotti.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
            <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🔍</p>
            <p style={{ fontSize: '16px', margin: 0 }}>Nessun prodotto trovato</p>
            {(search || categoriaId) && (
              <button
                className="gm-btn gm-btn-ghost"
                onClick={() => { setSearch(''); setCategoriaId('') }}
                style={{ marginTop: '16px' }}
              >
                Rimuovi filtri
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '24px',
          }}>
            {prodotti.map(p => (
              <ProductCard
                key={p.id}
                prodotto={p}
                onAddToCart={handleAddToCart}
                promozioni={flags.discounts_enabled !== false ? promozioni : []}
              />
            ))}
          </div>
        )}
      </div>
    </StoreLayout>
  )
}
