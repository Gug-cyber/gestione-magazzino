import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { useClienteAuth } from '../../context/ClienteAuthContext'
import { storeAPI } from '../../api/store'

function statoStyle(stato) {
  switch (stato) {
    case 'in_attesa':      return { bg: '#fff7ed', color: '#c2410c' }
    case 'confermato':     return { bg: '#eff6ff', color: '#1d4ed8' }
    case 'spedito':        return { bg: '#f0fdf4', color: '#16a34a' }
    case 'consegnato':     return { bg: '#dcfce7', color: '#15803d' }
    case 'annullato':      return { bg: '#fff0f0', color: '#dc2626' }
    case 'reso_richiesto': return { bg: '#fefce8', color: '#ca8a04' }
    default:               return { bg: 'var(--color-primary-bg, #eff6ff)', color: 'var(--color-primary)' }
  }
}

function statoLabel(stato) {
  const labels = {
    in_attesa: 'In attesa',
    confermato: 'Confermato',
    spedito: 'Spedito',
    consegnato: 'Consegnato',
    annullato: 'Annullato',
    reso_richiesto: 'Reso richiesto',
  }
  return labels[stato] || stato?.replace(/_/g, ' ') || '—'
}

export default function StoreOrdiniPage() {
  const { cliente, loading } = useClienteAuth()
  const navigate = useNavigate()
  const [ordini, setOrdini] = useState([])
  const [ordiniLoading, setOrdiniLoading] = useState(true)
  const [ordiniError, setOrdiniError] = useState(null)

  useEffect(() => {
    if (!loading && !cliente) {
      navigate('/store/login', { replace: true })
    }
  }, [cliente, loading, navigate])

  useEffect(() => {
    if (cliente) {
      storeAPI.clienteOrdini()
        .then(res => setOrdini(res.data))
        .catch(() => setOrdiniError('Impossibile caricare gli ordini.'))
        .finally(() => setOrdiniLoading(false))
    }
  }, [cliente])

  if (loading) {
    return (
      <StoreLayout>
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--color-text-secondary)' }}>
          Caricamento…
        </div>
      </StoreLayout>
    )
  }

  if (!cliente) return null

  return (
    <StoreLayout>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 0' }}>
        <Link to="/store/account" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          color: 'var(--color-text-secondary)', textDecoration: 'none',
          fontSize: '14px', marginBottom: '24px',
        }}>
          ← Torna all'account
        </Link>

        <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text)', marginBottom: '24px' }}>
          📦 I miei ordini
        </h1>

        {ordiniLoading && (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Caricamento ordini…
          </div>
        )}

        {ordiniError && (
          <div style={{
            background: 'var(--color-danger-bg, #fff0f0)',
            border: '1px solid var(--color-danger-border, #fca5a5)',
            color: 'var(--color-danger, #dc2626)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '14px',
          }}>
            {ordiniError}
          </div>
        )}

        {!ordiniLoading && !ordiniError && ordini.length === 0 && (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            background: 'var(--color-bg-elevated)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            fontSize: '14px',
          }}>
            Non hai ancora effettuato ordini.{' '}
            <Link to="/store" style={{ color: 'var(--color-primary)', fontWeight: '600', textDecoration: 'none' }}>
              Vai allo store
            </Link>
          </div>
        )}

        {!ordiniLoading && ordini.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {ordini.map(ordine => {
              const { bg, color } = statoStyle(ordine.stato)

              // Calcolo subtotale prodotti
              const subtotaleProdotti = ordine.items
                ? ordine.items.reduce((sum, item) => sum + Number(item.subtotale ?? (item.prezzo_unitario * item.quantita) ?? 0), 0)
                : Number(ordine.subtotale ?? ordine.totale ?? 0)

              const speseSpedizione = Number(ordine.spese_spedizione ?? 0)
              const totaleFinale = Number(ordine.totale ?? 0)

              return (
                <div
                  key={ordine.id}
                  style={{
                    background: 'var(--color-bg-elevated)',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border)',
                    overflow: 'hidden',
                  }}
                >
                  {/* ── Header ordine ── */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: '8px',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                  }}>
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--color-text)', fontSize: '15px' }}>
                        Ordine {ordine.numero_ordine ? `#${ordine.numero_ordine}` : `#${ordine.id}`}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {ordine.data_ordine
                          ? new Date(ordine.data_ordine).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
                          : '—'}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '12px', fontWeight: '600',
                      padding: '4px 12px', borderRadius: '999px',
                      background: bg, color,
                    }}>
                      {statoLabel(ordine.stato)}
                    </span>
                  </div>

                  {/* ── Prodotti ── */}
                  {ordine.items && ordine.items.length > 0 && (
                    <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {ordine.items.map((item, idx) => (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          fontSize: '14px', color: 'var(--color-text)',
                        }}>
                          {item.immagine_url && (
                            <img
                              src={item.immagine_url}
                              alt={item.nome_prodotto || item.nome}
                              style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                              onError={e => { e.target.style.display = 'none' }}
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.nome_prodotto || item.nome || '—'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                              Qtà: {item.quantita} · €{Number(item.prezzo_unitario ?? 0).toFixed(2)} cad.
                            </div>
                          </div>
                          <div style={{ fontWeight: '600', flexShrink: 0 }}>
                            €{Number(item.subtotale ?? (item.prezzo_unitario * item.quantita) ?? 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Riepilogo costi ── */}
                  <div style={{
                    borderTop: '1px solid var(--color-border)',
                    padding: '12px 20px',
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    fontSize: '14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                      <span>Subtotale</span>
                      <span>€{subtotaleProdotti.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                      <span>Spedizione</span>
                      <span>{speseSpedizione > 0 ? `€${speseSpedizione.toFixed(2)}` : 'Gratuita'}</span>
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontWeight: '700', fontSize: '15px',
                      color: 'var(--color-text)',
                      borderTop: '1px solid var(--color-border)',
                      paddingTop: '8px', marginTop: '2px',
                    }}>
                      <span>Totale</span>
                      <span>€{totaleFinale.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* ── Dettagli aggiuntivi ── */}
                  <div style={{
                    borderTop: '1px solid var(--color-border)',
                    padding: '12px 20px',
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    fontSize: '13px', color: 'var(--color-text-secondary)',
                  }}>
                    {/* Metodo di pagamento */}
                    {ordine.metodo_pagamento && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ minWidth: '140px', fontWeight: '500', color: 'var(--color-text)' }}>Metodo di pagamento</span>
                        <span style={{ textTransform: 'capitalize' }}>
                          {ordine.metodo_pagamento.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}

                    {/* Indirizzo di spedizione */}
                    {ordine.indirizzo_spedizione && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ minWidth: '140px', fontWeight: '500', color: 'var(--color-text)', flexShrink: 0 }}>Indirizzo spedizione</span>
                        <span>{ordine.indirizzo_spedizione}</span>
                      </div>
                    )}

                    {/* Corriere + tracking */}
                    {ordine.corriere && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ minWidth: '140px', fontWeight: '500', color: 'var(--color-text)' }}>Corriere</span>
                        <span>{ordine.corriere}</span>
                      </div>
                    )}
                    {ordine.tracking_number && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ minWidth: '140px', fontWeight: '500', color: 'var(--color-text)' }}>Tracking</span>
                        <span style={{ fontFamily: 'monospace' }}>{ordine.tracking_number}</span>
                      </div>
                    )}

                    {/* Data stimata consegna */}
                    {ordine.data_stimata_consegna && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ minWidth: '140px', fontWeight: '500', color: 'var(--color-text)' }}>Consegna prevista</span>
                        <span>
                          {new Date(ordine.data_stimata_consegna).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    )}

                    {/* Note */}
                    {ordine.note && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ minWidth: '140px', fontWeight: '500', color: 'var(--color-text)', flexShrink: 0 }}>Note</span>
                        <span style={{ fontStyle: 'italic' }}>{ordine.note}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </StoreLayout>
  )
}
