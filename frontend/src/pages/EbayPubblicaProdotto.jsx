import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { prodottiAPI, getFotoUrl } from '../api/client'
import { ebayApi } from '../api/ebay'
import { useIsMobile } from '../hooks/useIsMobile'
import '../styles/shared.css'

function EbayPubblicaProdotto() {
  const navigate = useNavigate()
  const { productId: paramId } = useParams()
  const [searchParams] = useSearchParams()
  const productId = paramId || searchParams.get('product_id')
  const isMobile = useIsMobile()

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
  const [conditionsFromFallback, setConditionsFromFallback] = useState(false)
  const [isTradingCardCategory, setIsTradingCardCategory] = useState(false)
  const [gradingService, setGradingService] = useState('')
  const [gradingGrade, setGradingGrade] = useState('')
  const [itemGame, setItemGame] = useState('')
  const [descriptionOverride, setDescriptionOverride] = useState('')

  const _conditionIdMap = {
    'Mint': '3000',
    'Near Mint': '3000',
    'Excellent': '3000',
    'Good': '4000',
    'Light Played': '4000',
    'Played': '5000',
    'Poor': '5000',
  }

  const _LIKE_NEW_CONDITION_ID = '2750'

  const _getBestGradedCondition = (conditions) => {
    const likeNew = conditions.find(c => c.conditionId === _LIKE_NEW_CONDITION_ID)
    const best = likeNew || conditions[0]
    return best ? best.conditionEnum : ''
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
      setDescriptionOverride(p.descrizione || '')
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
      setIsTradingCardCategory(false)
      setItemGame('')
      if (!product?.is_graded) setEbayCondition('')
      return
    }
    setConditionsLoading(true)
    setConditionsFromFallback(false)
    setIsTradingCardCategory(false)
    setItemGame('')
    ebayApi.getCategoryConditions(selectedCategoryId, connection.marketplace_id || 'EBAY_IT')
      .then(res => {
        const conditions = res.data
        setAvailableConditions(conditions)
        const isTradingCard = conditions.some(c => c.conditionId === '2750' || c.conditionId === '7000')
        setIsTradingCardCategory(isTradingCard)
        if (product?.is_graded) {
          const gradedMatch = conditions.find(c => c.conditionEnum === 'GRADED')
          if (gradedMatch) {
            setEbayCondition('GRADED')
          } else {
            setEbayCondition(_getBestGradedCondition(conditions))
          }
        } else if (conditions.length > 0) {
          const preferred = _conditionIdMap[product?.stato_conservazione] || '4000'
          const match = conditions.find(c => c.conditionId === preferred)
          setEbayCondition(match ? match.conditionEnum : conditions[0].conditionEnum)
        }
      })
      .catch(() => {
        setConditionsFromFallback(true)
        setIsTradingCardCategory(false)
        const fallback = [
          { conditionId: '3000', conditionEnum: 'USED_EXCELLENT', conditionDescription: 'Ottime condizioni' },
          { conditionId: '4000', conditionEnum: 'USED_GOOD', conditionDescription: 'Buone condizioni' },
          { conditionId: '5000', conditionEnum: 'USED_ACCEPTABLE', conditionDescription: 'Condizioni accettabili' },
        ]
        setAvailableConditions(fallback)
        if (product?.is_graded) {
          const gradedMatch = fallback.find(c => c.conditionEnum === 'GRADED')
          if (gradedMatch) {
            setEbayCondition('GRADED')
          } else {
            setEbayCondition(_getBestGradedCondition(fallback))
          }
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
    if (
      selectedCategoryId &&
      ebayCondition === 'GRADED' &&
      availableConditions.length > 0 &&
      !availableConditions.some(c => c.conditionEnum === 'GRADED')
    ) {
      return 'Condizione "Gradata" non valida per la categoria selezionata. Seleziona una condizione compatibile.'
    }
    if (isTradingCardCategory && !itemGame) {
      return 'Seleziona il gioco per le categorie di carte collezionabili'
    }
    return ''
  }, [connection, product, freeShipping, shippingCost, selectedCategoryId, listingFormat, auctionStartPrice, gradingService, gradingGrade, ebayCondition, availableConditions, isTradingCardCategory, itemGame])

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
        description_override: descriptionOverride.trim() || undefined,
        item_game: isTradingCardCategory && itemGame ? itemGame : undefined,
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
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, alignItems: isMobile ? 'flex-start' : 'center' }}>
              {product.foto_url && <img src={getFotoUrl(product.foto_url)} alt={product.nome} style={{ width: isMobile ? 64 : 88, height: isMobile ? 64 : 88, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{product.nome}</div>
                <div>SKU: {product.sku}</div>
                <div>Disponibile: {product.quantita}</div>
                <div style={{ wordBreak: 'break-word' }}>{product.descrizione || 'Nessuna descrizione'}</div>
              </div>
            </div>

            <label style={{ display: 'grid', gap: 4 }}>
              Descrizione per eBay
              <textarea
                value={descriptionOverride}
                onChange={(e) => setDescriptionOverride(e.target.value)}
                placeholder="Inserisci una descrizione per l'annuncio eBay..."
                rows={4}
                style={{ resize: 'vertical', width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 14 }}
              />
              {!descriptionOverride.trim() && (
                <span style={{ color: '#f57c00', fontSize: 12 }}>
                  ⚠️ Nessuna descrizione — verrà usata la descrizione del prodotto o il nome come descrizione eBay
                </span>
              )}
            </label>

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
              <select value={listingFormat} onChange={e => setListingFormat(e.target.value)} style={{ width: '100%' }}>
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
                  <select value={auctionDuration} onChange={e => setAuctionDuration(e.target.value)} style={{ width: '100%' }}>
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
                <div key={levelIdx} style={{ display: 'grid', gap: 4 }}>
                  {levelIdx > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: isMobile ? 0 : levelIdx * 12 }}>
                      {'›'.repeat(levelIdx)} Sottocategoria livello {levelIdx}
                    </div>
                  )}
                  <select
                    value={categoryPath[levelIdx]?.id || ''}
                    onChange={e => handleCategorySelect(levelIdx, e.target.value)}
                    style={{ width: '100%', marginLeft: isMobile ? 0 : levelIdx * 12, maxWidth: isMobile ? '100%' : `calc(100% - ${levelIdx * 12}px)` }}
                  >
                    <option value="">— Seleziona {levelIdx === 0 ? 'categoria' : 'sottocategoria'} —</option>
                    {cats.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}{cat.is_leaf ? ' ✓' : ' →'}
                      </option>
                    ))}
                  </select>
                </div>
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
              <div style={{ display: 'grid', gap: 4 }}>
                <label style={{ fontWeight: 500 }}>Condizione eBay</label>
                {conditionsLoading ? (
                  <div style={{ color: '#888', fontSize: 13 }}>Caricamento condizioni...</div>
                ) : isTradingCardCategory ? (
                  <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
                    {product?.is_graded && availableConditions.some(c => c.conditionEnum === 'GRADED') && (
                      <div
                        onClick={() => setEbayCondition('GRADED')}
                        style={{
                          border: ebayCondition === 'GRADED' ? '2px solid var(--color-primary, #6366f1)' : '1px solid var(--color-border, #ccc)',
                          borderRadius: 10,
                          padding: '14px 16px',
                          cursor: 'pointer',
                          background: ebayCondition === 'GRADED' ? 'var(--color-primary-bg, #eef2ff)' : 'var(--color-surface, #fff)',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 15 }}>Gradata (Graded)</div>
                        <div style={{ color: '#666', fontSize: 13, marginTop: 3 }}>Carta con certificazione professionale</div>
                      </div>
                    )}
                    {availableConditions.map(c => (
                      <div
                        key={c.conditionId}
                        onClick={() => setEbayCondition(c.conditionEnum)}
                        style={{
                          border: ebayCondition === c.conditionEnum ? '2px solid var(--color-primary, #6366f1)' : '1px solid var(--color-border, #ccc)',
                          borderRadius: 10,
                          padding: '14px 16px',
                          cursor: 'pointer',
                          background: ebayCondition === c.conditionEnum ? 'var(--color-primary-bg, #eef2ff)' : 'var(--color-surface, #fff)',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (ebayCondition !== c.conditionEnum) {
                            e.currentTarget.style.background = 'var(--color-hover, #f5f5f5)'
                          }
                        }}
                        onMouseLeave={e => {
                          if (ebayCondition !== c.conditionEnum) {
                            e.currentTarget.style.background = 'var(--color-surface, #fff)'
                          }
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{c.conditionDescription}</div>
                        {c.conditionSubtitle && (
                          <div style={{ color: '#666', fontSize: 13, marginTop: 3 }}>{c.conditionSubtitle}</div>
                        )}
                      </div>
                    ))}
                    {conditionsFromFallback && (
                      <div style={{ color: '#f57c00', fontSize: 13 }}>
                        ⚠️ Condizioni generiche — potrebbero non essere tutte compatibili con questa categoria.
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <select value={ebayCondition} onChange={e => setEbayCondition(e.target.value)} style={{ width: '100%' }}>
                      {product?.is_graded && availableConditions.some(c => c.conditionEnum === 'GRADED') && (
                        <option value="GRADED">Gradata (Graded)</option>
                      )}
                      {availableConditions.map(c => (
                        <option key={c.conditionId} value={c.conditionEnum}>
                          {c.conditionDescription}
                        </option>
                      ))}
                    </select>
                    {conditionsFromFallback && (
                      <div style={{ color: '#f57c00', fontSize: 13 }}>
                        ⚠️ Impossibile verificare le condizioni valide per questa categoria. Le condizioni mostrate sono generiche e potrebbero non essere compatibili.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {isTradingCardCategory && (
              <div style={{ display: 'grid', gap: 4 }}>
                <label style={{ fontWeight: 500 }}>
                  Gioco <span style={{ color: 'var(--color-danger)', fontSize: 12 }}>* obbligatorio</span>
                </label>
                <select value={itemGame} onChange={e => setItemGame(e.target.value)} style={{ width: '100%' }}>
                  <option value="">-- Seleziona il gioco --</option>
                  <option value="Magic: The Gathering">Magic: The Gathering</option>
                  <option value="Pokémon">Pokémon</option>
                  <option value="Yu-Gi-Oh!">Yu-Gi-Oh!</option>
                  <option value="Dragon Ball Super Card Game">Dragon Ball Super Card Game</option>
                  <option value="One Piece Card Game">One Piece Card Game</option>
                  <option value="Lorcana">Lorcana</option>
                  <option value="Flesh and Blood">Flesh and Blood</option>
                  <option value="Cardfight!! Vanguard">Cardfight!! Vanguard</option>
                  <option value="Digimon Card Game">Digimon Card Game</option>
                  <option value="Altro">Altro</option>
                </select>
              </div>
            )}

            {product?.is_graded && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, background: 'var(--color-surface)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>📋 Dettagli grading (obbligatori per eBay)</div>

                <label style={{ display: 'grid', gap: 4, marginBottom: 8 }}>
                  Grading Service
                  <select value={gradingService} onChange={e => setGradingService(e.target.value)} style={{ width: '100%' }}>
                    <option value="">-- Seleziona --</option>
                    <option value="PSA">PSA</option>
                    <option value="BGS">BGS (Beckett)</option>
                    <option value="CGC">CGC</option>
                    <option value="SGC">SGC</option>
                    <option value="ACE">ACE</option>
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

            {validationMessage && <div style={{ color: 'var(--color-danger)', wordBreak: 'break-word' }}>{validationMessage}</div>}
            {error && <div style={{ color: 'var(--color-danger)', wordBreak: 'break-word' }}>{error}</div>}
            {success && <div style={{ color: 'var(--color-success)', wordBreak: 'break-word' }}>{success}</div>}

            <button className="gm-btn gm-btn-primary" onClick={handlePublish} disabled={saving || !!validationMessage} style={{ width: isMobile ? '100%' : undefined }}>
              {saving ? 'Pubblicazione...' : 'Pubblica su eBay'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default EbayPubblicaProdotto
