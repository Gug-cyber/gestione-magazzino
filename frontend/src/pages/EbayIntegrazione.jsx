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
    const res = await ebayApi.getConnectUrl()
    window.location.href = res.data.auth_url
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
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 16 }}>
      <div className="gm-card" style={{ padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Integrazione eBay</h2>
        {!connection.connected ? (
          <button className="gm-btn gm-btn-primary" onClick={handleConnect}>Collega account eBay</button>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Account: <strong>{connection.account_id || 'N/D'}</strong></span>
              <span style={{ background: '#e8f5e9', color: '#2e7d32', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>Connesso</span>
              <button className="gm-btn gm-btn-danger gm-btn-sm" onClick={handleDisconnect}>Disconnetti</button>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: 4 }}>
                Fee eBay %
                <input
                  type="number"
                  step="0.01"
                  value={settings.fee_percentage}
                  onChange={(e) => setSettings((prev) => ({ ...prev, fee_percentage: e.target.value }))}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                Marketplace
                <select
                  value={settings.marketplace_id}
                  onChange={(e) => setSettings((prev) => ({ ...prev, marketplace_id: e.target.value }))}
                >
                  {MARKETPLACES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <button className="gm-btn gm-btn-secondary" onClick={handleSaveSettings} disabled={saving}>Salva impostazioni</button>
              <button className="gm-btn gm-btn-primary" onClick={handleSyncOrders}>Sincronizza ordini eBay</button>
              <button className="gm-btn gm-btn-secondary" onClick={() => navigate('/prodotti')}>Vai ai prodotti</button>
            </div>
          </div>
        )}
        {message && <div style={{ marginTop: 8 }}>{message}</div>}
      </div>

      <div className="gm-card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Annunci eBay</h3>
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
                      <a className="gm-btn gm-btn-sm" href={`https://www.ebay.it/itm/${l.ebay_listing_id}`} target="_blank" rel="noreferrer">Apri eBay</a>
                    )}
                  </td>
                </tr>
              ))}
              {listings.length === 0 && <tr><td colSpan={8}>Nessun annuncio</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="gm-card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Vendite recenti</h3>
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
      </div>
    </div>
  )
}

export default EbayIntegrazione
