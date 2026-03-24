import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { prodottiAPI, categorieAPI, getFotoUrl } from '../api/client'
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
  const [allProdotti, setAllProdotti] = useState([])
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

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('prodottiVisibleColumns')
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore parse errors
    }
    return {
      foto: true,
      quantita: true,
      qMin: true,
      prezzoAcquisto: true,
      prezzoVendita: true,
      barcode: true,
      conservazione: true,
      lingua: true,
      etichetta: true,
    }
  })

  const [showColumnFilter, setShowColumnFilter] = useState(false)
  const columnFilterRef = useRef(null)

  const [filterBarcode, setFilterBarcode] = useState('all')
  const [filterDisponibilita, setFilterDisponibilita] = useState('all')
  const [filterPrezzo, setFilterPrezzo] = useState('all')
  const [filterCategoria, setFilterCategoria] = useState('all')
  const [categorie, setCategorie] = useState([])

  useEffect(() => {
    localStorage.setItem('prodottiVisibleColumns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    categorieAPI.getAll()
      .then(res => setCategorie(res.data || []))
      .catch(err => {
        console.error('Failed to load categories:', err)
        setCategorie([])
      })
  }, [])

  useEffect(() => {
    if (!showColumnFilter) return
    const handleClickOutside = (e) => {
      if (columnFilterRef.current && !columnFilterRef.current.contains(e.target)) {
        setShowColumnFilter(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColumnFilter])

  const toggleColumn = (col) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))
  }

  // Fixed columns + 1 checkbox col + visible configurable cols
  const visibleColCount = useMemo(() => {
    // Always visible: checkbox(1), ID(1), Nome(1), Azioni(1) = 4
    const configurable = Object.values(visibleColumns).filter(Boolean).length
    return 4 + configurable
  }, [visibleColumns])

  const COLUMN_LABELS = [
    { key: 'foto', label: 'Foto' },
    { key: 'quantita', label: 'Quantità' },
    { key: 'qMin', label: 'Q.Min' },
    { key: 'prezzoAcquisto', label: 'P.Acquisto' },
    { key: 'prezzoVendita', label: 'P.Vendita' },
    { key: 'barcode', label: 'Barcode' },
    { key: 'conservazione', label: 'Conservazione' },
    { key: 'lingua', label: 'Lingua' },
    { key: 'etichetta', label: 'Etichetta' },
  ]

  const applyFilters = useCallback((productsList) => {
    let filtered = [...productsList]

    if (filterBarcode === 'with') {
      filtered = filtered.filter(p => p.barcode && p.barcode.trim() !== '')
    } else if (filterBarcode === 'without') {
      filtered = filtered.filter(p => !p.barcode || p.barcode.trim() === '')
    }

    if (filterDisponibilita === 'available') {
      filtered = filtered.filter(p => p.quantita > 0)
    } else if (filterDisponibilita === 'outofstock') {
      filtered = filtered.filter(p => p.quantita === 0)
    } else if (filterDisponibilita === 'lowstock') {
      filtered = filtered.filter(p => p.quantita_minima != null && p.quantita < p.quantita_minima)
    }

    if (filterPrezzo === 'with') {
      filtered = filtered.filter(p => p.prezzo_vendita != null && p.prezzo_vendita > 0)
    } else if (filterPrezzo === 'without') {
      filtered = filtered.filter(p => !p.prezzo_vendita || p.prezzo_vendita <= 0)
    } else if (filterPrezzo === 'gt10') {
      filtered = filtered.filter(p => p.prezzo_vendita && parseFloat(p.prezzo_vendita) > 10)
    } else if (filterPrezzo === 'gt50') {
      filtered = filtered.filter(p => p.prezzo_vendita && parseFloat(p.prezzo_vendita) > 50)
    } else if (filterPrezzo === 'gt100') {
      filtered = filtered.filter(p => p.prezzo_vendita && parseFloat(p.prezzo_vendita) > 100)
    }

    if (filterCategoria !== 'all') {
      filtered = filtered.filter(p => p.categoria_id === parseInt(filterCategoria))
    }

    return filtered
  }, [filterBarcode, filterDisponibilita, filterPrezzo, filterCategoria])

  const isFilterActive = filterBarcode !== 'all' || filterDisponibilita !== 'all' || filterPrezzo !== 'all' || filterCategoria !== 'all'

  const prodottiFiltrati = useMemo(() => applyFilters(isFilterActive ? allProdotti : prodotti), [allProdotti, prodotti, applyFilters, isFilterActive])

  const resetFilters = () => {
    setFilterBarcode('all')
    setFilterDisponibilita('all')
    setFilterPrezzo('all')
    setFilterCategoria('all')
    setPage(1)
  }


  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchProdotti = useCallback(async (currentSearch, currentPage) => {
    try {
      let resp
      if (isFilterActive) {
        // Filtri attivi: carica TUTTI i prodotti per applicare i filtri lato client
        resp = await prodottiAPI.getAll({ limit: 10000, search: currentSearch || undefined })
        setAllProdotti(resp.data)
        setProdotti([])
      } else {
        // Nessun filtro: paginazione normale
        const skip = (currentPage - 1) * PAGE_SIZE
        resp = await prodottiAPI.getAll({ skip, limit: PAGE_SIZE, search: currentSearch || undefined })
        setProdotti(resp.data)
        setAllProdotti([])
      }
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
  }, [filterBarcode, filterDisponibilita, filterPrezzo, filterCategoria, isFilterActive])

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

  const selectAll = () => setSelectedIds(new Set(prodottiFiltrati.map(p => p.id)))
  const deselectAll = () => setSelectedIds(new Set())

  const openPrintSelected = () => {
    // Cerca nei prodotti attualmente caricati (tutti se filtri attivi, pagina corrente altrimenti)
    const sourceList = isFilterActive ? allProdotti : prodotti
    let selected = sourceList.filter(p => selectedIds.has(p.id))

    if (selected.length < selectedIds.size) {
      // Alcuni prodotti selezionati non sono nella lista corrente (selezionati su pagine diverse):
      // li recuperiamo dall'API
      prodottiAPI.getAll({ limit: 10000, search: search || undefined })
        .then(resp => {
          const allProducts = resp.data || []
          const selectedProducts = allProducts.filter(p => selectedIds.has(p.id))
          setPrintProdotti(selectedProducts)
          setShowPrintModal(true)
        })
        .catch(() => {
          setPrintProdotti(selected)
          setShowPrintModal(true)
        })
    } else {
      setPrintProdotti(selected)
      setShowPrintModal(true)
    }
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
          </div>
          <button onClick={() => navigate('/prodotti/nuovo')} className={styles.addBtn}>
            + Aggiungi Prodotto
          </button>
          {!isMobile && (
            <div ref={columnFilterRef} style={{ position: 'relative' }}>
              <button
                className={styles.addBtn}
                style={{ backgroundColor: '#374151' }}
                onClick={() => setShowColumnFilter(v => !v)}
                title="Mostra/nascondi colonne"
              >⚙️ Colonne</button>
              {showColumnFilter && (
                <div className={styles.columnDropdown}>
                  <div className={styles.columnDropdownTitle}>Colonne visibili</div>
                  {COLUMN_LABELS.map(({ key, label }) => (
                    <label key={key} className={styles.columnDropdownItem}>
                      <input
                        type="checkbox"
                        checked={!!visibleColumns[key]}
                        onChange={() => toggleColumn(key)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          {selectedIds.size > 0 ? (
            <button
              onClick={openPrintSelected}
              className={styles.addBtn}
              style={{ backgroundColor: '#1565c0' }}
              title={`Stampa etichette dei ${selectedIds.size} prodotti selezionati`}
            >🖨️ Stampa selezionati ({selectedIds.size})</button>
          ) : null}
        </div>
      </div>

      {/* Filtri */}
      <div className={styles.filtersRow}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Barcode:</label>
          <select
            value={filterBarcode}
            onChange={e => setFilterBarcode(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Tutti</option>
            <option value="with">Con barcode</option>
            <option value="without">Senza barcode</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Disponibilità:</label>
          <select
            value={filterDisponibilita}
            onChange={e => setFilterDisponibilita(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Tutti</option>
            <option value="available">Disponibili</option>
            <option value="outofstock">Esauriti</option>
            <option value="lowstock">Sotto scorta</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Prezzo:</label>
          <select
            value={filterPrezzo}
            onChange={e => setFilterPrezzo(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Tutti</option>
            <option value="with">Con prezzo vendita</option>
            <option value="without">Senza prezzo vendita</option>
            <option value="gt10">Prezzo &gt; €10</option>
            <option value="gt50">Prezzo &gt; €50</option>
            <option value="gt100">Prezzo &gt; €100</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Categoria:</label>
          <select
            value={filterCategoria}
            onChange={e => setFilterCategoria(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Tutte</option>
            {categorie.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
        </div>
        {isFilterActive && (
          <button onClick={resetFilters} className={styles.resetFiltersBtn}>
            ✕ Reset filtri
          </button>
        )}
        {isFilterActive && (
          <span className={styles.filterCount}>
            Mostrando {prodottiFiltrati.length} prodotti (filtrati)
          </span>
        )}
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
          {prodottiFiltrati.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
              {isFilterActive ? 'Nessun prodotto corrisponde ai filtri selezionati' : search ? `Nessun prodotto corrisponde a "${search}"` : 'Nessun prodotto trovato'}
            </div>
          ) : prodottiFiltrati.map((p) => (
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
                    onChange={e => {
                      if (e.target.checked) {
                        selectAll()
                      } else {
                        const filteredIds = new Set(prodottiFiltrati.map(p => p.id))
                        setSelectedIds(prev => new Set([...prev].filter(id => !filteredIds.has(id))))
                      }
                    }}
                    checked={prodottiFiltrati.length > 0 && prodottiFiltrati.every(p => selectedIds.has(p.id))}
                    title="Seleziona/deseleziona tutti"
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th className={styles.th}>ID</th>
                {visibleColumns.foto && <th className={styles.th}>Foto</th>}
                <th className={styles.th}>Nome</th>
                {visibleColumns.quantita && <th className={styles.th}>Quantità</th>}
                {visibleColumns.qMin && <th className={styles.th}>Q.Min</th>}
                {visibleColumns.prezzoAcquisto && <th className={styles.th}>P.Acquisto</th>}
                {visibleColumns.prezzoVendita && <th className={styles.th}>P.Vendita</th>}
                {visibleColumns.barcode && <th className={styles.th}>Barcode</th>}
                {visibleColumns.conservazione && <th className={styles.th}>Conservazione</th>}
                {visibleColumns.lingua && <th className={styles.th}>Lingua</th>}
                <th className={styles.th}>Azioni</th>
                {visibleColumns.etichetta && <th className={styles.th}>Etichetta</th>}
              </tr>
            </thead>
            <tbody>
              {prodottiFiltrati.length === 0 ? (
                <tr className={styles.trEmpty}>
                  <td colSpan={visibleColCount}>
                    {isFilterActive ? 'Nessun prodotto corrisponde ai filtri selezionati' : search ? `Nessun prodotto corrisponde a "${search}"` : 'Nessun prodotto trovato'}
                  </td>
                </tr>
              ) : prodottiFiltrati.map((p) => (
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
                  {visibleColumns.foto && (
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
                  )}
                  <td className={styles.td}>{p.nome}</td>
                  {visibleColumns.quantita && (
                    <td className={`${styles.td} ${p.quantita < p.quantita_minima ? styles.qtyLow : styles.qtyOk}`}>
                      {p.quantita}
                    </td>
                  )}
                  {visibleColumns.qMin && <td className={styles.td}>{p.quantita_minima}</td>}
                  {visibleColumns.prezzoAcquisto && <td className={styles.td}>{p.prezzo_acquisto ? `€${p.prezzo_acquisto}` : '-'}</td>}
                  {visibleColumns.prezzoVendita && <td className={styles.td}>{p.prezzo_vendita ? `€${p.prezzo_vendita}` : '-'}</td>}
                  {visibleColumns.barcode && (
                    <td className={styles.td} title={p.barcode || ''}>
                      {p.barcode ? '✅' : '⬜'}
                    </td>
                  )}
                  {visibleColumns.conservazione && (
                    <td className={styles.td}>
                      <StatoBadge value={p.stato_conservazione} colors={STATO_CONSERVAZIONE_COLORS} />
                    </td>
                  )}
                  {visibleColumns.lingua && <td className={styles.td}>{p.lingua || '—'}</td>}
                  <td className={styles.td}>
                    <button
                      onClick={() => navigate(`/prodotti/${p.id}`)}
                      className={styles.actionBtn}
                      title="Scheda dettaglio"
                    >🔍</button>
                  </td>
                  {visibleColumns.etichetta && (
                    <td className={styles.td}>
                      <button
                        onClick={() => openPrintLabel(p)}
                        className={styles.actionBtn}
                        title="Stampa etichetta"
                      >🖨️</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && !isFilterActive && (
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