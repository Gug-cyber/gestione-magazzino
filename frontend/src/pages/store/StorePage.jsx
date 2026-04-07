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
    addItem({ ...prodotto, quantita_disponibile: prodotto.quantita }, 1)
  }

  return (
    <StoreLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: '700', margin: '0 0 8px', color: 'var(--color-text)' }}>
            🃏 TCG Store
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: '15px' }}>
            Scopri la nostra selezione di carte, giochi e collezioni
          </p>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '28px',
          padding: '16px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
        }}>
          <input
            type="text"
            placeholder="Cerca prodotti..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: '1 1 200px',
              padding: '8px 12px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
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
              padding: '8px 12px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '20px',
          }}>
            {prodotti.map(p => (
              <ProductCard
                key={p.id}
                prodotto={p}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </StoreLayout>
  )
}
