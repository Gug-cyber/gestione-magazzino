import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { getOrdine, richiediReso } from '../../api/clientiAuth'
import { useClientiAuth } from '../../context/ClientiAuthContext'

export default function StoreOrderDetailPage() {
  const { cliente, loading } = useClientiAuth()
  const location = useLocation()
  const { id } = useParams()
  const [ordine, setOrdine] = useState(null)
  const [orderLoading, setOrderLoading] = useState(true)
  const [error, setError] = useState('')
  const [showResoForm, setShowResoForm] = useState(false)
  const [motivoReso, setMotivoReso] = useState('')
  const [resoLoading, setResoLoading] = useState(false)
  const [resoMessage, setResoMessage] = useState('')

  useEffect(() => {
    if (!cliente) return

    getOrdine(id)
      .then(setOrdine)
      .catch((err) => setError(err.response?.data?.detail || err.message || 'Errore nel caricamento ordine'))
      .finally(() => setOrderLoading(false))
  }, [cliente, id])

  const isResoDisponibile = () => {
    if (!ordine || ordine.stato !== 'consegnato' || !ordine.data_consegna) {
      return false
    }
    const dataConsegna = new Date(ordine.data_consegna)
    const oggi = new Date()
    const diffGiorni = Math.floor((oggi - dataConsegna) / (1000 * 60 * 60 * 24))
    return diffGiorni <= 14
  }

  const giorniRimanentiReso = () => {
    if (!ordine?.data_consegna) return 0
    const dataConsegna = new Date(ordine.data_consegna)
    const oggi = new Date()
    const diffGiorni = Math.floor((oggi - dataConsegna) / (1000 * 60 * 60 * 24))
    return Math.max(0, 14 - diffGiorni)
  }

  const handleReso = async (e) => {
    e.preventDefault()
    if (!motivoReso.trim()) return

    setResoLoading(true)
    setError('')

    try {
      await richiediReso(ordine.id, motivoReso)
      setResoMessage('Richiesta di reso inviata con successo! Ti contatteremo presto.')
      setShowResoForm(false)
      const updated = await getOrdine(id)
      setOrdine(updated)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Errore nella richiesta di reso')
    } finally {
      setResoLoading(false)
    }
  }

  if (loading) {
    return (
      <StoreLayout>
        <div className="page-loading">Caricamento ordine...</div>
      </StoreLayout>
    )
  }

  if (!cliente) {
    return <Navigate to="/store/login" replace state={{ from: location }} />
  }

  if (orderLoading) {
    return (
      <StoreLayout>
        <div className="page-loading">Caricamento ordine...</div>
      </StoreLayout>
    )
  }

  if (error && !ordine) {
    return (
      <StoreLayout>
        <div className="alert alert-error">{error}</div>
      </StoreLayout>
    )
  }

  if (!ordine) {
    return (
      <StoreLayout>
        <div className="alert alert-error">Ordine non trovato</div>
      </StoreLayout>
    )
  }

  const subtotale = ordine.subtotale ?? ordine.totale
  const speseSpedizione = ordine.spese_spedizione ?? 0

  return (
    <StoreLayout>
      <div className="order-detail-page">
        <div className="order-detail-container">
          <div className="order-detail-header">
            <Link to="/store/ordini" className="btn btn-outline btn-sm">← Torna agli ordini</Link>
            <h1>Ordine {ordine.numero_ordine}</h1>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {resoMessage && <div className="alert alert-success">{resoMessage}</div>}

          {(ordine.cliente_nome || ordine.cliente_email) && (
            <div className="order-section">
              <h2>👤 Dati cliente</h2>
              <div className="order-detail-info">
                {(ordine.cliente_nome || ordine.cliente_cognome) && (
                  <div className="info-row">
                    <span>Nome:</span>
                    <span>{ordine.cliente_nome} {ordine.cliente_cognome}</span>
                  </div>
                )}
                {ordine.cliente_email && (
                  <div className="info-row">
                    <span>Email:</span>
                    <span>{ordine.cliente_email}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="order-detail-info">
            <div className="info-row">
              <span>Stato:</span>
              <span className="order-status-badge">{ordine.stato.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div className="info-row">
              <span>Data ordine:</span>
              <span>{new Date(ordine.data_ordine).toLocaleDateString('it-IT')}</span>
            </div>
            {ordine.data_spedizione && (
              <div className="info-row">
                <span>Data spedizione:</span>
                <span>{new Date(ordine.data_spedizione).toLocaleDateString('it-IT')}</span>
              </div>
            )}
            {ordine.data_consegna && (
              <div className="info-row">
                <span>Data consegna:</span>
                <span>{new Date(ordine.data_consegna).toLocaleDateString('it-IT')}</span>
              </div>
            )}
            {ordine.data_stimata_consegna && (
              <div className="info-row">
                <span>Consegna stimata:</span>
                <span>{new Date(ordine.data_stimata_consegna).toLocaleDateString('it-IT')}</span>
              </div>
            )}
            {ordine.metodo_pagamento && (
              <div className="info-row">
                <span>Metodo pagamento:</span>
                <span>{ordine.metodo_pagamento}</span>
              </div>
            )}
          </div>

          {ordine.indirizzo_spedizione && (
            <div className="order-section">
              <h2>📍 Indirizzo di spedizione</h2>
              <div className="order-detail-info">
                <div className="info-row">
                  <span>{ordine.indirizzo_spedizione}</span>
                </div>
              </div>
            </div>
          )}

          {(ordine.corriere || ordine.tracking_number) && (
            <div className="order-section">
              <h2>🚚 Tracciamento spedizione</h2>
              <div className="order-detail-info">
                {ordine.corriere && (
                  <div className="info-row">
                    <span>Corriere:</span>
                    <span>{ordine.corriere}</span>
                  </div>
                )}
                {ordine.tracking_number && (
                  <div className="info-row">
                    <span>Codice tracking:</span>
                    <span><strong>{ordine.tracking_number}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="order-items-section">
            <h2>📦 Articoli</h2>
            <div className="order-items-list">
              {ordine.items.map((item) => (
                <div key={item.id} className="order-item">
                  {item.immagine_url && (
                    <img src={item.immagine_url} alt={item.nome_prodotto} className="order-item-img" />
                  )}
                  <div className="order-item-info">
                    <p className="order-item-name">{item.nome_prodotto}</p>
                    <p className="order-item-qty">Quantità: {item.quantita}</p>
                    <p className="order-item-price">€ {item.prezzo_unitario.toFixed(2)} cad.</p>
                    {item.subtotale != null && (
                      <p className="order-item-subtotal"><strong>Subtotale: € {item.subtotale.toFixed(2)}</strong></p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="order-section order-totals">
            <h2>💶 Riepilogo</h2>
            <div className="order-detail-info">
              <div className="info-row">
                <span>Subtotale prodotti:</span>
                <span>€ {subtotale.toFixed(2)}</span>
              </div>
              <div className="info-row">
                <span>Spese di spedizione:</span>
                <span>{speseSpedizione > 0 ? `€ ${speseSpedizione.toFixed(2)}` : 'Gratuite'}</span>
              </div>
              <div className="info-row info-row-total">
                <span>Totale finale:</span>
                <span>€ {ordine.totale.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {ordine.stato === 'consegnato' && (
            <div className="reso-section">
              {isResoDisponibile() ? (
                <>
                  <div className="reso-info">
                    <p>⏰ Hai ancora <strong>{giorniRimanentiReso()} giorni</strong> per richiedere il reso.</p>
                  </div>
                  {!showResoForm ? (
                    <button onClick={() => setShowResoForm(true)} className="btn btn-danger">
                      🔄 Fai il reso
                    </button>
                  ) : (
                    <form onSubmit={handleReso} className="reso-form">
                      <div className="form-group">
                        <label htmlFor="motivo">Motivo del reso *</label>
                        <textarea
                          id="motivo"
                          value={motivoReso}
                          onChange={(e) => setMotivoReso(e.target.value)}
                          placeholder="Descrivi il motivo per cui vuoi restituire il prodotto..."
                          rows={4}
                          required
                        />
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn btn-danger" disabled={resoLoading}>
                          {resoLoading ? 'Invio in corso...' : 'Conferma reso'}
                        </button>
                        <button type="button" onClick={() => setShowResoForm(false)} className="btn btn-outline">
                          Annulla
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <div className="reso-expired">
                  <p>⚠️ Il periodo per il reso è scaduto (14 giorni dalla consegna).</p>
                </div>
              )}
            </div>
          )}

          {ordine.stato === 'reso_richiesto' && (
            <div className="reso-section reso-pending">
              <p>📋 Richiesta di reso inviata il {new Date(ordine.data_richiesta_reso).toLocaleDateString('it-IT')}</p>
              {ordine.motivo_reso && <p><strong>Motivo:</strong> {ordine.motivo_reso}</p>}
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  )
}
