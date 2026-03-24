import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { prodottiAPI, getFotoUrl } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import PrintBarcodeModal from '../components/PrintBarcodeModal'
import { useIsMobile } from '../hooks/useIsMobile'
import StatoBadge from '../components/ui/StatoBadge'
import { STATO_CONSERVAZIONE_COLORS } from '../constants/colors'
import styles from './Prodotti.module.css'
import { normalizeSkuForCode39 } from '../utils/formatters'

const PAGE_SIZE = 50

function Prodotti() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [prodotti, setProdotti] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printProdotti, setPrintProdotti] = useState([])
  const [isBulkGenerating, setIsBulkGenerating] = useState(false)
  const [isPrintLoading, setIsPrintLoading] = useState(false)
  // Holds the SKU value of the last barcode scan so we can alert when no match is found
  const pendingScanAlertRef = useRef(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchProdotti = useCallback(async (currentSearch, currentPage) => {
    try {
      const skip = (currentPage - 1) * PAGE_SIZE
      const resp = await prodottiAPI.getAll({ skip, limit: PAGE_SIZE, search: currentSearch || undefined })
      setProdotti(resp.data)
      const totalCount = parseInt(resp.headers['x-total-count'] ?? '0', 10)
      setTotal(isNaN(totalCount) ? resp.data.length : totalCount)
      // If this fetch was triggered by a barcode scan and returned no results, alert the user
      if (pendingScanAlertRef.current !== null && resp.data.length === 0) {
        alert(`⚠️ Nessun prodotto trovato con SKU: ${pendingScanAlertRef.current}\n\nVerifica che il codice a barre corrisponda esattamente allo SKU salvato.`)
      }
      pendingScanAlertRef.current = null
    } catch {
      pendingScanAlertRef.current = null
      setError('Errore nel caricamento dei dati')
    }
  }, [])

  useEffect(() => {
    fetchProdotti(search, page)
  }, [search, page, fetchProdotti])

  const handleSearchSubmit = (value) => {
    setSearch(value)
    setPage(1)
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(prodotti.map(p => p.id)))
  const deselectAll = () => setSelectedIds(new Set())

  const openPrintSelected = () => {
    const selected = prodotti.filter(p => selectedIds.has(p.id))
    setPrintProdotti(selected)
    setShowPrintModal(true)
  }

  const openPrintLabel = (prodotto) => {
    setPrintProdotti([prodotto])
    setShowPrintModal(true)
  }

  const openPrintAll = async () => {
    setIsPrintLoading(true)
    try {
      // Carica tutti i prodotti (senza paginazione)
      const resp = await prodottiAPI.getAll({ limit: 10000 })
      const tutti = resp.data || []
      if (tutti.length === 0) {
        alert('Nessun prodotto da stampare.')
        return
      }
      setPrintProdotti(tutti)
      setShowPrintModal(true)
    } catch {
      // Fallback: usa i prodotti già caricati nella pagina corrente
      setPrintProdotti(prodotti)
      setShowPrintModal(true)
    } finally {
      setIsPrintLoading(false)
    }
  }

  const handleBulkGenerate = async () => {
    setIsBulkGenerating(true)
    setError('')
    try {
      const res = await prodottiAPI.bulkGenerateBarcodes({ all: true })
      const count = res.data?.generated ?? 0
      alert(`✅ Barcode generati: ${count}`)
      fetchProdotti(search, page)
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante la generazione massiva dei barcode')
    } finally {
      setIsBulkGenerating(false)
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>📦 Catalogo Prodotti</h1>
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>Inventario collectibles, TCG e articoli specializzati</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Cerca per nome, SKU..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchSubmit(searchInput)}
              className={styles.searchInput}
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); handleSearchSubmit('') }}
                className={styles.clearBtn}
                title="Cancella ricerca"
              >✕</button>
            )}
            <button
              onClick={() => handleSearchSubmit(searchInput)}
              className={styles.addBtn}
              style={{ padding: '7px 12px' }}
            >🔍</button>
            {search && (
              <span className={styles.searchCount}>{total} risultati</span>
            )}
            <button
              onClick={() => setShowScanner(true)}
              className={styles.scanBtn}
              title="Cerca con codice a barre"
            >📷</button>
          </div>
          <button onClick={() => navigate('/prodotti/nuovo')} className={styles.addBtn}>
            + Aggiungi Prodotto
          </button>
          {selectedIds.size > 0 ? (
            <button
              onClick={openPrintSelected}
              className={styles.addBtn}
              style={{ backgroundColor: '#1565c0' }}
              title={`Stampa etichette dei ${selectedIds.size} prodotti selezionati`}
            >🖨️ Stampa selezionati ({selectedIds.size})</button>
          ) : null}
          <button
            onClick={openPrintAll}
            disabled={isPrintLoading}
            className={styles.addBtn}
            style={{ backgroundColor: isPrintLoading ? '#90a4ae' : '#1565c0' }}
            title="Stampa etichette di tutti i prodotti"
          >{isPrintLoading ? '⏳ Caricamento...' : '🖨️ Stampa tutti'}</button>
          <button
            onClick={handleBulkGenerate}
            disabled={isBulkGenerating}
            className={styles.addBtn}
            style={{ backgroundColor: '#388e3c' }}
            title="Genera barcode per i prodotti che non ce l'hanno ancora"
          >{isBulkGenerating ? '⏳ Generazione...' : '⚡ Genera barcode'}</button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem', color: '#555' }}>{selectedIds.size} selezionati</span>
          <button onClick={selectAll} style={{ fontSize: '0.85rem', padding: '4px 10px', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', background: 'white' }}>Seleziona tutti</button>
          <button onClick={deselectAll} style={{ fontSize: '0.85rem', padding: '4px 10px', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', background: 'white' }}>Deseleziona tutti</button>
        </div>
      )}

      {error && <div className={styles.errorMsg}>{error}</div>}

      {isMobile ? (
        <div className={styles.cardList}>
          {prodotti.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
              {search ? `Nessun prodotto corrisponde a "${search}"` : 'Nessun prodotto trovato'}
            </div>
          ) : prodotti.map((p) => (
            <div
              key={p.id}
              className={`${styles.card} ${p.quantita < p.quantita_minima ? styles.cardLowStock : ''}`}
            >
              <div className={styles.cardHeader}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => toggleSelect(p.id)}
                  style={{ marginRight: 8, cursor: 'pointer' }}
                  aria-label={`Seleziona ${p.nome}`}
                />
                <div className={styles.cardInfo}>
                  {p.foto_url
                    ? <img
                        src={getFotoUrl(p.foto_url)}
                        alt={p.nome}
                        style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }}
                        onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'inline' }}
                      />
                    : null
                  }
                  <span style={{ fontSize: '2rem', display: p.foto_url ? 'none' : 'inline' }}>📷</span>
                  <div>
                    <div className={styles.cardName}>{p.nome}</div>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button onClick={() => navigate(`/prodotti/${p.id}`)} className={styles.actionBtn} title="Scheda dettaglio">🔍</button>
                  <button onClick={() => openPrintLabel(p)} className={styles.actionBtn} title="Stampa etichetta">🖨️</button>
                </div>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Quantità</span>
                <span className={p.quantita < p.quantita_minima ? styles.qtyLow : styles.qtyOk}>
                  {p.quantita} {p.quantita < p.quantita_minima ? '⚠️' : ''}
                </span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Barcode</span>
                <span title={p.barcode || ''}>{p.barcode ? '✅' : '⬜'}</span>
              </div>
              {p.prezzo_vendita && (
                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Prezzo</span>
                  <span className={styles.cardValue}>€{p.prezzo_vendita}</span>
                </div>
              )}
              {p.stato_conservazione && (
                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Stato</span>
                  <StatoBadge value={p.stato_conservazione} colors={STATO_CONSERVAZIONE_COLORS} />
                </div>
              )}
              {p.lingua && (
                <div className={styles.cardRow}>
                  <span className={styles.cardLabel}>Lingua</span>
                  <span className={styles.cardValue}>{p.lingua}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>
                  <input
                    type="checkbox"
                    onChange={e => e.target.checked ? selectAll() : deselectAll()}
                    checked={prodotti.length > 0 && selectedIds.size === prodotti.length}
                    title="Seleziona/deseleziona tutti"
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                {['ID', 'Foto', 'Nome', 'Quantità', 'Q.Min', 'P.Acquisto', 'P.Vendita', 'Barcode', 'Conservazione', 'Lingua', 'Azioni', 'Etichetta'].map(h => (
                  <th key={h} className={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prodotti.length === 0 ? (
                <tr className={styles.trEmpty}>
                  <td colSpan={13}>
                    {search ? `Nessun prodotto corrisponde a "${search}"` : 'Nessun prodotto trovato'}
                  </td>
                </tr>
              ) : prodotti.map((p) => (
                <tr
                  key={p.id}
                  className={p.quantita < p.quantita_minima ? styles.trLowStock : styles.trNormal}
                  style={{ borderBottom: '1px solid #eee' }}
                >
                  <td className={styles.td}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      style={{ cursor: 'pointer' }}
                      aria-label={`Seleziona ${p.nome}`}
                    />
                  </td>
                  <td className={styles.td}>{p.id}</td>
                  <td className={styles.td}>
                    {p.foto_url
                      ? <img
                          src={getFotoUrl(p.foto_url)}
                          alt={p.nome}
                          className={styles.productImg}
                          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'inline' }}
                        />
                      : null
                    }
                    <span style={{ fontSize: '1.4rem', display: p.foto_url ? 'none' : 'inline' }}>📷</span>
                  </td>
                  <td className={styles.td}>{p.nome}</td>
                  <td className={`${styles.td} ${p.quantita < p.quantita_minima ? styles.qtyLow : styles.qtyOk}`}>
                    {p.quantita}
                  </td>
                  <td className={styles.td}>{p.quantita_minima}</td>
                  <td className={styles.td}>{p.prezzo_acquisto ? `€${p.prezzo_acquisto}` : '-'}</td>
                  <td className={styles.td}>{p.prezzo_vendita ? `€${p.prezzo_vendita}` : '-'}</td>
                  <td className={styles.td} title={p.barcode || ''}>
                    {p.barcode ? '✅' : '⬜'}
                  </td>
                  <td className={styles.td}>
                    <StatoBadge value={p.stato_conservazione} colors={STATO_CONSERVAZIONE_COLORS} />
                  </td>
                  <td className={styles.td}>{p.lingua || '—'}</td>
                  <td className={styles.td}>
                    <button
                      onClick={() => navigate(`/prodotti/${p.id}`)}
                      className={styles.actionBtn}
                      title="Scheda dettaglio"
                    >🔍</button>
                  </td>
                  <td className={styles.td}>
                    <button
                      onClick={() => openPrintLabel(p)}
                      className={styles.actionBtn}
                      title="Stampa etichetta"
                    >🖨️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >← Precedente</button>
          <span>Pagina {page} di {totalPages} ({total} prodotti)</span>
          <button
            className={styles.pageBtn}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >Successiva →</button>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={(value) => {
            if (/^prodotto:\d+$/i.test(value)) {
              navigate(`/prodotti/${value.split(':')[1]}`)
              setShowScanner(false)
              return
            }
            const normalized = normalizeSkuForCode39(value)
            pendingScanAlertRef.current = normalized
            setSearchInput(normalized)
            handleSearchSubmit(normalized)
            setShowScanner(false)
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showPrintModal && (
        <PrintBarcodeModal
          prodotti={printProdotti}
          onClose={() => setShowPrintModal(false)}
        />
      )}

    </div>
  )
}

export default Prodotti