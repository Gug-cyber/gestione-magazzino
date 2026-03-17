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
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printProdotti, setPrintProdotti] = useState([])
  const [isBulkGenerating, setIsBulkGenerating] = useState(false)
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

  const handleDeleteAll = () => {
    const confirmed = window.confirm(
      `⚠️ ATTENZIONE!\n\nStai per eliminare TUTTI i ${total} prodotti.\n\nQuesta operazione è IRREVERSIBILE.\n\nVuoi continuare?`
    )
    if (!confirmed) return
    setShowDeleteAllModal(true)
    setDeleteConfirmText('')
  }

  const confirmDeleteAll = async () => {
    if (deleteConfirmText !== 'ELIMINA') {
      alert('Devi digitare esattamente la parola "ELIMINA" per confermare.')
      return
    }
    setIsDeleting(true)
    setError('')
    try {
      const response = await prodottiAPI.deleteAll()
      const deletedCount = response.data?.deleted_count ?? 0
      setShowDeleteAllModal(false)
      setDeleteConfirmText('')
      alert(`✅ Operazione completata!\n\n${deletedCount} prodotti eliminati con successo.`)
      setPage(1)
      fetchProdotti(search, 1)
    } catch (err) {
      setError(err.response?.data?.detail || "Errore durante l'eliminazione massiva dei prodotti")
      setShowDeleteAllModal(false)
    } finally {
      setIsDeleting(false)
    }
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

  const openPrintAll = () => {
    setPrintProdotti(prodotti)
    setShowPrintModal(true)
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
        <h1 className={styles.title}>📦 Prodotti</h1>
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
          <button
            onClick={() => navigate('/barcode/scanner')}
            className={styles.scanBtn}
            title="Vai allo scanner barcode"
          >📷 Scanner</button>
          {selectedIds.size > 0 ? (
            <button
              onClick={openPrintSelected}
              className={styles.addBtn}
              style={{ backgroundColor: '#1565c0' }}
              title={`Stampa barcode dei ${selectedIds.size} prodotti selezionati`}
            >🖨️ Stampa selezionati ({selectedIds.size})</button>
          ) : null}
          <button
            onClick={openPrintAll}
            className={styles.addBtn}
            style={{ backgroundColor: '#1565c0' }}
            title="Stampa barcode di tutti i prodotti"
          >🖨️ Stampa tutti</button>
          <button
            onClick={handleBulkGenerate}
            disabled={isBulkGenerating}
            className={styles.addBtn}
            style={{ backgroundColor: '#388e3c' }}
            title="Genera barcode per i prodotti che non ce l'hanno ancora"
          >{isBulkGenerating ? '⏳ Generazione...' : '⚡ Genera barcode'}</button>
          <button
            onClick={handleDeleteAll}
            disabled={total === 0 || isDeleting}
            className={styles.deleteAllBtn}
            title={total === 0 ? 'Nessun prodotto da eliminare' : `Elimina tutti i ${total} prodotti`}
          >
            🗑️ Elimina Tutti
          </button>
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
                {['ID', 'Foto', 'Nome', 'Quantità', 'Q.Min', 'P.Acquisto', 'P.Vendita', 'Barcode', 'Conservazione', 'Lingua', 'Azioni'].map(h => (
                  <th key={h} className={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prodotti.length === 0 ? (
                <tr className={styles.trEmpty}>
                  <td colSpan={12}>
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

      {showDeleteAllModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ color: '#c62828', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ ATTENZIONE: Eliminazione massiva
            </h2>
            <p style={{ color: '#333', marginBottom: '16px', lineHeight: 1.6 }}>
              Stai per eliminare <strong>TUTTI i {total} prodotti</strong> dal database.
            </p>
            <div style={{
              backgroundColor: '#ffebee',
              border: '1px solid #ef9a9a',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
            }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#c62828' }}>
                <strong>Questa operazione:</strong>
              </p>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '0.9rem', color: '#c62828' }}>
                <li>Eliminerà <strong>{total} prodotti</strong></li>
                <li>È <strong>IRREVERSIBILE</strong></li>
                <li>Non può essere annullata</li>
              </ul>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Per confermare, digita la parola: <span style={{ color: '#c62828' }}>ELIMINA</span>
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Digita ELIMINA"
                disabled={isDeleting}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ccc',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowDeleteAllModal(false); setDeleteConfirmText('') }}
                disabled={isDeleting}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.95rem',
                }}
              >
                Annulla
              </button>
              <button
                onClick={confirmDeleteAll}
                disabled={isDeleting || deleteConfirmText !== 'ELIMINA'}
                style={{
                  backgroundColor: deleteConfirmText === 'ELIMINA' && !isDeleting ? '#c62828' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: deleteConfirmText === 'ELIMINA' && !isDeleting ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold',
                  fontSize: '0.95rem',
                  opacity: deleteConfirmText === 'ELIMINA' && !isDeleting ? 1 : 0.6,
                }}
              >
                {isDeleting ? '⏳ Eliminazione...' : '🗑️ Conferma Eliminazione'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Prodotti