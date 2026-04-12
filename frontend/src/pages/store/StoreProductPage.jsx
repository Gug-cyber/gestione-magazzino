import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { storeAPI } from '../../api/store'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import ProductGallery from '../../components/store/ProductGallery'
import ProductInfo from '../../components/store/ProductInfo'
import { trackPageView, trackAddToCart } from '../../utils/analytics'

export default function StoreProductPage() {
  const { id } = useParams()
  const { addItem, isInCart, getItemQty } = useCart()
  const { t } = useLanguage()
  const [prodotto, setProdotto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [added, setAdded] = useState(false)
  const [promozioni, setPromozioni] = useState([])
  const [flags, setFlags] = useState({})
  const addedTimerRef = useRef(null)

  useEffect(() => {
    trackPageView(`/store/product/${id}`)
  }, [id])

  useEffect(() => {
    setLoading(true)
    setError(null)
    storeAPI.getProdotto(id)
      .then(res => setProdotto(res.data))
      .catch(err => {
        setError(err.response?.status === 404
          ? 'error_product_not_found'
          : 'error_loading_product')
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    async function fetchPublic() {
      try {
        const [flagsRes, promosRes] = await Promise.allSettled([
          storeAPI.getFlagsPublici(),
          storeAPI.getPromozioniAttive(),
        ])
        if (flagsRes.status === 'fulfilled') setFlags(flagsRes.value.data)
        if (promosRes.status === 'fulfilled') setPromozioni(promosRes.value.data)
      } catch {}
    }
    fetchPublic()
  }, [])

  useEffect(() => {
    return () => { if (addedTimerRef.current) clearTimeout(addedTimerRef.current) }
  }, [])

  const activePromos = flags.discounts_enabled !== false ? promozioni : []
  const promo = prodotto
    ? activePromos.find(p =>
        (p.prodotto_id != null && prodotto.id != null && Number(p.prodotto_id) === Number(prodotto.id)) ||
        (p.categoria_id != null && prodotto.categoria_id != null && Number(p.categoria_id) === Number(prodotto.categoria_id))
      ) || null
    : null
  const prezzoBase = prodotto?.prezzo_vendita != null ? Number(prodotto.prezzo_vendita) : null
  const prezzoScontato = promo && prezzoBase != null
    ? Math.max(0, promo.tipo === 'percentage'
        ? prezzoBase * (1 - promo.valore / 100)
        : prezzoBase - promo.valore)
    : null

  function handleAddToCart(qty) {
    if (!prodotto) return
    const prezzoUnitario = prezzoScontato !== null ? prezzoScontato : prezzoBase
    addItem({ ...prodotto, quantita_disponibile: prodotto.quantita, prezzo_unitario: prezzoUnitario }, qty)
    trackAddToCart(prodotto.id, prodotto.nome)
    setAdded(true)
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current)
    addedTimerRef.current = setTimeout(() => setAdded(false), 2200)
  }

  if (loading) {
    return (
      <StoreLayout>
        <PageSkeleton />
      </StoreLayout>
    )
  }

  if (error || !prodotto) {
    return (
      <StoreLayout>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <p style={{ fontSize: '48px', margin: '0 0 12px' }}>😕</p>
          <p style={{ color: 'var(--color-danger)', marginBottom: '20px', fontSize: '15px' }}>
            {error ? t(error) : t('error_product_not_found')}
          </p>
          <Link to="/store" className="gm-btn gm-btn-secondary">{t('back_to_store')}</Link>
        </div>
      </StoreLayout>
    )
  }

  return (
    <StoreLayout>
      <div className="animate-fade-in">
        {/* Breadcrumb */}
        <nav style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <Link to="/store" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>{t('store_breadcrumb')}</Link>
          <span style={{ color: 'var(--color-border-hover)' }}>›</span>
          <span style={{
            color: 'var(--color-text-secondary)',
            maxWidth: '260px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {prodotto.nome}
          </span>
        </nav>

        {/* 2-col layout */}
        <div
          className="product-detail-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'min(620px, 62%) 1fr',
            gap: '32px',
            alignItems: 'start',
          }}
        >
          <ProductGallery
            fotoUrl={prodotto.foto_url}
            nome={prodotto.nome}
            extraImages={prodotto.immagini || []}
          />

          <div style={{ position: 'sticky', top: '24px' }}>
            <ProductInfo
              prodotto={prodotto}
              inCart={isInCart(prodotto.id)}
              cartQty={getItemQty(prodotto.id)}
              added={added}
              onAddToCart={handleAddToCart}
              prezzoScontato={prezzoScontato}
            />
          </div>
        </div>

        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @media (max-width: 768px) {
            .product-detail-grid {
              grid-template-columns: 1fr !important;
              gap: 20px !important;
            }
          }
        `}</style>
      </div>
    </StoreLayout>
  )
}

function PageSkeleton() {
  const pulse = {
    backgroundColor: 'var(--color-surface)',
    borderRadius: '12px',
    animation: 'skeletonPulse 1.5s ease-in-out infinite',
  }
  return (
    <>
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'start' }}>
        <div style={{ ...pulse, aspectRatio: '1', borderRadius: '20px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
          <div style={{ ...pulse, height: '36px', width: '70%' }} />
          <div style={{ ...pulse, height: '20px', width: '40%' }} />
          <div style={{ ...pulse, height: '48px', width: '50%', marginTop: '8px' }} />
          <div style={{ ...pulse, height: '100px', marginTop: '8px' }} />
          <div style={{ ...pulse, height: '52px', marginTop: '16px' }} />
        </div>
      </div>
    </>
  )
}
