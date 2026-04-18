import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ebayApi } from '../api/ebay'

const MARKETPLACES = ['EBAY_IT', 'EBAY_DE', 'EBAY_FR', 'EBAY_ES', 'EBAY_GB', 'EBAY_US']

function EbayIntegrazione() {
  const navigate = useNavigate()
  const [connection, setConnection] = useState({ connected: false })
  const [listings, setListings] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [settings, setSettings] = useState({ fee_percentage: 13.25, marketplace_id: 'EBAY_IT' })
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [connRes, listingsRes, salesRes] = await Promise.all([
        ebayApi.getConnectionStatus(),
        ebayApi.getListings(),
        ebayApi.getSales(),
      ])
      setConnection(connRes.data)
      setListings(listingsRes.data || [])
      setSales(salesRes.data || [])
      setSettings({
        fee_percentage: connRes.data?.fee_percentage ?? 13.25,
        marketplace_id: connRes.data?.marketplace_id ?? 'EBAY_IT',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleConnect = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await ebayApi.getConnectUrl(token)
      if (res.data?.auth_url) {
        window.location.href = res.data.auth_url
      } else {
        setMessage('Errore: URL di autorizzazione eBay non ricevuto.')
      }
    } catch (e) {
      setMessage(e?.response?.data?.detail || 'Errore durante la connessione a eBay')
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setMessage('')
    try {
      await ebayApi.updateSettings(settings)
      setMessage('Impostazioni salvate')
      await loadData()
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Errore salvataggio impostazioni')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    await ebayApi.disconnect()
    await loadData()
  }

  const handleSyncOrders = async () => {
    const res = await ebayApi.syncOrders()
    setMessage(`Sync completata: ${res.data.processed} processati, ${res.data.skipped} saltati`)
    await loadData()
  }

  const badgeColor = (status) => {
    if (status === 'active') return '#2e7d32'
    if (status === 'error') return '#c62828'
    if (status === 'out_of_stock') return '#ef6c00'
    if (status === 'ended') return '#455a64'
    return '#6c757d'
  }

  if (loading) return <div>Caricamento integrazione eBay...</div>

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 16, padding: isMobile ? '0 4px' : 0 }}>
      {/* Connection card */}
      <div className="gm-card" style={{ padding: isMobile ? 12 : 16 }}>
        <h2 style={{ marginTop: 0, fontSize: isMobile ? 'clamp(1.1rem, 4vw, 1.4rem)' : undefined }}>Integrazione eBay</h2>
        {!connection.connected ? (
          <button
            className="gm-btn gm-btn-primary"
            onClick={handleConnect}
            style={{ minHeight: 44, width: isMobile ? '100%' : 'auto', fontSize: 16 }}
          >
            Collega account eBay
          </button>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Account eBay: <strong>{connection.account_id || 'Account collegato'}</strong></span>
              <span style={{ background: '#e8f5e9', color: '#2e7d32', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>Connesso</span>
              <button
                className="gm-btn gm-btn-danger gm-btn-sm"
                onClick={handleDisconnect}
                style={{ minHeight: 44 }}
              >
                Disconnetti
              </button>
            </div>

            {/* Settings block */}
            <div style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: isMobile ? 'stretch' : 'flex-end',
              flexDirection: isMobile ? 'column' : 'row',
            }}>
              <label style={{ display: 'grid', gap: 4, width: isMobile ? '100%' : 'auto' }}>
                Fee eBay %
                <input
                  type="number"
                  step="0.01"
                  value={settings.fee_percentage}
                  onChange={(e) => setSettings((prev) => ({ ...prev, fee_percentage: e.target.value }))}
                  style={{ fontSize: 16, width: isMobile ? '100%' : 'auto', minHeight: 44, boxSizing: 'border-box' }}
                />
              </label>
              <label style={{ display: 'grid', gap: 4, width: isMobile ? '100%' : 'auto' }}>
                Marketplace
                <select
                  value={settings.marketplace_id}
                  onChange={(e) => setSettings((prev) => ({ ...prev, marketplace_id: e.target.value }))}
                  style={{ fontSize: 16, width: isMobile ? '100%' : 'auto', minHeight: 44, boxSizing: 'border-box' }}
                >
                  {MARKETPLACES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <button
                className="gm-btn gm-btn-secondary"
                onClick={handleSaveSettings}
                disabled={saving}
                style={{ minHeight: 44, width: isMobile ? '100%' : 'auto', fontSize: isMobile ? 16 : undefined }}
              >
                Salva impostazioni
              </button>
              <button
                className="gm-btn gm-btn-primary"
                onClick={handleSyncOrders}
                style={{ minHeight: 44, width: isMobile ? '100%' : 'auto', fontSize: isMobile ? 16 : undefined }}
              >
                Sincronizza ordini eBay
              </button>
              <button
                className="gm-btn gm-btn-secondary"
                onClick={() => navigate('/prodotti')}
                style={{ minHeight: 44, width: isMobile ? '100%' : 'auto', fontSize: isMobile ? 16 : undefined }}
              >
                Vai ai prodotti
              </button>
            </div>
          </div>
        )}
        {message && <div style={{ marginTop: 8 }}>{message}</div>}
      </div>

      {/* Listings */}
      <div className="gm-card" style={{ padding: isMobile ? 12 : 16 }}>
        <h3 style={{ marginTop: 0, fontSize: isMobile ? 'clamp(1rem, 3.5vw, 1.2rem)' : undefined }}>Annunci eBay</h3>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {listings.length === 0 && <div>Nessun annuncio</div>}
            {listings.map((l) => (
              <div key={l.id} style={{ background: '#fafafa', borderRadius: 10, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e8e8e8' }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#1a1a2e' }}>{l.product_nome}</div>
                <div style={{ fontSize: 13, color: '#555', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><strong>SKU:</strong> {l.product_sku}</div>
                  <div><strong>Prezzo pubblicato:</strong> {l.published_price ? `€${Number(l.published_price).toFixed(2)}` : '—'}</div>
                  <div><strong>Netto atteso:</strong> {l.expected_net_price ? `€${Number(l.expected_net_price).toFixed(2)}` : '—'}</div>
                  <div><strong>Quantità:</strong> {l.quantity_published}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong>Status:</strong>
                    <span style={{ background: badgeColor(l.status), color: 'white', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}>{l.status}</span>
                  </div>
                  <div><strong>Ultima sync:</strong> {l.last_sync_at ? new Date(l.last_sync_at).toLocaleString() : '—'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  <button
                    className="gm-btn gm-btn-secondary"
                    style={{ minHeight: 44, fontSize: 15, width: '100%' }}
                    onClick={async () => { await ebayApi.syncListingQuantity(l.id); await loadData() }}
                  >
                    Sincronizza quantità
                  </button>
                  <button
                    className="gm-btn gm-btn-danger"
                    style={{ minHeight: 44, fontSize: 15, width: '100%' }}
                    onClick={async () => { await ebayApi.endListing(l.id); await loadData() }}
                  >
                    Termina annuncio
                  </button>
                  {l.ebay_listing_id && (
                    <a
                      className="gm-btn"
                      href={`https://www.ebay.it/itm/${l.ebay_listing_id}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ minHeight: 44, fontSize: 15, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}
                    >
                      Apri eBay (nuova scheda)
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Prodotto</th><th>SKU</th><th>Prezzo pubblicato</th><th>Netto atteso</th><th>Quantità</th><th>Status</th><th>Ultima sync</th><th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <td>{l.product_nome}</td>
                    <td>{l.product_sku}</td>
                    <td>{l.published_price ? `€${Number(l.published_price).toFixed(2)}` : '—'}</td>
                    <td>{l.expected_net_price ? `€${Number(l.expected_net_price).toFixed(2)}` : '—'}</td>
                    <td>{l.quantity_published}</td>
                    <td><span style={{ background: badgeColor(l.status), color: 'white', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}>{l.status}</span></td>
                    <td>{l.last_sync_at ? new Date(l.last_sync_at).toLocaleString() : '—'}</td>
                    <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="gm-btn gm-btn-secondary gm-btn-sm" onClick={async () => { await ebayApi.syncListingQuantity(l.id); await loadData() }}>Sincronizza quantità</button>
                      <button className="gm-btn gm-btn-danger gm-btn-sm" onClick={async () => { await ebayApi.endListing(l.id); await loadData() }}>Termina annuncio</button>
                      {l.ebay_listing_id && (
                        <a className="gm-btn gm-btn-sm" href={`https://www.ebay.it/itm/${l.ebay_listing_id}`} target="_blank" rel="noreferrer">
                          Apri eBay (nuova scheda)
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {listings.length === 0 && <tr><td colSpan={8}>Nessun annuncio</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sales */}
      <div className="gm-card" style={{ padding: isMobile ? 12 : 16 }}>
        <h3 style={{ marginTop: 0, fontSize: isMobile ? 'clamp(1rem, 3.5vw, 1.2rem)' : undefined }}>Vendite recenti</h3>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sales.length === 0 && <div>Nessuna vendita sincronizzata</div>}
            {sales.map((s) => (
              <div key={s.id} style={{ background: '#fafafa', borderRadius: 10, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e8e8e8' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#1a1a2e', fontFamily: 'monospace' }}>{s.ebay_order_id}</div>
                <div style={{ fontSize: 13, color: '#555', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><strong>Prodotto:</strong> {s.product_id || 'N/D'}</div>
                  <div><strong>Quantità:</strong> {s.quantity_sold}</div>
                  <div><strong>Lordo:</strong> {s.gross_amount != null ? `€${Number(s.gross_amount).toFixed(2)}` : '—'}</div>
                  <div><strong>Fee:</strong> {s.fee_amount != null ? `€${Number(s.fee_amount).toFixed(2)}` : '—'}</div>
                  <div><strong>Netto:</strong> {s.net_amount != null ? `€${Number(s.net_amount).toFixed(2)}` : '—'}</div>
                  <div><strong>Data:</strong> {s.sold_at ? new Date(s.sold_at).toLocaleString() : '—'}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Order ID eBay</th><th>Prodotto</th><th>Quantità venduta</th><th>Lordo</th><th>Fee</th><th>Netto</th><th>Data vendita</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td>{s.ebay_order_id}</td>
                    <td>{s.product_id || 'N/D'}</td>
                    <td>{s.quantity_sold}</td>
                    <td>{s.gross_amount != null ? `€${Number(s.gross_amount).toFixed(2)}` : '—'}</td>
                    <td>{s.fee_amount != null ? `€${Number(s.fee_amount).toFixed(2)}` : '—'}</td>
                    <td>{s.net_amount != null ? `€${Number(s.net_amount).toFixed(2)}` : '—'}</td>
                    <td>{s.sold_at ? new Date(s.sold_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
                {sales.length === 0 && <tr><td colSpan={7}>Nessuna vendita sincronizzata</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default EbayIntegrazione
