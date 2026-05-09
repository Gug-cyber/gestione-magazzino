import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
/* TEMPORANEAMENTE DISABILITATO - CardMarket e CardTrader API issues */
// import { prodottiAPI, categorieAPI, ubicazioniAPI, getFotoUrl, ebayAPI, cardtraderAPI, cardmarketScraperAPI } from '../api/client'
import { prodottiAPI, categorieAPI, ubicazioniAPI, getFotoUrl, ebayAPI } from '../api/client'
import { ebayApi } from '../api/ebay'
import StatoBadge from '../components/ui/StatoBadge'
import BarcodeDisplay from '../components/BarcodeDisplay'
import QRCodeDisplay from '../components/QRCodeDisplay'
import PrintBarcodeModal from '../components/PrintBarcodeModal'
import { STATO_CONSERVAZIONE_COLORS, PRIMARY_COLOR } from '../constants/colors'
import QRCode from 'qrcode'
import styles from './DettaglioProdotto.module.css'
import { flattenCategorieTree } from '../utils/categorieUtils'
import { normalizeSkuForCode39 } from '../utils/formatters'
import useExternalScanner from '../hooks/useExternalScanner'

const CONDIZIONE_MAP = {
  'Near Mint': 'NM', 'Mint': 'NM', 'Quasi Perfetto': 'NM',
  'Ottimo': 'EX', 'Excellent': 'EX',
  'Good': 'GD', 'Buono': 'GD',
  'Light Played': 'LP', 'Giocato': 'LP',
  'Poor': 'PO', 'Rovinato': 'PO',
}
const LINGUA_MAP = {
  'Inglese': 'en', 'Italiano': 'it', 'Tedesco': 'de',
  'Francese': 'fr', 'Spagnolo': 'es', 'Portoghese': 'pt',
  'Giapponese': 'ja', 'Cinese': 'zh-hans', 'Coreano': 'ko', 'Russo': 'ru',
}
const MANUAL_LISTING_PLATFORMS = ['vinted', 'wallapop']
const MANUAL_LISTING_LABELS = {
  non_pubblicare: 'Non pubblicare',
  da_pubblicare: 'Da pubblicare',
  pubblicato: 'Pubblicato',
  venduto: 'Venduto',
  rimosso: 'Rimosso',
  da_controllare: 'Da controllare',
}
const MANUAL_LISTING_COLORS = {
  non_pubblicare: { bg: '#2f3640', color: '#d2dae2' },
  da_pubblicare: { bg: '#5a4fcf', color: '#f5f3ff' },
  pubblicato: { bg: '#1f8f4a', color: '#ecfff3' },
  venduto: { bg: '#5f6b7a', color: '#eef2f7' },
  rimosso: { bg: '#8b3f3f', color: '#ffecec' },
  da_controllare: { bg: '#c17000', color: '#fff4dd' },
}

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

const getDefaultManualListing = (platform, prodotto) => {
  const active = platform === 'vinted' ? Boolean(prodotto?.su_vinted) : Boolean(prodotto?.su_wallapop)
  return {
    id: null,
    platform,
    active,
    status: active ? 'da_pubblicare' : 'non_pubblicare',
    platform_price: '',
    listing_url: '',
    published_at: null,
    sold_at: null,
    removed_at: null,
    notes: '',
  }
}

function QuantitaChart({ storico }) {
  if (!storico || storico.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '32px 0' }}>Nessun movimento registrato</p>
  }

  const W = 600
  const H = 200
  const padLeft = 48
  const padRight = 16
  const padTop = 16
  const padBottom = 36

  const values = storico.map(s => s.quantita)
  const minVal = Math.min(0, ...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  const n = storico.length
  const xStep = (W - padLeft - padRight) / Math.max(n - 1, 1)

  const toX = (i) => padLeft + i * xStep
  const toY = (v) => padTop + (H - padTop - padBottom) * (1 - (v - minVal) / range)

  // Y axis labels - deduplicate to avoid showing same value twice
  const yLabelsRaw = []
  const steps = 4
  for (let i = 0; i <= steps; i++) {
    const v = minVal + (range * i) / steps
    yLabelsRaw.push({ v: Math.round(v), y: toY(v) })
  }
  // Remove duplicate values
  const seen = new Set()
  const yLabels = yLabelsRaw.filter(({ v }) => {
    if (seen.has(v)) return false
    seen.add(v)
    return true
  })

  // Polyline points
  const points = storico.map((s, i) => `${toX(i)},${toY(s.quantita)}`).join(' ')

  // Format date DD/MM
  const fmtDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  // X axis labels (show max 8)
  const xLabelStep = Math.max(1, Math.floor(n / 8))
  const xLabels = storico
    .map((s, i) => ({ i, label: fmtDate(s.data) }))
    .filter((_, i) => i === 0 || i === n - 1 || i % xLabelStep === 0)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {/* Y axis labels */}
      {yLabels.map(({ v, y }, i) => (
        <g key={i}>
          <line x1={padLeft - 4} y1={y} x2={W - padRight} y2={y}
            stroke="var(--color-border-subtle)" strokeWidth="1" />
          <text x={padLeft - 8} y={y + 4} textAnchor="end"
            fontSize="10" fill="var(--color-text-muted)">{v}</text>
        </g>
      ))}

      {/* X axis */}
      <line x1={padLeft} y1={H - padBottom} x2={W - padRight} y2={H - padBottom}
        stroke="var(--color-border)" strokeWidth="1" />

      {/* X axis labels */}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={toX(i)} y={H - padBottom + 14}
          textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">{label}</text>
      ))}

      {/* Line */}
      {n > 1 && (
        <polyline points={points} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" />
      )}

      {/* Dots */}
      {storico.map((s, i) => (
        <circle key={i} cx={toX(i)} cy={toY(s.quantita)} r="4"
          fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="1.5">
          <title>{`${fmtDate(s.data)}: ${s.quantita} (${s.tipo} ${s.variazione > 0 ? '+' : ''}${s.variazione})`}</title>
        </circle>
      ))}
    </svg>
  )
}

const PAGE_SIZE = 20

