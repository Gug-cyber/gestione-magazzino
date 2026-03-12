import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { movimentiAPI, prodottiAPI, fornitoriAPI } from '../api/client'
import BarcodeScanner from '../components/BarcodeScanner'
import { useIsMobile } from '../hooks/useIsMobile'
import StatoBadge from '../components/ui/StatoBadge'
import { TIPO_MOVIMENTO_COLORS } from '../constants/colors'
import styles from './Movimenti.module.css'

const PAGE_SIZE = 50

function Movimenti() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [movimenti, setMovimenti] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [prodotti, setProdotti] = useState([])
  const [fornitori, setFornitori] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchMovimenti = useCallback(async (currentPage) => {
    try {
      const skip = (currentPage - 1) * PAGE_SIZE
      const m = await movimentiAPI.getAll({ skip, limit: PAGE_SIZE })
      setMovimenti(m.data)
      const totalCount = parseInt(m.headers['x-total-count'] ?? '0', 10)
      setTotal(isNaN(totalCount) ? m.data.length : totalCount)
    } catch {
      setError('Errore nel caricamento dei dati')
    }
  }, [])

  useEffect(() => {
    fetchMovimenti(page)
  }, [page, fetchMovimenti])

  useEffect(() => {
    prodottiAPI.getAll({ limit: 500 }).then(r => setProdotti(r.data)).catch(() => {})
    fornitoriAPI.getAll().then(r => setFornitori(r.data)).catch(() => {})
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo movimento?')) return
    try {
      await movimentiAPI.delete(id)
      fetchMovimenti(page)
    } catch {
      setError('Errore nell\'eliminazione')
    }
  }

  const getProdottoNome = (id) => prodotti.find(p => p.id === id)?.nome || `#${id}`
  const getFornitoreNome = (id) => fornitori.find(f => f.id === id)?.nome || '-'

  const movimentiFiltrati = search
    ? movimenti.filter(m => {
        const q = search.toLowerCase()
        return (
          getProdottoNome(m.prodotto_id).toLowerCase().includes(q) ||
          (prodotti.find(p => p.id === m.prodotto_id)?.sku || '').toLowerCase().includes(q) ||
          (m.tipo || '').toLowerCase().includes(q) ||
          getFornitoreNome(m.fornitore_id).toLowerCase().includes(q) ||
          (m.note || '').toLowerCase().includes(q)
        )
      })
    : movimenti

  const tipoLabel = (tipo) => tipo === 'carico' ? '📥 carico' : '📤 scarico'

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>🔄 Movimenti</h1>
        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Cerca per prodotto, SKU, tipo, fornitore, note..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {search && (
            <button onClick={() => setSearch('')} className={styles.clearBtn} title="Cancella ricerca">✕</button>
          )}
          {search && (
            <span className={styles.searchCount}>{movimentiFiltrati.length}/{movimenti.length}</span>
          )}
          <button onClick={() => setShowScanner(true)} className={styles.scanBtn} title="Cerca con codice a barre">📷</button>
          <button onClick={() => navigate('/movimenti/nuovo')} className={styles.addBtn}>+ Registra Movimento</button>
        </div>
      </div>

      {error && <div className={styles.errorMsg}>{error}</div>}

      {isMobile ? (
        <div>
          {movimentiFiltrati.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
              {search ? `Nessun movimento corrisponde a "${search}"` : 'Nessun movimento registrato'}
            </div>
          ) : movimentiFiltrati.map((m) => (
            <div key={m.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.cardProdotto}>{getProdottoNome(m.prodotto_id)}</div>
                  <StatoBadge value={m.tipo} colors={TIPO_MOVIMENTO_COLORS} />
                </div>
                <button onClick={() => handleDelete(m.id)} className={styles.deleteBtn}>🗑️</button>
              </div>
              <div className={styles.cardRow}><span className={styles.cardLabel}>Quantità</span><span className={styles.cardValue}>{m.quantita}</span></div>
              {m.fornitore_id && <div className={styles.cardRow}><span className={styles.cardLabel}>Fornitore</span><span className={styles.cardValue}>{getFornitoreNome(m.fornitore_id)}</span></div>}
              {m.note && <div className={styles.cardRow}><span className={styles.cardLabel}>Note</span><span className={styles.cardValue}>{m.note}</span></div>}
              <div className={styles.cardRow}><span className={styles.cardLabel}>Data</span><span className={styles.cardValue} style={{ fontSize: '0.8rem' }}>{m.data_movimento ? new Date(m.data_movimento).toLocaleString('it-IT') : '-'}</span></div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {['ID', 'Prodotto', 'Tipo', 'Quantità', 'Fornitore', 'Note', 'Data', 'Azioni'].map(h => (
                  <th key={h} className={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movimentiFiltrati.length === 0 ? (
                <tr className={styles.trEmpty}>
                  <td colSpan={8}>
                    {search ? `Nessun movimento corrisponde a "${search}"` : 'Nessun movimento registrato'}
                  </td>
                </tr>
              ) : movimentiFiltrati.map((m) => (
                <tr key={m.id} className={styles.tr}>
                  <td className={styles.td}>{m.id}</td>
                  <td className={styles.td}>{getProdottoNome(m.prodotto_id)}</td>
                  <td className={styles.td}>
                    <StatoBadge value={tipoLabel(m.tipo)} colors={{ [tipoLabel(m.tipo)]: TIPO_MOVIMENTO_COLORS[m.tipo] || {} }} />
                  </td>
                  <td className={styles.td}>{m.quantita}</td>
                  <td className={styles.td}>{m.fornitore_id ? getFornitoreNome(m.fornitore_id) : '-'}</td>
                  <td className={styles.td}>{m.note || '-'}</td>
                  <td className={styles.td}>{m.data_movimento ? new Date(m.data_movimento).toLocaleString('it-IT') : '-'}</td>
                  <td className={styles.td}>
                    <button onClick={() => handleDelete(m.id)} className={styles.deleteBtn}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Precedente</button>
          <span>Pagina {page} di {totalPages} ({total} movimenti)</span>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Successiva →</button>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={(value) => { setSearch(value); setShowScanner(false) }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

export default Movimenti
