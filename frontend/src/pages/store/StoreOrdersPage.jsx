import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { getOrdini } from '../../api/clientiAuth'
import { useClientiAuth } from '../../context/ClientiAuthContext'

const STATO_LABELS = {
  in_attesa: { label: 'In attesa', color: '#f59e0b' },
  confermato: { label: 'Confermato', color: '#3b82f6' },
  spedito: { label: 'Spedito', color: '#8b5cf6' },
  consegnato: { label: 'Consegnato', color: '#10b981' },
  reso_richiesto: { label: 'Reso richiesto', color: '#ef4444' },
  reso_approvato: { label: 'Reso approvato', color: '#6b7280' },
  annullato: { label: 'Annullato', color: '#6b7280' },
}

export default function StoreOrdersPage() {
  const { cliente, loading } = useClientiAuth()
  const location = useLocation()
  const [ordini, setOrdini] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!cliente) return

    getOrdini()
      .then(setOrdini)
      .catch((err) => setError(err.response?.data?.detail || err.message || 'Errore nel caricamento ordini'))
      .finally(() => setOrdersLoading(false))
  }, [cliente])

  if (loading) {
    return (
      <StoreLayout>
        <div className="page-loading">Caricamento ordini...</div>
      </StoreLayout>
    )
  }

  if (!cliente) {
    return <Navigate to="/store/login" replace state={{ from: location }} />
  }

  return (
    <StoreLayout>
      <div className="orders-page">
        <div className="orders-container">
          <div className="orders-header">
            <h1>I miei Ordini</h1>
            <Link to="/store/account" className="btn btn-outline btn-sm">← Account</Link>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {ordersLoading ? (
            <div className="page-loading">Caricamento ordini...</div>
          ) : ordini.length === 0 ? (
            <div className="empty-state">
              <p>📦 Non hai ancora effettuato ordini.</p>
              <Link to="/store" className="btn btn-primary">Vai allo Store</Link>
            </div>
          ) : (
            <div className="orders-list">
              {ordini.map((ordine) => {
                const stato = STATO_LABELS[ordine.stato] || { label: ordine.stato, color: '#6b7280' }
                return (
                  <Link to={`/store/ordini/${ordine.id}`} key={ordine.id} className="order-card">
                    <div className="order-card-header">
                      <span className="order-number">{ordine.numero_ordine}</span>
                      <span className="order-status" style={{ backgroundColor: stato.color }}>
                        {stato.label}
                      </span>
                    </div>
                    <div className="order-card-body">
                      <p className="order-date">
                        {new Date(ordine.data_ordine).toLocaleDateString('it-IT', {
                          day: '2-digit', month: 'long', year: 'numeric',
                        })}
                      </p>
                      <p className="order-total">€ {ordine.totale.toFixed(2)}</p>
                      <p className="order-items-count">
                        {ordine.items?.length || 0} {ordine.items?.length === 1 ? 'articolo' : 'articoli'}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  )
}
