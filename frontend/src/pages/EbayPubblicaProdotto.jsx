import { useEffect, useMemo, useState, useCallback } from 'react'
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
  const [shippingCost, setShippingCost] = useState('5.90')
  const [freeShipping, setFreeShipping] = useState(false)
  const [publishedPrice, setPublishedPrice] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const [categoryPath, setCategoryPath] = useState([])
  const [categoryLevels, setCategoryLevels] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categoriesError, setCategoriesError] = useState('')

  const [listingFormat, setListingFormat] = useState('FIXED_PRICE')
  const [auctionStartPrice, setAuctionStartPrice] = useState('0.99')
  const [auctionDuration, setAuctionDuration] = useState('DAYS_7')
  const [auctionReservePrice, setAuctionReservePrice] = useState('')
  const [auctionBuyItNow, setAuctionBuyItNow] = useState('')
  const [ebayCondition, setEbayCondition] = useState('')
  const [availableConditions, setAvailableConditions] = useState([])
  const [conditionsLoading, setConditionsLoading] = useState(false)
  const [gradingService, setGradingService] = useState('')
  const [gradingGrade, setGradingGrade] = useState('')

  const _conditionIdMap = {
    'Mint': '3000',
    'Near Mint': '3000',
    'Excellent': '3000',
    'Good': '4000',
    'Light Played': '4000',
    'Played': '5000',
    'Poor': '5000',
  }

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
      if (p.is_graded) {
        setEbayCondition('GRADED')
        setGradingService(p.grading_service || '')
        setGradingGrade(p.grade || '')
      }
    }).catch((e) => setError(e.response?.data?.detail || 'Errore caricamento dati'))
  }, [productId])

  useEffect(() => {
    if (!connection.connected) return
    setCategoriesLoading(true)
    setCategoriesError('')
    ebayApi.getCategories(null, connection.marketplace_id || 'EBAY_IT')
      .then(res => {
        setCategoryLevels([res.data.categories])
        setCategoryPath([])
        setSelectedCategoryId('')
      })
      .catch(() => setCategoriesError('Impossibile caricare le categorie eBay. Riprova più tardi.'))
      .finally(() => setCategoriesLoading(false))
  }, [connection])

  useEffect(() => {
    if (!selectedCategoryId || !connection?.connected) {
      setAvailableConditions([])
      if (!product?.is_graded) setEbayCondition('')
      return
    }
    setConditionsLoading(true)
    ebayApi.getCategoryConditions(selectedCategoryId, connection.marketplace_id || 'EBAY_IT')
      .then(res => {
        const conditions = res.data
        setAvailableConditions(conditions)
        if (product?.is_graded) {
          setEbayCondition('GRADED')
        } else if (conditions.length > 0) {
          const preferred = _conditionIdMap[product?.stato_conservazione] || '4000'
          const match = conditions.find(c => c.conditionId === preferred)
          setEbayCondition(match ? match.conditionEnum : conditions[0].conditionEnum)
        }
      })
      .catch(() => {
        const fallback = [
          { conditionId: '3000', conditionEnum: 'USED_EXCELLENT', conditionDescription: 'Ottime condizioni' },
          { conditionId: '4000', conditionEnum: 'USED_GOOD', conditionDescription: 'Buone condizioni' },
          { conditionId: '5000', conditionEnum: 'USED_ACCEPTABLE', conditionDescription: 'Condizioni accettabili' },
        ]
        setAvailableConditions(fallback)
        if (product?.is_graded) {
          setEbayCondition('GRADED')
        } else {
          const preferred = _conditionIdMap[product?.stato_conservazione] || '4000'
          const match = fallback.find(c => c.conditionId === preferred)
          setEbayCondition(match ? match.conditionEnum : 'USED_GOOD')
        }
      })
      .finally(() => setConditionsLoading(false))
  }, [selectedCategoryId, connection.marketplace_id, product?.stato_conservazione, product?.is_graded])

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

  const handleCategorySelect = useCallback((levelIndex, categoryId) => {
    const selectedCat = categoryLevels[levelIndex].find(c => c.id === categoryId)
    if (!selectedCat) return

    const newPath = [...categoryPath.slice(0, levelIndex), selectedCat]
    const newLevels = categoryLevels.slice(0, levelIndex + 1)
    setCategoryPath(newPath)

    if (selectedCat.is_leaf) {
      setSelectedCategoryId(categoryId)
      setCategoryLevels(newLevels)
      return
    }

    setSelectedCategoryId('')
    ebayApi.getCategories(categoryId, connection.marketplace_id || 'EBAY_IT')
      .then(res => {
        if (res.data.categories.length > 0) {
          setCategoryLevels([...newLevels, res.data.categories])
        } else {
          setSelectedCategoryId(categoryId)
          setCategoryLevels(newLevels)
        }
      })
      .catch(() => setCategoriesError('Impossibile caricare le sottocategorie eBay. Riprova più tardi.'))
  }, [categoryPath, categoryLevels, connection])

  const validationMessage = useMemo(() => {
    if (!connection.connected) return 'Account eBay non collegato'
    if (!product) return ''
    if (!product.foto_path) return 'Il prodotto non ha immagini pubbliche — non è possibile pubblicare'
    if ((product.quantita || 0) <= 0) return 'Quantità non disponibile'
    if (!selectedCategoryId) return 'Seleziona una categoria eBay foglia'
    const shipping = Number(shippingCost)
    if (!freeShipping && (!Number.isFinite(shipping) || shipping < 0)) return 'Spese di spedizione non valide'
    if (listingFormat === 'AUCTION') {
      const sp = Number(auctionStartPrice)
      if (!Number.isFinite(sp) || sp <= 0) return 'Prezzo di partenza asta non valido'
    }
    if (product.is_graded && (!gradingService || !gradingGrade)) {
      return 'Inserisci Grading Service e Grade per le carte gradate'
    }
    return ''
  }, [connection, product, freeShipping, shippingCost, selectedCategoryId, listingFormat, auctionStartPrice, gradingService, gradingGrade])

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
        quantity_override: listingFormat === 'AUCTION' ? 1 : Number(quantity),
        shipping_cost: freeShipping ? 0 : Number(shippingCost),
        ebay_category_id: selectedCategoryId,
        listing_format: listingFormat,
        auction_start_price: listingFormat === 'AUCTION' ? Number(auctionStartPrice) : undefined,
        auction_duration: listingFormat === 'AUCTION' ? auctionDuration : undefined,
        auction_reserve_price: listingFormat === 'AUCTION' && auctionReservePrice ? Number(auctionReservePrice) : undefined,
        auction_buy_it_now_price: listingFormat === 'AUCTION' && auctionBuyItNow ? Number(auctionBuyItNow) : undefined,
        ebay_condition: ebayCondition,
        grading_service: product?.is_graded ? gradingService : undefined,
        grade: product?.is_graded ? gradingGrade : undefined,
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

            <label style={{ display: 'grid', gap: 4 }}>
              Formato annuncio
              <select value={listingFormat} onChange={e => setListingFormat(e.target.value)}>
                <option value="FIXED_PRICE">Prezzo fisso</option>
                <option value="AUCTION">Asta</option>
              </select>
            </label>

            {listingFormat === 'AUCTION' && (
              <>
                <label style={{ display: 'grid', gap: 4 }}>
                  Prezzo di partenza asta (€)
                  <input type="number" step="0.01" min="0.01" value={auctionStartPrice} onChange={e => setAuctionStartPrice(e.target.value)} />
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  Durata asta
                  <select value={auctionDuration} onChange={e => setAuctionDuration(e.target.value)}>
                    <option value="DAYS_3">3 giorni</option>
                    <option value="DAYS_5">5 giorni</option>
                    <option value="DAYS_7">7 giorni</option>
                    <option value="DAYS_10">10 giorni</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  Prezzo di riserva (€) — opzionale
                  <input type="number" step="0.01" min="0" value={auctionReservePrice} onChange={e => setAuctionReservePrice(e.target.value)} placeholder="Lascia vuoto per nessuna riserva" />
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  Compralo subito (€) — opzionale
                  <input type="number" step="0.01" min="0" value={auctionBuyItNow} onChange={e => setAuctionBuyItNow(e.target.value)} placeholder="Lascia vuoto per disabilitare" />
                </label>
              </>
            )}

            <div style={{ display: 'grid', gap: 8 }}>
              <label>Categoria eBay</label>              {categoriesLoading && <div style={{ color: '#888', fontSize: 13 }}>Caricamento categorie...</div>}
              {categoriesError && <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>{categoriesError}</div>}

              {categoryLevels.map((cats, levelIdx) => (
                <select
                  key={levelIdx}
                  value={categoryPath[levelIdx]?.id || ''}
                  onChange={e => handleCategorySelect(levelIdx, e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">— Seleziona {levelIdx === 0 ? 'categoria' : 'sottocategoria'} —</option>
                  {cats.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}{cat.is_leaf ? ' ✓' : ' →'}
                    </option>
                  ))}
                </select>
              ))}

              {selectedCategoryId && (
                <div style={{ color: 'var(--color-success, #4caf50)', fontSize: 13 }}>
                  ✓ Categoria selezionata: {categoryPath.map(c => c.name).join(' → ')} (ID: {selectedCategoryId})
                </div>
              )}
              {!selectedCategoryId && categoryPath.length > 0 && (
                <div style={{ color: '#888', fontSize: 13 }}>
                  Seleziona una categoria foglia (marcata con ✓) per continuare
                </div>
              )}
            </div>

            {selectedCategoryId && (
              <label style={{ display: 'grid', gap: 4 }}>
                Condizione eBay
                {conditionsLoading
                  ? <div style={{ color: '#888', fontSize: 13 }}>Caricamento condizioni...</div>
                  : <select value={ebayCondition} onChange={e => setEbayCondition(e.target.value)}>
                      {product?.is_graded && (
                        <option value="GRADED">Gradata (Graded)</option>
                      )}
                      {availableConditions.map(c => (
                        <option key={c.conditionId} value={c.conditionEnum}>
                          {c.conditionDescription}
                        </option>
                      ))}
                    </select>
                }
              </label>
            )}

            {product?.is_graded && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, background: 'var(--color-surface)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>📋 Dettagli grading (obbligatori per eBay)</div>

                <label style={{ display: 'grid', gap: 4, marginBottom: 8 }}>
                  Grading Service
                  <select value={gradingService} onChange={e => setGradingService(e.target.value)}>
                    <option value="">-- Seleziona --</option>
                    <option value="PSA">PSA</option>
                    <option value="BGS">BGS (Beckett)</option>
                    <option value="CGC">CGC</option>
                    <option value="SGC">SGC</option>
                    <option value="ACE">ACE</option>
                    <option value="TAG">TAG (Tech All-Stars Grading)</option>
                    <option value="PCA">PCA (Professional Card Authenticators)</option>
                    <option value="AiGrading">AiGrading</option>
                    <option value="AGS">AGS (Ace Grading Services)</option>
                    <option value="GMA">GMA (Global Magic Authentication)</option>
                    <option value="HGA">HGA (Hybrid Grading Approach)</option>
                    <option value="RCG">RCG (Rare Candy Grading)</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  Grade
                  <input type="text" placeholder="es. 9.5" value={gradingGrade} onChange={e => setGradingGrade(e.target.value)} />
                </label>
              </div>
            )}

            {listingFormat === 'FIXED_PRICE' && (
              <div>Prezzo da pubblicare su eBay: <strong>{publishedPrice != null ? `€${Number(publishedPrice).toFixed(2)}` : '—'}</strong></div>
            )}

            <label style={{ display: 'grid', gap: 4 }}>
              Quantità da pubblicare
              <input
                type="number"
                min={1}
                max={product.quantita || 1}
                value={listingFormat === 'AUCTION' ? 1 : quantity}
                disabled={listingFormat === 'AUCTION'}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {listingFormat === 'AUCTION' && (
                <span style={{ color: '#888', fontSize: 12 }}>Le aste supportano solo quantità 1</span>
              )}
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={freeShipping}
                onChange={(e) => {
                  const isChecked = e.target.checked
                  setFreeShipping(isChecked)
                  if (isChecked) setShippingCost('0')
                }}
              />
              Spedizione gratuita
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
              Spese di spedizione (€)
              <input
                type="number"
                step="0.01"
                min={0}
                value={shippingCost}
                disabled={freeShipping}
                onChange={(e) => setShippingCost(e.target.value)}
              />
            </label>

            <div>
              Spese di spedizione:{' '}
              <strong>
                {freeShipping
                  ? 'Gratuite'
                  : `€${Number(shippingCost || 0).toFixed(2)}`}
              </strong>
            </div>

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