function DettaglioProdotto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const fromPage = location.state?.fromPage
  const [scheda, setScheda] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [movPage, setMovPage] = useState(0)
  const [showEditForm, setShowEditForm] = useState(false)
  const [form, setForm] = useState({})
  const [formError, setFormError] = useState('')
  const [categorie, setCategorie] = useState([])
  const [ubicazioni, setUbicazioni] = useState([])
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [fotoError, setFotoError] = useState('')
  const [generatingBarcode, setGeneratingBarcode] = useState(false)
  const [barcodeError, setBarcodeError] = useState('')
  const [showPrintModal, setShowPrintModal] = useState(false)
  const fotoInputRef = useRef(null)
  const fotoAggiuntiveInputRef = useRef(null)
  const [uploadingFotoAggiuntiva, setUploadingFotoAggiuntiva] = useState(false)
  const [fotoAggiuntiveError, setFotoAggiuntiveError] = useState('')
  const [fotoRotazioni, setFotoRotazioni] = useState({})

  const ruotaFoto = (idx, verso) => {
    setFotoRotazioni(prev => {
      const corrente = prev[idx] || 0
      const nuova = (corrente + (verso === 'destra' ? 90 : -90) + 360) % 360
      return { ...prev, [idx]: nuova }
    })
  }

  const salvaRotazione = async (idx) => {
    const gradi = fotoRotazioni[idx] || 0
    if (gradi === 0) return
    try {
      await prodottiAPI.ruotaFotoAggiuntiva(id, idx, gradi)
      setFotoRotazioni(prev => { const n = { ...prev }; delete n[idx]; return n })
      loadScheda()
    } catch (err) {
      setFotoAggiuntiveError('Errore nel salvataggio della rotazione')
    }
  }

  // --- Scanner hardware: intercetta scansioni anche dalla pagina dettaglio ---
  const scanProcessingRef = useRef(false)
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const handleExternalScan = useCallback(async (value) => {
    if (scanProcessingRef.current) return
    scanProcessingRef.current = true
    try {
      // Formato QR personalizzato "prodotto:123"
      if (/^prodotto:\d+$/i.test(value)) {
        navigate(`/prodotti/${value.split(':')[1]}`)
        return
      }
      // Cerca per barcode
      try {
        const res = await prodottiAPI.lookupByBarcode(value)
        if (res.data?.id) {
          navigate(`/prodotti/${res.data.id}`)
          return
        }
      } catch (err) {
        if (err.response?.status !== 404) {
          console.error('Errore lookup barcode:', err)
          return
        }
      }
      // Fallback: cerca per SKU
      const normalized = normalizeSkuForCode39(value)
      const res2 = await prodottiAPI.getAll({ search: normalized, limit: 5 })
      if (!isMountedRef.current) return
      const items = Array.isArray(res2.data) ? res2.data : (res2.data?.items || [])
      if (items.length === 1) {
        navigate(`/prodotti/${items[0].id}`)
        return
      }
      const exact = items.find(p => p.barcode === value || p.sku === value || p.sku === normalized)
      if (exact) {
        navigate(`/prodotti/${exact.id}`)
      }
    } finally {
      if (isMountedRef.current) {
        scanProcessingRef.current = false
      }
    }
  }, [navigate])

  useExternalScanner({ onScan: handleExternalScan, enabled: true })

  const [ebayData, setEbayData] = useState(null)
  const [ebayLoading, setEbayLoading] = useState(false)
  const [ebayError, setEbayError] = useState(null)
  const [ebayConnected, setEbayConnected] = useState(false)
  const [ebayListingAttivo, setEbayListingAttivo] = useState(false)

  // DISABILITATO - Sezione Google Drive rimossa
  // const [driveFolder, setDriveFolder] = useState(null)
  // const [driveImmagini, setDriveImmagini] = useState([])
  // const [driveLoading, setDriveLoading] = useState(false)
  // const [driveError, setDriveError] = useState('')
  // const [creatingFolder, setCreatingFolder] = useState(false)

  /* TEMPORANEAMENTE DISABILITATO - CardTrader API issues */
  // const [cardtraderData, setCardtraderData] = useState(null)
  // const [cardtraderLoading, setCardtraderLoading] = useState(false)
  // const [cardtraderError, setCardtraderError] = useState(null)

  /* TEMPORANEAMENTE DISABILITATO - CardMarket API issues */
  // const [cardmarketData, setCardmarketData] = useState(null)
  // const [cardmarketLoading, setCardmarketLoading] = useState(false)
  // const [cardmarketError, setCardmarketError] = useState(null)

  const loadScheda = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await prodottiAPI.getScheda(id)
      const data = res.data
      setScheda(data)
      // DISABILITATO - Sezione Google Drive rimossa
      // if (data.prodotto.google_drive_folder_id) {
      //   try {
      //     const storeRes = await prodottiAPI.getDriveImmagini(id)
      //     setDriveImmagini(storeRes.data.immagini || [])
      //     setDriveFolder({ folder_id: data.prodotto.google_drive_folder_id, folder_url: `https://drive.google.com/drive/folders/${data.prodotto.google_drive_folder_id}` })
      //   } catch {
      //     // ignora errori di caricamento immagini
      //   }
      // }
    } catch (err) {
      setError(err.response?.data?.detail || 'Prodotto non trovato')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadScheda()
    Promise.all([categorieAPI.getTree(), ubicazioniAPI.getAll()])
      .then(([c, u]) => { setCategorie(c.data || []); setUbicazioni(u.data) })
      .catch(() => {})
    ebayApi.getConnectionStatus()
      .then((res) => setEbayConnected(Boolean(res.data?.connected)))
      .catch(() => setEbayConnected(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    ebayApi.getListings()
      .then((res) => {
        const active = (res.data || []).some((listing) => Number(listing.product_id) === Number(id) && listing.status === 'active')
        setEbayListingAttivo(active)
      })
      .catch(() => setEbayListingAttivo(false))
  }, [id])

  const fetchEbayPrezzi = (prodotto) => {
    setEbayData(null)
    setEbayLoading(true)
    setEbayError(null)
    ebayAPI.getPrezzi(prodotto.nome, prodotto.stato_conservazione)
      .then(res => setEbayData(res.data))
      .catch(err => setEbayError(err.response?.data?.detail || 'Errore prezzi eBay'))
      .finally(() => setEbayLoading(false))
  }

  /* TEMPORANEAMENTE DISABILITATO - CardTrader API issues
  const fetchCardtraderPrezzi = (prodotto) => {
    setCardtraderData(null)
    setCardtraderLoading(true)
    setCardtraderError(null)
    const ctParams = {}
    const ctCondizione = CONDIZIONE_MAP[prodotto.stato_conservazione]
    const ctLingua = LINGUA_MAP[prodotto.lingua]
    if (ctCondizione) ctParams.condizione = ctCondizione
    if (ctLingua) ctParams.lingua = ctLingua
    cardtraderAPI.getMarketPrices(prodotto.cardtrader_blueprint_id, ctParams)
      .then(res => setCardtraderData(res.data))
      .catch(err => setCardtraderError(err.response?.data?.detail || 'Errore prezzi CardTrader'))
      .finally(() => setCardtraderLoading(false))
  }
  */

  /* TEMPORANEAMENTE DISABILITATO - CardMarket API issues
  const fetchCardmarketPrezzi = (prodotto) => {
    setCardmarketData(null)
    setCardmarketLoading(true)
    setCardmarketError(null)
    cardmarketScraperAPI.getPrezziCached(prodotto.id)
      .then(res => {
        if (res.data) {
          setCardmarketData(res.data)
        }
      })
      .catch((err) => { console.debug('CardMarket cache not available:', err?.response?.status) })
      .finally(() => setCardmarketLoading(false))
  }

  const refreshCardmarket = () => {
    if (!scheda) return
    setCardmarketLoading(true)
    setCardmarketError(null)
    cardmarketScraperAPI.scrapePrezzi(scheda.prodotto.id, true)
      .then(res => setCardmarketData(res.data))
      .catch(err => setCardmarketError(err.response?.data?.detail || 'Errore prezzi CardMarket'))
      .finally(() => setCardmarketLoading(false))
  }
  */

  useEffect(() => {
    if (!scheda) return
    const { prodotto } = scheda
    fetchEbayPrezzi(prodotto)
    // TEMPORANEAMENTE DISABILITATO - CardMarket API issues
    // fetchCardmarketPrezzi(prodotto)
    // TEMPORANEAMENTE DISABILITATO - CardTrader API issues
    // if (prodotto.cardtrader_blueprint_id) {
    //   fetchCardtraderPrezzi(prodotto)
    // }
  }, [scheda?.prodotto?.id])

  const refreshEbay = () => {
    if (!scheda) return
    fetchEbayPrezzi(scheda.prodotto)
  }

  // DISABILITATO - Sezione Google Drive rimossa
  // const handleCreaCartellaDrive = async () => { ... }
  // const handleRicaricaDrive = async () => { ... }
  // const handleSetMainPhoto = async (url) => { ... }

  const handleEditOpen = () => {
    const p = scheda.prodotto
    const existingManualListings = Array.isArray(p.manual_listings) ? p.manual_listings : []
    const manualListingsByPlatform = new Map(existingManualListings.map((listing) => [listing.platform, listing]))
    setForm({
      nome: p.nome || '',
      descrizione: p.descrizione || '',
      sku: p.sku || '',
      quantita: p.quantita ?? 0,
      quantita_minima: p.quantita_minima ?? 0,
      prezzo_acquisto: p.prezzo_acquisto || '',
      prezzo_vendita: p.prezzo_vendita || '',
      categoria_id: p.categoria_id || '',
      ubicazione_id: p.ubicazione_id || '',
      stato_conservazione: p.stato_conservazione || '',
      lingua: p.lingua || '',
      cardtrader_blueprint_id: p.cardtrader_blueprint_id || '',
      su_vinted: p.su_vinted ?? false,
      su_wallapop: p.su_wallapop ?? false,
      non_vendibile: p.non_vendibile ?? false,
      manual_listings: MANUAL_LISTING_PLATFORMS.map((platform) => {
        const fallback = getDefaultManualListing(platform, p)
        const existing = manualListingsByPlatform.get(platform)
        if (!existing) return fallback
        return {
          ...fallback,
          ...existing,
          status: existing.status || (existing.active ? 'da_pubblicare' : 'non_pubblicare'),
          platform_price: existing.platform_price ?? '',
          listing_url: existing.listing_url ?? '',
          notes: existing.notes ?? '',
        }
      }),
    })
    setFormError('')
    setShowEditForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    const manualListings = Array.isArray(form.manual_listings) ? form.manual_listings : []

    const invalidUrl = manualListings.find((listing) => listing.listing_url && !isValidHttpUrl(listing.listing_url))
    if (invalidUrl) {
      setFormError(`URL non valido per ${invalidUrl.platform === 'vinted' ? 'Vinted' : 'Wallapop'}`)
      return
    }

    const vintedListing = manualListings.find((listing) => listing.platform === 'vinted')
    const wallapopListing = manualListings.find((listing) => listing.platform === 'wallapop')
    const payload = {
      ...form,
      quantita: parseInt(form.quantita),
      quantita_minima: parseInt(form.quantita_minima),
      prezzo_acquisto: form.prezzo_acquisto ? parseFloat(form.prezzo_acquisto) : null,
      prezzo_vendita: form.prezzo_vendita ? parseFloat(form.prezzo_vendita) : null,
      categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
      ubicazione_id: form.ubicazione_id ? parseInt(form.ubicazione_id) : null,
      stato_conservazione: form.stato_conservazione || null,
      lingua: form.lingua || null,
      cardtrader_blueprint_id: form.cardtrader_blueprint_id ? parseInt(form.cardtrader_blueprint_id) : null,
      su_vinted: Boolean(vintedListing?.active),
      su_wallapop: Boolean(wallapopListing?.active),
      manual_listings: manualListings.map((listing) => ({
        id: listing.id || null,
        platform: listing.platform,
        active: Boolean(listing.active),
        status: listing.status || (listing.active ? 'da_pubblicare' : 'non_pubblicare'),
        platform_price: listing.platform_price === '' || listing.platform_price === null || listing.platform_price === undefined ? null : parseFloat(listing.platform_price),
        listing_url: listing.listing_url?.trim() || null,
        published_at: listing.published_at || null,
        sold_at: listing.sold_at || null,
        removed_at: listing.removed_at || null,
        notes: listing.notes?.trim() || null,
      })),
    }
    try {
      await prodottiAPI.update(id, payload)
      setShowEditForm(false)
      loadScheda()
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Errore nel salvataggio')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Eliminare questo prodotto?')) return
    try {
      await prodottiAPI.delete(id)
      navigate('/prodotti', { state: { returnPage: fromPage || 1 } })
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante l\'eliminazione')
    }
  }

  const handleGenerateBarcode = async () => {
    setGeneratingBarcode(true)
    setBarcodeError('')
    try {
      await prodottiAPI.generateBarcode(id)
      loadScheda()
    } catch (err) {
      setBarcodeError(err.response?.data?.detail || 'Errore nella generazione del barcode')
    } finally {
      setGeneratingBarcode(false)
    }
  }

  useEffect(() => {
    if (uploadingFoto && fotoInputRef.current) {
      fotoInputRef.current.click()
    }
  }, [uploadingFoto])

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#888', fontSize: '1.1rem' }}>Caricamento...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: '#c62828', fontSize: '1.1rem' }}>{error}</p>
        <button onClick={() => navigate('/prodotti', { state: { returnPage: fromPage || 1 } })} style={btnStyle(PRIMARY_COLOR)}>← Torna ai Prodotti</button>
      </div>
    )
  }

  if (!scheda) return <div style={{ padding: '48px', textAlign: 'center', color: '#888' }}>Dati non disponibili</div>

  const { prodotto, movimenti, storico_quantita, prodotti_correlati, stats } = scheda

  const manualListingsForView = Array.isArray(prodotto.manual_listings) && prodotto.manual_listings.length > 0
    ? prodotto.manual_listings
    : MANUAL_LISTING_PLATFORMS.map((platform) => getDefaultManualListing(platform, prodotto))
  const activeManualPlatforms = manualListingsForView.filter((listing) => listing.active).map((listing) => listing.platform)

  const updateManualListingForm = (platform, changes) => {
    setForm((prev) => {
      const currentListings = Array.isArray(prev.manual_listings) && prev.manual_listings.length > 0
        ? prev.manual_listings
        : MANUAL_LISTING_PLATFORMS.map((p) => getDefaultManualListing(p, scheda?.prodotto))
      return {
        ...prev,
        manual_listings: currentListings.map((listing) => (
          listing.platform === platform ? { ...listing, ...changes } : listing
        )),
      }
    })
  }

  const escapeHtml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const handleStampaQR = () => {
    const canvas = document.createElement('canvas')
    QRCode.toCanvas(canvas, `prodotto:${prodotto.id}`, { width: 256, margin: 2 }, (err) => {
      if (err) {
        alert('Errore nella generazione del QR code.')
        return
      }
      const win = window.open('', '_blank')
      if (!win) {
        alert('Il popup è stato bloccato dal browser. Consenti i popup per questa pagina e riprova.')
        return
      }
      const safeName = escapeHtml(prodotto.nome)
      const safeId = escapeHtml(prodotto.id)
      const html = `<html><head><title>QR - ${safeName}</title></head><body style="display:flex;align-items:center;justify-content:center;padding:32px;font-family:sans-serif"><div style="text-align:center"><img src="${canvas.toDataURL()}" style="width:200px;height:200px"><p style="margin-top:12px;font-size:14px;color:#555">${safeName}</p><p style="font-size:11px;color:#888;font-family:monospace">prodotto:${safeId}</p></div></body></html>`
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 500)
    })
  }

  const sottoScorta = prodotto.quantita < prodotto.quantita_minima

  // Pagination for movements
  const totalPages = Math.ceil(movimenti.length / PAGE_SIZE)
  const movimentiPagina = movimenti.slice(movPage * PAGE_SIZE, (movPage + 1) * PAGE_SIZE)

  const fmtDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const fmtPrice = (v) => v != null ? `€${Number(v).toFixed(2)}` : '—'

  const margine = stats.margine_lordo
  const margineColor = margine == null ? '#888' : margine >= 0 ? '#2e7d32' : '#c62828'

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/prodotti', { state: { returnPage: fromPage || 1 } })} style={btnStyle('#546e7a')}>← Torna ai Prodotti</button>
        <h1 style={{ color: 'var(--color-text)', margin: 0, flex: 1, fontSize: 'clamp(1.2rem, 3vw, 1.8rem)' }}>{prodotto.nome}</h1>
        {ebayListingAttivo && (
          <span style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>
            Su eBay
          </span>
        )}
        {prodotto.stato_conservazione && <StatoBadge value={prodotto.stato_conservazione} colors={STATO_CONSERVAZIONE_COLORS} />}
        {ebayConnected && (
          <button
            onClick={() => navigate(`/ebay/pubblica/${prodotto.id}`)}
            className="gm-btn gm-btn-primary"
          >
            Pubblica su eBay
          </button>
        )}
        <button onClick={handleEditOpen} className="gm-btn gm-btn-secondary">Modifica</button>
        <button onClick={handleDelete} className="gm-btn gm-btn-danger">Elimina</button>
      </div>

      {/* Edit form */}
      {showEditForm && (
        <form onSubmit={handleSave} style={{ ...cardStyle, marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--color-text)', marginTop: 0 }}>Modifica Prodotto</h3>
          {formError && <div style={{ color: 'var(--color-danger)', marginBottom: '12px' }}>{formError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {[
              { key: 'nome', label: 'Nome *', required: true },
              { key: 'sku', label: 'SKU *', required: true },
            ].map(({ key, label, type = 'text', required, step }) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{label}</span>
                <input
                  type={type}
                  step={step}
                  required={required}
                  value={form[key] ?? ''}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={{ padding: '8px', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.95rem', width: '100%' }}
                />
              </label>
            ))}

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Descrizione</span>
              <textarea
                value={form.descrizione ?? ''}
                onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                rows={3}
                style={{ padding: '8px', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.95rem', width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Descrizione opzionale del prodotto"
              />
            </label>

            {[
              { key: 'quantita', label: 'Quantità', type: 'number' },
              { key: 'quantita_minima', label: 'Quantità Minima', type: 'number' },
              { key: 'prezzo_acquisto', label: 'Prezzo Acquisto (€)', type: 'number', step: '0.01' },
              { key: 'prezzo_vendita', label: 'Prezzo Vendita (€)', type: 'number', step: '0.01' },
            ].map(({ key, label, type = 'text', required, step }) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{label}</span>
                <input
                  type={type}
                  step={step}
                  required={required}
                  value={form[key] ?? ''}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={{ padding: '8px', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.95rem', width: '100%' }}
                />
              </label>
            ))}

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Stato di Conservazione</span>
              <select value={form.stato_conservazione} onChange={(e) => setForm({ ...form, stato_conservazione: e.target.value })}
                style={{ padding: '8px', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.95rem', width: '100%' }}>
                <option value="">-- Nessuno --</option>
                <option value="Mint">Mint</option>
                <option value="Near Mint">Near Mint</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Light Played">Light Played</option>
                <option value="Played">Played</option>
                <option value="Poor">Poor</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Lingua</span>
              <select value={form.lingua} onChange={(e) => setForm({ ...form, lingua: e.target.value })}
                style={{ padding: '8px', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.95rem', width: '100%' }}>
                <option value="">-- Nessuna --</option>
                <option value="Italiano">Italiano</option>
                <option value="Inglese">Inglese</option>
                <option value="Giapponese">Giapponese</option>
                <option value="Cinese">Cinese</option>
                <option value="Coreano">Coreano</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Categoria</span>
              <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                style={{ padding: '8px', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.95rem', width: '100%' }}>
                <option value="">-- Nessuna --</option>
                {flattenCategorieTree(categorie).map(c => (
                  <option key={c.id} value={c.id}>
                    {'\u00a0\u00a0'.repeat(c.level)}{c.nome}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Ubicazione</span>
              <select value={form.ubicazione_id} onChange={(e) => setForm({ ...form, ubicazione_id: e.target.value })}
                style={{ padding: '8px', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.95rem', width: '100%' }}>
                <option value="">-- Nessuna --</option>
                {ubicazioni.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', marginTop: 8 }}>
            {/* Visibilità */}
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Visibilità</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: 'fit-content', backgroundColor: form.non_vendibile ? '#fff3e0' : 'transparent', border: form.non_vendibile ? '1px solid #fb8c00' : '1px solid transparent', borderRadius: 6, padding: '4px 8px' }}>
              <input
                type="checkbox"
                checked={!!form.non_vendibile}
                onChange={(e) => setForm({ ...form, non_vendibile: e.target.checked })}
              />
              <span style={{ fontSize: '0.9rem', color: form.non_vendibile ? '#e65100' : 'var(--color-text)', fontWeight: form.non_vendibile ? 600 : 400 }}>🚫 Non vendibile (solo magazzino)</span>
            </label>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Piattaforme annunci manuali</span>
            <div style={{ display: 'grid', gap: 12 }}>
              {(() => {
                const manualListings = Array.isArray(form.manual_listings)
                  ? form.manual_listings
                  : MANUAL_LISTING_PLATFORMS.map((platform) => getDefaultManualListing(platform, scheda?.prodotto))
                const quantitaCorrente = Number(form.quantita ?? 0)
                const pubblicatiCount = manualListings.filter((listing) => listing.status === 'pubblicato').length
                return (
                  <>
                    {quantitaCorrente === 0 && (
                      <div style={{ background: 'rgba(255, 152, 0, 0.12)', border: '1px solid rgba(255, 152, 0, 0.35)', color: '#ffcc80', borderRadius: 8, padding: '8px 10px', fontSize: '0.82rem' }}>
                        Prodotto non disponibile: controlla eventuali annunci manuali ancora attivi.
                      </div>
                    )}
                    {quantitaCorrente === 1 && pubblicatiCount > 1 && (
                      <div style={{ background: 'rgba(244, 67, 54, 0.12)', border: '1px solid rgba(244, 67, 54, 0.35)', color: '#ffcdd2', borderRadius: 8, padding: '8px 10px', fontSize: '0.82rem' }}>
                        Attenzione: prodotto singolo pubblicato su più piattaforme.
                      </div>
                    )}
                    {manualListings.map((listing) => {
                      const platformLabel = listing.platform === 'vinted' ? 'Vinted' : 'Wallapop'
                      const status = listing.status || (listing.active ? 'da_pubblicare' : 'non_pubblicare')
                      const statusColors = MANUAL_LISTING_COLORS[status] || MANUAL_LISTING_COLORS.non_pubblicare
                      const listingUrl = listing.listing_url?.trim() || ''
                      return (
                        <div key={listing.platform} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius)', padding: 12, display: 'grid', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <strong style={{ color: 'var(--color-text)', fontSize: '0.95rem' }}>{platformLabel}</strong>
                            <span style={{ background: statusColors.bg, color: statusColors.color, borderRadius: 999, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                              {MANUAL_LISTING_LABELS[status] || status}
                            </span>
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', width: 'fit-content' }}>
                            <input
                              type="checkbox"
                              checked={Boolean(listing.active)}
                              onChange={(e) => {
                                const active = e.target.checked
                                updateManualListingForm(listing.platform, {
                                  active,
                                  status: active ? (listing.status || 'da_pubblicare') : (listing.status || 'non_pubblicare'),
                                })
                              }}
                            />
                            <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>Attivo</span>
                          </label>
                          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Stato annuncio</span>
                              <select
                                value={status}
                                onChange={(e) => updateManualListingForm(listing.platform, { status: e.target.value })}
                                style={{ padding: 8, border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
                              >
                                {Object.entries(MANUAL_LISTING_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Prezzo piattaforma</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={listing.platform_price ?? ''}
                                onChange={(e) => updateManualListingForm(listing.platform, { platform_price: e.target.value })}
                                placeholder={form.prezzo_vendita ? `Suggerito: €${Number(form.prezzo_vendita).toFixed(2)}` : 'Prezzo vendita prodotto'}
                                style={{ padding: 8, border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
                              />
                            </label>
                          </div>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Link annuncio</span>
                            <input
                              type="url"
                              value={listing.listing_url ?? ''}
                              onChange={(e) => updateManualListingForm(listing.platform, { listing_url: e.target.value })}
                              placeholder="https://..."
                              style={{ padding: 8, border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' }}
                            />
                          </label>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            Data pubblicazione: {listing.published_at ? new Date(listing.published_at).toLocaleString() : '—'}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <button
                              type="button"
                              className="gm-btn gm-btn-secondary gm-btn-sm"
                              onClick={() => {
                                if (!listingUrl || !isValidHttpUrl(listingUrl)) {
                                  setFormError(`Inserisci un link valido prima di segnare pubblicato su ${platformLabel}`)
                                  return
                                }
                                updateManualListingForm(listing.platform, {
                                  status: 'pubblicato',
                                  published_at: new Date().toISOString(),
                                })
                              }}
                            >
                              Segna pubblicato
                            </button>
                            {listingUrl && (
                              <a href={listingUrl} target="_blank" rel="noreferrer" className="gm-btn gm-btn-secondary gm-btn-sm" style={{ textDecoration: 'none' }}>
                                Apri annuncio
                              </a>
                            )}
                            <button
                              type="button"
                              className="gm-btn gm-btn-secondary gm-btn-sm"
                              onClick={() => updateManualListingForm(listing.platform, {
                                status: 'venduto',
                                sold_at: new Date().toISOString(),
                              })}
                            >
                              Segna venduto
                            </button>
                            <button
                              type="button"
                              className="gm-btn gm-btn-danger gm-btn-sm"
                              onClick={() => updateManualListingForm(listing.platform, {
                                status: 'rimosso',
                                removed_at: new Date().toISOString(),
                              })}
                            >
                              Rimuovi / Archivia annuncio
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )
              })()}
            </div>
          </div>

          {/* CardTrader Blueprint ID — nascosto */}
          <div style={{ display: 'none', gridColumn: '1 / -1', marginTop: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>🃏 CardTrader Blueprint ID</span>
              <input
                type="number"
                value={form.cardtrader_blueprint_id ?? ''}
                onChange={(e) => setForm({ ...form, cardtrader_blueprint_id: e.target.value })}
                style={{ padding: '8px', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '0.95rem', width: '100%', maxWidth: 300 }}
                placeholder="es. 123456"
              />
              <span style={{ fontSize: '0.75rem', color: '#888', marginTop: 2 }}>
                Inserisci manualmente l&apos;ID del blueprint da CardTrader
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button type="submit" className="gm-btn gm-btn-primary" style={{ padding: '10px 20px' }}>Salva</button>
            <button type="button" onClick={() => setShowEditForm(false)} style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius)', padding: '10px 20px', cursor: 'pointer' }}>Annulla</button>
          </div>
        </form>
      )}

      {/* Main info grid — 2 columns: product info (left) + stats (right) */}
      <div className={styles.mainGrid} style={{ marginBottom: 24 }}>
        {/* Left: product image + details */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {prodotto.foto_url
                ? <>
                    <img
                      src={getFotoUrl(prodotto.foto_url)}
                      alt={prodotto.nome}
                      style={{ width: 140, height: 140, borderRadius: 8, objectFit: 'cover', display: 'block' }}
                      onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'inline' }}
                    />
                    <span style={{ fontSize: '4.5rem', lineHeight: 1, display: 'none' }}>📦</span>
                  </>
                : <span style={{ fontSize: '4.5rem', lineHeight: 1 }}>📦</span>
              }
              <button
                onClick={() => setUploadingFoto(true)}
                style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.75rem' }}
                title="Cambia foto"
              >📷</button>
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fotoInputRef}
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files[0]
                if (!file) return
                setFotoError('')
                try {
                  await prodottiAPI.uploadFoto(id, file)
                  loadScheda()
                } catch {
                  setFotoError('Errore nel caricamento della foto')
                } finally {
                  setUploadingFoto(false)
                  e.target.value = ''
                }
              }}
            />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>{prodotto.nome}</div>
              {prodotto.descrizione && <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: 8 }}>{prodotto.descrizione}</div>}
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>SKU: <code style={{ backgroundColor: 'var(--color-surface-hover)', padding: '1px 6px', borderRadius: 4 }}>{prodotto.sku}</code></div>
              {prodotto.cardtrader_blueprint_id && (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>Blueprint ID: <code style={{ backgroundColor: 'var(--color-surface-hover)', padding: '1px 6px', borderRadius: 4 }}>{prodotto.cardtrader_blueprint_id}</code></div>
              )}
              {fotoError && <div style={{ color: 'red', fontSize: '0.8rem', marginTop: 4 }}>{fotoError}</div>}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {prodotto.categoria_nome && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Categoria</span>
                <span style={valueStyle}>{prodotto.categoria_nome}</span>
              </div>
            )}
            {prodotto.ubicazione_nome && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Ubicazione</span>
                <span style={valueStyle}>{prodotto.ubicazione_nome}</span>
              </div>
            )}
            {prodotto.lingua && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Lingua</span>
                <span style={valueStyle}>{prodotto.lingua}</span>
              </div>
            )}
            {prodotto.stato_conservazione && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Conservazione</span>
                <StatoBadge value={prodotto.stato_conservazione} colors={STATO_CONSERVAZIONE_COLORS} />
              </div>
            )}
            {activeManualPlatforms.length > 0 && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Pubblicato su</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  {manualListingsForView
                    .filter((listing) => listing.active)
                    .map((listing, index) => {
                      const platformLabel = listing.platform === 'vinted' ? 'Vinted' : 'Wallapop'
                      const platformColor = listing.platform === 'vinted' ? '#00b3a4' : '#e8400c'
                      const listingUrl = listing.listing_url?.trim() || ''
                      const publishedAtDate = listing.published_at ? new Date(listing.published_at) : null
                      const hasValidPublishedAt = publishedAtDate && !Number.isNaN(publishedAtDate.getTime())
                      return (
                        <span key={`${listing.platform}-${listing.id ?? index}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ backgroundColor: platformColor, color: 'white', padding: '2px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>
                              {platformLabel}
                            </span>
                            {listingUrl && (
                              <a
                                href={listingUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: '0.75rem', color: platformColor, textDecoration: 'none', fontWeight: 600 }}
                              >
                                Apri →
                              </a>
                            )}
                          </span>
                          {hasValidPublishedAt && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                              Pubbl. {publishedAtDate.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </span>
                      )
                    })}
                </span>
              </div>
            )}
            {prodotto.non_vendibile && (
              <div style={infoRowStyle}>
                <span style={labelStyle}>Visibilità</span>
                <span style={{ backgroundColor: '#fb8c00', color: 'white', padding: '2px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>
                  🚫 Non vendibile
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: 2x2 stat cards + margine badge */}
        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {/* Quantita */}
            <div style={{ ...statCardStyle, borderLeft: `4px solid ${sottoScorta ? 'var(--color-danger)' : 'var(--color-success)'}` }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>📦</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Quantita</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: sottoScorta ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {prodotto.quantita}
              </div>
              {sottoScorta && <div style={{ fontSize: '0.72rem', color: 'var(--color-danger)', marginTop: 2 }}>Sotto scorta (min: {prodotto.quantita_minima})</div>}
            </div>

            {/* Prezzo Vendita */}
            <div style={{ ...statCardStyle, borderLeft: '4px solid var(--color-info)' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>💰</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Prezzo Vendita</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-info)' }}>{fmtPrice(prodotto.prezzo_vendita)}</div>
            </div>

            {/* Prezzo Acquisto */}
            <div style={{ ...statCardStyle, borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>🛒</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Prezzo Acquisto</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>{fmtPrice(prodotto.prezzo_acquisto)}</div>
            </div>

            {/* Margine Lordo */}
            <div style={{ ...statCardStyle, borderLeft: `4px solid ${margineColor}` }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>📈</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Margine Lordo</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: margineColor }}>
                {margine != null ? fmtPrice(margine) : '—'}
              </div>
            </div>
          </div>

          {/* Margine percentuale badge */}
          {stats.margine_percentuale != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Margine %:</span>
              <span style={{
                backgroundColor: stats.margine_percentuale >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                color: stats.margine_percentuale >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                padding: '4px 14px', borderRadius: '20px',
                fontWeight: 700, fontSize: '0.95rem',
              }}>
                {stats.margine_percentuale >= 0 ? '+' : ''}{stats.margine_percentuale}%
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                (Carico tot: {stats.totale_carico} | Scarico tot: {stats.totale_scarico})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Confronto Prezzi di Mercato */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{
          color: 'var(--color-text)',
          marginTop: 0,
          marginBottom: 16,
          fontSize: '1.1rem',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: 12,
        }}>Confronto Prezzi di Mercato</h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {/* eBay */}
          <div style={{ 
            ...statCardStyle, 
            borderLeft: '4px solid var(--color-warning)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
            minWidth: 280,
            flex: '1 1 auto',
          }}>
            <div style={{ fontSize: '2rem', opacity: 0.8 }}>🛒</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 4, fontWeight: 500 }}>Prezzi eBay</div>
              {ebayLoading && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Caricamento...</div>}
              {ebayError && !ebayLoading && <div style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>Non disponibile</div>}
              {ebayData && !ebayError && !ebayLoading && (
                ebayData.configurato === false
                  ? <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Non configurato</div>
                  : ebayData.numero_risultati === 0
                    ? <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Nessun risultato</div>
                    : <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '8px 16px' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Medio: </span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                            {'\u20AC'}{Number(ebayData.prezzo_medio).toFixed(2)}
                          </span>
                        </div>
                        {ebayData.ultimo_prezzo_venduto != null && (
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Venduto: </span>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-success)' }}>
                              {'\u20AC'}{Number(ebayData.ultimo_prezzo_venduto).toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                          {ebayData.numero_risultati} annunci
                        </div>
                      </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              {ebayData?.url_ricerca && (
                <a href={ebayData.url_ricerca} target="_blank" rel="noopener noreferrer"
                  className="gm-btn gm-btn-sm gm-btn-secondary"
                  style={{ fontSize: '0.75rem', textDecoration: 'none' }}>
                  Vedi su eBay
                </a>
              )}
              <button onClick={refreshEbay} disabled={ebayLoading} 
                className="gm-btn gm-btn-sm"
                style={{ fontSize: '0.75rem', opacity: ebayLoading ? 0.6 : 1 }}>
                {ebayLoading ? 'Caricamento...' : 'Aggiorna'}
              </button>
            </div>
          </div>

          {/* Placeholder per futuri integrazioni quando saranno riabilitate */}
          {/* TEMPORANEAMENTE DISABILITATO - CardTrader API issues */}
          {/* <div style={{ ...statCardStyle, borderLeft: '4px solid #7b1fa2' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#7b1fa2', fontWeight: 700 }}>
              🃏 Prezzi CardTrader
            </h3>
            {!prodotto.cardtrader_blueprint_id
              ? <div style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>
                  Blueprint ID non configurato.{' '}
                  <button onClick={handleEditOpen} style={{ background: 'none', border: 'none', color: '#7b1fa2', cursor: 'pointer', fontSize: '0.8rem', padding: 0, textDecoration: 'underline' }}>Modifica prodotto</button>
                </div>
              : <>
                  {cardtraderLoading && <div style={{ fontSize: '0.85rem', color: '#888' }}>⏳ Caricamento...</div>}
                  {cardtraderError && !cardtraderLoading && <div style={{ fontSize: '0.8rem', color: '#c62828' }}>⚠️ Non disponibile</div>}
                  {cardtraderData && !cardtraderError && !cardtraderLoading && (
                    cardtraderData.numero_offerte === 0
                      ? <div style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>Nessun risultato</div>
                      : <div>
                          <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>
                            💰 Min: <strong style={{ color: '#7b1fa2' }}>€{Number(cardtraderData.prezzo_minimo).toFixed(2)}</strong>
                          </div>
                          <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>
                            📊 Medio: <strong style={{ color: '#7b1fa2' }}>€{Number(cardtraderData.prezzo_medio).toFixed(2)}</strong>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 4 }}>{cardtraderData.numero_offerte} offerte</div>
                          {(CONDIZIONE_MAP[prodotto.stato_conservazione] || LINGUA_MAP[prodotto.lingua]) && (
                            <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: 2 }}>
                              {[
                                CONDIZIONE_MAP[prodotto.stato_conservazione],
                                LINGUA_MAP[prodotto.lingua],
                              ].filter(Boolean).join(' / ')}
                            </div>
                          )}
                        </div>
                  )}
                  <button onClick={refreshCardtrader} disabled={cardtraderLoading} aria-label="Aggiorna prezzi CardTrader" style={{ marginTop: 6, fontSize: '0.75rem', color: '#7b1fa2', background: 'none', border: 'none', cursor: cardtraderLoading ? 'not-allowed' : 'pointer', padding: 0, opacity: cardtraderLoading ? 0.6 : 1 }}>
                    🔄 Aggiorna
                  </button>
                </>
            }
          </div> */}

          {/* TEMPORANEAMENTE DISABILITATO - CardMarket API issues */}
          {/* <div style={{ ...statCardStyle, borderLeft: '4px solid #ff9800' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#ff9800', fontWeight: 700 }}>
              🃏 Prezzi CardMarket
            </h3>
            {cardmarketLoading && <div style={{ fontSize: '0.85rem', color: '#888' }}>⏳ Caricamento...</div>}
            {cardmarketError && !cardmarketLoading && <div style={{ fontSize: '0.8rem', color: '#c62828' }}>⚠️ {cardmarketError}</div>}
            {cardmarketData && !cardmarketError && !cardmarketLoading && (
              <div>
                {cardmarketData.prezzo_minimo != null && (
                  <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>
                    💰 Min: <strong style={{ color: '#ff9800' }}>€{Number(cardmarketData.prezzo_minimo).toFixed(2)}</strong>
                  </div>
                )}
                {cardmarketData.prezzo_medio != null && (
                  <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>
                    📊 Medio: <strong style={{ color: '#ff9800' }}>€{Number(cardmarketData.prezzo_medio).toFixed(2)}</strong>
                  </div>
                )}
                {cardmarketData.data_aggiornamento && (
                  <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: 4 }}>
                    Agg. {new Date(cardmarketData.data_aggiornamento).toLocaleDateString('it-IT')}
                  </div>
                )}
                {cardmarketData.url_cardmarket && (
                  <a href={cardmarketData.url_cardmarket} target="_blank" rel="noopener noreferrer"
                    aria-label="Vedi su CardMarket (apre in una nuova scheda)"
                    style={{ fontSize: '0.75rem', color: '#ff9800', display: 'inline-block', marginTop: 4 }}>
                    🔗 Vedi su CardMarket
                  </a>
                )}
              </div>
            )}
            {!cardmarketData && !cardmarketLoading && !cardmarketError && (
              <div style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic' }}>Nessun dato disponibile</div>
            )}
            <button onClick={refreshCardmarket} disabled={cardmarketLoading}
              aria-label="Aggiorna prezzi CardMarket"
              style={{ marginTop: 6, fontSize: '0.75rem', color: '#ff9800', background: 'none', border: 'none', cursor: cardmarketLoading ? 'not-allowed' : 'pointer', padding: 0, opacity: cardmarketLoading ? 0.6 : 1 }}>
              🔄 Aggiorna
            </button>
          </div> */}
        </div>
      </div>

      {/* Sezione Codici & Etichette — nascosta */}
      <div style={{ display: 'none' }}>
        <h2 style={{ color: 'var(--color-text)', marginTop: 0, marginBottom: 16, fontSize: '1.1rem' }}>Codici e Etichette</h2>
        {barcodeError && <div style={{ color: 'var(--color-danger)', marginBottom: 12, fontSize: '0.9rem' }}>{barcodeError}</div>}
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Barcode */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            padding: '16px 24px',
            backgroundColor: 'var(--color-surface-hover)',
            borderRadius: 'var(--border-radius)',
            minWidth: 140,
          }}>
            {prodotto.barcode ? (
              <>
                <BarcodeDisplay value={prodotto.barcode} productName={prodotto.nome} width={2} height={50} />
                <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--color-text)', fontFamily: 'monospace' }}>{prodotto.barcode}</div>
              </>
            ) : (
              <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.85rem', padding: '16px 0' }}>
                Nessun barcode
              </div>
            )}
          </div>
          
          {/* QR Code */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            padding: '16px 24px',
            backgroundColor: 'var(--color-surface-hover)',
            borderRadius: 'var(--border-radius)',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>QR Code</div>
            <QRCodeDisplay value={`prodotto:${prodotto.id}`} size={80} productName={prodotto.nome} />
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 8 }}>Scansiona con fotocamera</div>
          </div>
          
          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' }}>
            <button
              onClick={handleGenerateBarcode}
              disabled={generatingBarcode}
              className="gm-btn gm-btn-secondary"
              style={{ opacity: generatingBarcode ? 0.6 : 1 }}
            >
              {generatingBarcode ? 'Generazione...' : prodotto.barcode ? 'Rigenera Barcode' : 'Genera Barcode'}
            </button>
            <button
              onClick={() => setShowPrintModal(true)}
              className="gm-btn gm-btn-primary"
            >Stampa Etichetta</button>
            <button
              onClick={handleStampaQR}
              className="gm-btn gm-btn-secondary"
            >Stampa QR</button>
          </div>
        </div>
      </div>

      {/* Sezione Foto aggiuntive */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{ color: 'var(--color-text)', marginTop: 0, marginBottom: 16, fontSize: '1.1rem' }}>
          🖼️ Foto aggiuntive{' '}
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 400 }}>
            {(prodotto.foto_aggiuntive || []).length + (prodotto.foto_url ? 1 : 0)}/12 foto
          </span>
        </h2>
        {fotoAggiuntiveError && <div style={{ color: 'var(--color-danger)', fontSize: '0.875rem', marginBottom: 8 }}>{fotoAggiuntiveError}</div>}
        {(prodotto.foto_aggiuntive || []).length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 12 }}>
            {(prodotto.foto_aggiuntive || []).map((url, idx) => (
              <div key={idx} style={{ position: 'relative', overflow: 'hidden' }}>
                <img
                  src={url}
                  alt={`Foto aggiuntiva ${idx + 1}`}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6, border: '2px solid var(--color-border)', display: 'block', transform: `rotate(${fotoRotazioni[idx] || 0}deg)`, transition: 'transform 0.3s ease' }}
                  onError={e => { e.currentTarget.style.opacity = '0.3' }}
                />
                <button
                  onClick={async () => {
                    setFotoAggiuntiveError('')
                    try {
                      await prodottiAPI.removeFotoAggiuntiva(id, idx)
                      loadScheda()
                    } catch {
                      setFotoAggiuntiveError('Errore nella rimozione della foto')
                    }
                  }}
                  title="Rimuovi foto"
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.65)', color: 'white', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >✕</button>
                <div style={{ position: 'absolute', bottom: 4, left: 4, display: 'flex', gap: 2 }}>
                  <button
                    onClick={() => ruotaFoto(idx, 'sinistra')}
                    title="Ruota a sinistra"
                    style={{ background: 'rgba(0,0,0,0.65)', color: 'white', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  >↺</button>
                  <button
                    onClick={() => ruotaFoto(idx, 'destra')}
                    title="Ruota a destra"
                    style={{ background: 'rgba(0,0,0,0.65)', color: 'white', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  >↻</button>
                  {(fotoRotazioni[idx] || 0) !== 0 && (
                    <button
                      onClick={() => salvaRotazione(idx)}
                      title="Salva rotazione"
                      style={{ background: 'rgba(34,197,94,0.85)', color: 'white', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    >💾</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {(prodotto.foto_aggiuntive || []).length === 0 && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: 12 }}>
            Nessuna foto aggiuntiva. Puoi aggiungere fino a {11 - (prodotto.foto_url ? 1 : 0)} foto extra (il limite eBay è 12 totali inclusa la foto principale).
          </p>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          ref={fotoAggiuntiveInputRef}
          style={{ display: 'none' }}
          onChange={async (e) => {
            const files = Array.from(e.target.files)
            if (!files.length) return
            setFotoAggiuntiveError('')
            setUploadingFotoAggiuntiva(true)
            try {
              let uploaded = 0
              for (const file of files) {
                const currentCount = (prodotto.foto_aggiuntive || []).length + uploaded
                const maxExtra = prodotto.foto_url ? 11 : 12
                if (currentCount >= maxExtra) break
                await prodottiAPI.uploadFotoAggiuntiva(id, file)
                uploaded++
              }
              loadScheda()
            } catch (err) {
              setFotoAggiuntiveError(err.response?.data?.detail || 'Errore nel caricamento della foto')
            } finally {
              setUploadingFotoAggiuntiva(false)
              e.target.value = ''
            }
          }}
        />
        <button
          className="gm-btn gm-btn-secondary"
          onClick={() => fotoAggiuntiveInputRef.current?.click()}
          disabled={uploadingFotoAggiuntiva || (prodotto.foto_aggiuntive || []).length >= (prodotto.foto_url ? 11 : 12)}
          style={{ fontSize: '0.85rem' }}
        >
          {uploadingFotoAggiuntiva ? '⏳ Caricamento...' : '➕ Aggiungi foto'}
        </button>
      </div>

      {/* Sezione Google Drive — DISABILITATA */}

      {/* Prodotti correlati */}
      {prodotti_correlati.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <h2 style={{ color: 'var(--color-text)', marginTop: 0, marginBottom: 16, fontSize: '1.1rem' }}>Prodotti correlati</h2>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
            {prodotti_correlati.map(pc => (
              <div key={pc.id}
                onClick={() => navigate(`/prodotti/${pc.id}`)}
                style={{
                  cursor: 'pointer', 
                  borderRadius: 'var(--border-radius)', 
                  border: '1px solid var(--color-border)',
                  padding: 16, 
                  transition: 'all var(--transition-fast)',
                  backgroundColor: 'var(--color-surface)',
                  minWidth: 150,
                  flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
              >
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  {pc.foto_url
                    ? <img src={getFotoUrl(pc.foto_url)} alt={pc.nome}
                        style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
                    : <div style={{ 
                        width: 64, height: 64, 
                        borderRadius: 8, 
                        backgroundColor: 'var(--color-surface-hover)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        margin: '0 auto',
                        fontSize: '1.5rem',
                      }}>📦</div>
                  }
                </div>
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: '0.85rem', 
                  color: 'var(--color-text)', 
                  marginBottom: 4, 
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>{pc.nome}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: 6 }}>
                  {pc.sku}
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  textAlign: 'center', 
                  color: pc.quantita < pc.quantita_minima ? 'var(--color-danger)' : 'var(--color-success)', 
                  fontWeight: 600,
                }}>
                  Qty: {pc.quantita}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPrintModal && (
        <PrintBarcodeModal
          prodotti={[prodotto]}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Storico Movimenti — in fondo */}
      <div style={{ ...cardStyle, marginTop: 24, marginBottom: 24 }}>
        <h2 style={{ color: 'var(--color-text)', marginTop: 0, marginBottom: 16, fontSize: '1.1rem' }}>
          Storico Movimenti
          <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 8 }}>({movimenti.length} totali)</span>
        </h2>
        {movimenti.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px 0' }}>Nessun movimento registrato</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                    {['Data', 'Tipo', 'Quantita', 'Fornitore', 'Note'].map(h => (
                      <th key={h} style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        fontWeight: 600, 
                        color: 'var(--color-text)',
                        borderBottom: '1px solid var(--color-border)',
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movimentiPagina.map((m, i) => (
                    <tr key={m.id} style={{ 
                      borderBottom: i < movimentiPagina.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>{fmtDate(m.data_movimento)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          backgroundColor: m.tipo === 'carico' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                          color: m.tipo === 'carico' ? 'var(--color-success)' : 'var(--color-danger)',
                          padding: '4px 12px', borderRadius: '12px', fontWeight: 600, fontSize: '0.75rem',
                          textTransform: 'capitalize',
                        }}>{m.tipo}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text)' }}>{m.quantita}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{m.fornitore_nome || '—'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontStyle: m.note ? 'normal' : 'italic', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                <button onClick={() => setMovPage(p => Math.max(0, p - 1))} disabled={movPage === 0}
                  style={btnSmall(movPage === 0 ? 'var(--color-surface-hover)' : 'var(--color-primary)')}>Prec</button>
                <span style={{ padding: '4px 10px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                  {movPage + 1} / {totalPages}
                </span>
                <button onClick={() => setMovPage(p => Math.min(totalPages - 1, p + 1))} disabled={movPage === totalPages - 1}
                  style={btnSmall(movPage === totalPages - 1 ? 'var(--color-surface-hover)' : 'var(--color-primary)')}>Succ</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const cardStyle = {
  backgroundColor: 'var(--color-surface)', 
  borderRadius: 'var(--border-radius-lg)',
  padding: '20px', 
  border: '1px solid var(--color-border)',
  boxShadow: 'var(--card-shadow)',
}

const statCardStyle = {
  backgroundColor: 'var(--color-surface)', 
  borderRadius: 'var(--border-radius)',
  padding: '12px', 
  border: '1px solid var(--color-border)',
}

const infoRowStyle = {
  display: 'flex', justifyContent: 'space-between',
  alignItems: 'center', gap: 8, padding: '8px 0',
  borderBottom: '1px solid var(--color-border-subtle)',
}

const labelStyle = { fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }
const valueStyle = { fontSize: '0.9rem', color: 'var(--color-text)', fontWeight: 600, textAlign: 'right' }

const btnStyle = (bg) => ({
  backgroundColor: bg, color: 'white', border: 'none',
  borderRadius: 'var(--border-radius)', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold',
  fontSize: '0.9rem',
  transition: 'all var(--transition-fast)',
})

const btnSmall = (bg) => ({
  ...btnStyle(bg), padding: '4px 12px', fontSize: '0.85rem',
  cursor: bg === '#ccc' ? 'default' : 'pointer',
})

export default DettaglioProdotto
