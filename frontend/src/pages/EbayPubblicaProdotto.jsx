import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { prodottiAPI, getFotoUrl } from '../api/client'
import { ebayApi } from '../api/ebay'

const CONDITION_MAP_LOCAL = {
  'Mint': 'NEW', 'Near Mint': 'NEW',
  'Excellent': 'USED_EXCELLENT', 'Good': 'USED_EXCELLENT',
  'Light Played': 'USED_GOOD', 'Played': 'USED_ACCEPTABLE', 'Poor': 'USED_ACCEPTABLE',
}

function EbayPubblicaProdotto() {
  const navigate = useNavigate()
  const { productId: paramId } = useParams()
  const [searchParams] = useSearchParams()
  const productId = paramId || searchParams.get('product_id')

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
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

  const [aspects, setAspects] = useState([])
  const [aspectValues, setAspectValues] = useState({})
  const [aspectsLoading, setAspectsLoading] = useState(false)
  const [aspectCustom, setAspectCustom] = useState({})

  const [validConditions, setValidConditions] = useState([])
  const [conditionOverride, setConditionOverride] = useState('')
  const [conditionWarning, setConditionWarning] = useState(false)
  const [conditionLoadError, setConditionLoadError] = useState(false)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

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

    // Reset aspects when navigating the category tree
    setAspects([])
    setAspectValues({})
    setAspectCustom({})
    setValidConditions([])
    setConditionOverride('')
    setConditionWarning(false)
    setConditionLoadError(false)

    if (selectedCat.is_leaf) {
      setSelectedCategoryId(categoryId)
      setCategoryLevels(newLevels)
      // Fetch aspects for this leaf category
      setAspectsLoading(true)
      ebayApi.getAspects(categoryId, connection.marketplace_id || 'EBAY_IT')
        .then(res => {
          const filtered = (res.data.aspects || [])
            .filter(a => a.required || a.recommended)
            .slice(0, 15) // eBay can return many aspects; cap to avoid UI overflow
          setAspects(filtered)
          setAspectValues(Object.fromEntries(filtered.map(a => [a.name, ''])))
          setAspectCustom({})
        })
        .catch(() => {
          // Non-blocking: aspects failure should not block publishing
          setAspects([])
          setAspectValues({})
        })
        .finally(() => setAspectsLoading(false))
      // Fetch valid conditions for this leaf category (non-blocking)
      ebayApi.getCategoryConditions(categoryId, connection.marketplace_id || 'EBAY_IT')
        .then(res => {
          const conditions = res.data.conditions || []
          setValidConditions(conditions)
          if (conditions.length > 0) {
            const mapped = CONDITION_MAP_LOCAL[product?.stato_conservazione] || ''
            const isValid = conditions.some(c => c.conditionEnum === mapped)
            if (mapped && isValid) {
              setConditionOverride(mapped)
              setConditionWarning(false)
            } else {
              setConditionOverride(conditions[0].conditionEnum)
              setConditionWarning(!!mapped)
            }
          }
        })
        .catch(() => {
          // Conditions could not be loaded: set a safe fallback and warn the user
          setValidConditions([])
          setConditionLoadError(true)
          setConditionOverride('USED_GOOD')
        })
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
  }, [categoryPath, categoryLevels, connection, product])

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
    for (const asp of aspects) {
      if (asp.required && !(aspectValues[asp.name] || '').trim()) {
        return `Compila il campo obbligatorio: ${asp.name}`
      }
    }
    if (validConditions.length > 0 && !conditionOverride) {
      return 'Seleziona una condizione valida per questa categoria'
    }
    return ''
  }, [connection, product, freeShipping, shippingCost, selectedCategoryId, listingFormat, auctionStartPrice, aspects, aspectValues, validConditions, conditionOverride])

  const handlePublish = async () => {
    setError('')
    setSuccess('')
    if (validationMessage) {
      setError(validationMessage)
      return
    }
    setSaving(true)
    try {
      const aspectsPayload = Object.fromEntries(
        Object.entries(aspectValues)
          .filter(([, v]) => v && v.trim())
          .map(([k, v]) => [k, [v.trim()]])
      )
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
        aspects: Object.keys(aspectsPayload).length > 0 ? aspectsPayload : undefined,
        condition_override: conditionOverride || undefined,
      })
      setSuccess('Prodotto pubblicato su eBay con successo')
    } catch (e) {
      setError(e.response?.data?.detail || 'Errore pubblicazione eBay')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '0 4px' : 0 }}>
      <div className="gm-card" style={{ padding: isMobile ? 12 : 16 }}>
        <h2 style={{ marginTop: 0, fontSize: isMobile ? 'clamp(1.1rem, 4vw, 1.4rem)' : undefined }}>Pubblica prodotto su eBay</h2>
        <button
          className="gm-btn gm-btn-secondary"
          onClick={() => navigate(-1)}
          style={{ minHeight: 44, width: isMobile ? '100%' : 'auto', marginBottom: isMobile ? 12 : 0, fontSize: isMobile ? 16 : undefined }}
        >
          ← Indietro
        </button>

        {product && (
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row' }}>
              {product.foto_url && (
                <img
                  src={getFotoUrl(product.foto_url)}
                  alt={product.nome}
                  style={{ width: isMobile ? '100%' : 88, height: isMobile ? 200 : 88, objectFit: 'cover', borderRadius: 8, maxWidth: 300 }}
                />
              )}
              <div style={{ width: '100%' }}>
                <div><strong>{product.nome}</strong></div>
                <div>SKU: {product.sku}</div>
                <div>Disponibile: {product.quantita}</div>
                <div>{product.descrizione || 'Nessuna descrizione'}</div>
              </div>
            </div>

            <label style={{ display: 'grid', gap: 4 }}>
              Prezzo netto desiderato
              <input
                type="number"
                step="0.01"
                value={netPrice}
                onChange={(e) => setNetPrice(e.target.value)}
                style={{ fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
              Fee eBay %
              <input
                type="number"
                step="0.01"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                style={{ fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 4 }}>
              Formato annuncio
              <select
                value={listingFormat}
                onChange={e => setListingFormat(e.target.value)}
                style={{ fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }}
              >
                <option value="FIXED_PRICE">Prezzo fisso</option>
                <option value="AUCTION">Asta</option>
              </select>
            </label>

            {listingFormat === 'AUCTION' && (
              <>
                <label style={{ display: 'grid', gap: 4 }}>
                  Prezzo di partenza asta (€)
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={auctionStartPrice}
                    onChange={e => setAuctionStartPrice(e.target.value)}
                    style={{ fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  Durata asta
                  <select
                    value={auctionDuration}
                    onChange={e => setAuctionDuration(e.target.value)}
                    style={{ fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="DAYS_3">3 giorni</option>
                    <option value="DAYS_5">5 giorni</option>
                    <option value="DAYS_7">7 giorni</option>
                    <option value="DAYS_10">10 giorni</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  Prezzo di riserva (€) — opzionale
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={auctionReservePrice}
                    onChange={e => setAuctionReservePrice(e.target.value)}
                    placeholder="Lascia vuoto per nessuna riserva"
                    style={{ fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 4 }}>
                  Compralo subito (€) — opzionale
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={auctionBuyItNow}
                    onChange={e => setAuctionBuyItNow(e.target.value)}
                    placeholder="Lascia vuoto per disabilitare"
                    style={{ fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }}
                  />
                </label>
              </>
            )}

            <div style={{ display: 'grid', gap: 8 }}>
              <label>Categoria eBay</label>
              {categoriesLoading && <div style={{ color: '#888', fontSize: 13 }}>Caricamento categorie...</div>}
              {categoriesError && <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>{categoriesError}</div>}

              {categoryLevels.map((cats, levelIdx) => (
                <select
                  key={levelIdx}
                  value={categoryPath[levelIdx]?.id || ''}
                  onChange={e => handleCategorySelect(levelIdx, e.target.value)}
                  style={{ width: '100%', fontSize: 16, minHeight: 44, boxSizing: 'border-box' }}
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

            {/* Condition override section */}
            {selectedCategoryId && conditionLoadError && (
              <div style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--color-border, #e0e0e0)', paddingTop: 12 }}>
                <div style={{ color: 'var(--color-warning, #e67e22)', fontSize: 13 }}>
                  ⚠ Impossibile verificare le condizioni valide per questa categoria. Verrà usato &quot;USED_GOOD&quot; come fallback.
                </div>
              </div>
            )}
            {selectedCategoryId && validConditions.length > 0 && (
              <div style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--color-border, #e0e0e0)', paddingTop: 12 }}>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontWeight: 600 }}>Condizione per questa categoria</span>
                  {conditionWarning && (
                    <div style={{ color: 'var(--color-warning, #e67e22)', fontSize: 13 }}>
                      ⚠ La condizione &quot;{product?.stato_conservazione}&quot; non è valida per questa categoria. Seleziona una condizione compatibile.
                    </div>
                  )}
                  <select
                    value={conditionOverride}
                    onChange={e => setConditionOverride(e.target.value)}
                    style={{ fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }}
                  >
                    {!conditionOverride && <option value="">— Seleziona condizione —</option>}
                    {validConditions.map(c => (
                      <option key={c.conditionEnum} value={c.conditionEnum}>
                        {c.conditionDescription} ({c.conditionEnum})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {/* Aspects / Item Specifics section */}
            {selectedCategoryId && (
              <div style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--color-border, #e0e0e0)', paddingTop: 12 }}>
                {aspectsLoading && (
                  <div style={{ color: '#888', fontSize: 13 }}>Caricamento dettagli categoria...</div>
                )}
                {!aspectsLoading && aspects.length > 0 && (
                  <>
                    <div style={{ fontWeight: 600, marginTop: 8 }}>Dettagli specifici della categoria</div>
                    {aspects.map(asp => (
                      <label key={asp.name} style={{ display: 'grid', gap: 4 }}>
                        <span>
                          {asp.name}
                          {asp.required && <span style={{ color: 'var(--color-danger, #e53e3e)', marginLeft: 2 }}>*</span>}
                          {!asp.required && asp.recommended && (
                            <span style={{ color: '#888', fontSize: 12, marginLeft: 4 }}>(consigliato)</span>
                          )}
                        </span>
                        {asp.values && asp.values.length > 0 ? (
                          <>
                            <select
                              value={aspectCustom[asp.name] ? '__custom__' : (aspectValues[asp.name] || '')}
                              onChange={e => {
                                const val = e.target.value
                                if (val === '__custom__') {
                                  setAspectCustom(prev => ({ ...prev, [asp.name]: true }))
                                  setAspectValues(prev => ({ ...prev, [asp.name]: '' }))
                                } else {
                                  setAspectCustom(prev => ({ ...prev, [asp.name]: false }))
                                  setAspectValues(prev => ({ ...prev, [asp.name]: val }))
                                }
                              }}
                              style={{ fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }}
                            >
                              <option value="">— Seleziona —</option>
                              {asp.values.map(v => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                              <option value="__custom__">Altro (scrivi qui)</option>
                            </select>
                            {aspectCustom[asp.name] && (
                              <input
                                type="text"
                                value={aspectValues[asp.name] || ''}
                                onChange={e => setAspectValues(prev => ({ ...prev, [asp.name]: e.target.value }))}
                                placeholder={`Inserisci ${asp.name}`}
                                style={{ fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }}
                              />
                            )}
                          </>
                        ) : (
                          <input
                            type="text"
                            value={aspectValues[asp.name] || ''}
                            onChange={e => setAspectValues(prev => ({ ...prev, [asp.name]: e.target.value }))}
                            placeholder={`Inserisci ${asp.name}`}
                            style={{ fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }}
                          />
                        )}
                      </label>
                    ))}
                  </>
                )}
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
                style={{ fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }}
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
                style={{ fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }}
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

            <button
              className="gm-btn gm-btn-primary"
              onClick={handlePublish}
              disabled={saving || !!validationMessage}
              style={{ minHeight: 44, width: '100%', fontSize: isMobile ? 16 : undefined }}
            >
              {saving ? 'Pubblicazione...' : 'Pubblica su eBay'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default EbayPubblicaProdotto
