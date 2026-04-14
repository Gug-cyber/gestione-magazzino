import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { prodottiAPI, getFotoUrl } from '../api/client'
import { ebayApi } from '../api/ebay'

function EbayPubblicaProdotto() {
  const navigate = useNavigate()
  const { productId: paramId } = useParams()
  const [searchParams] = useSearchParams()
  const productId = paramId || searchParams.get('product_id')

  const [product, setProduct] = useState(null)
  const [connection, setConnection] = useState({ connected: false })
  const [netPrice, setNetPrice] = useState('')
  const [fee, setFee] = useState('13.25')
  const [quantity, setQuantity] = useState(1)
  const [publishedPrice, setPublishedPrice] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!productId) return
    Promise.all([
      prodottiAPI.getById(productId),
      ebayApi.getConnectionStatus(),
    ]).then(([pRes, cRes]) => {
      const p = pRes.data
      setProduct(p)
      setNetPrice(p.prezzo_vendita ?? '')
      setQuantity(Math.max(1, p.quantita || 1))
      setConnection(cRes.data)
      if (cRes.data?.fee_percentage != null) setFee(String(cRes.data.fee_percentage))
    }).catch((e) => setError(e.response?.data?.detail || 'Errore caricamento dati'))
  }, [productId])

  useEffect(() => {
    const n = Number(netPrice)
    const f = Number(fee)
    if (!Number.isFinite(n) || !Number.isFinite(f) || n <= 0 || f < 0 || f >= 100) {
      setPublishedPrice(null)
      return
    }
    ebayApi.getPricingPreview(n, f)
      .then((res) => setPublishedPrice(res.data.published_price))
      .catch(() => setPublishedPrice(null))
  }, [netPrice, fee])

  const validationMessage = useMemo(() => {
    if (!connection.connected) return 'Account eBay non collegato'
    if (!product) return ''
    if (!product.foto_path && !product.google_drive_folder_id) return 'Il prodotto non ha immagini — non è possibile pubblicare'
    if ((product.quantita || 0) <= 0) return 'Quantità non disponibile'
    return ''
  }, [connection, product])

  const handlePublish = async () => {
    setError('')
    setSuccess('')
    if (validationMessage) {
      setError(validationMessage)
      return
    }
    setSaving(true)
    try {
      await ebayApi.publishProduct({
        product_id: Number(productId),
        fee_override: Number(fee),
        quantity_override: Number(quantity),
      })
      setSuccess('Prodotto pubblicato su eBay con successo')
    } catch (e) {
      setError(e.response?.data?.detail || 'Errore pubblicazione eBay')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="gm-card" style={{ padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Pubblica prodotto su eBay</h2>
        <button className="gm-btn gm-btn-secondary" onClick={() => navigate(-1)}>← Indietro</button>

        {product && (
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {product.foto_url && <img src={getFotoUrl(product.foto_url)} alt={product.nome} style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 8 }} />}
              <div>
                <div><strong>{product.nome}</strong></div>
                <div>SKU: {product.sku}</div>
                <div>Disponibile: {product.quantita}</div>
                <div>{product.descrizione || 'Nessuna descrizione'}</div>
              </div>
            </div>

            <label style={{ display: 'grid', gap: 4 }}>
              Prezzo netto desiderato
              <input type="number" step="0.01" value={netPrice} onChange={(e) => setNetPrice(e.target.value)} />
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
              Fee eBay %
              <input type="number" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} />
            </label>

            <div>Prezzo da pubblicare su eBay: <strong>{publishedPrice != null ? `€${Number(publishedPrice).toFixed(2)}` : '—'}</strong></div>

            <label style={{ display: 'grid', gap: 4 }}>
              Quantità da pubblicare
              <input
                type="number"
                min={1}
                max={product.quantita || 1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>

            {validationMessage && <div style={{ color: 'var(--color-danger)' }}>{validationMessage}</div>}
            {error && <div style={{ color: 'var(--color-danger)' }}>{error}</div>}
            {success && <div style={{ color: 'var(--color-success)' }}>{success}</div>}

            <button className="gm-btn gm-btn-primary" onClick={handlePublish} disabled={saving || !!validationMessage}>
              {saving ? 'Pubblicazione...' : 'Pubblica su eBay'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default EbayPubblicaProdotto
