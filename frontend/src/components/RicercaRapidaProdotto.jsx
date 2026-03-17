import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { prodottiAPI } from '../api/client'
import { PRIMARY_COLOR } from '../constants/colors'

/**
 * Barra di ricerca rapida prodotti con autocomplete e pulsante scanner.
 *
 * Props:
 *   onSelect      - callback(prodotto) chiamata quando l'utente seleziona un prodotto.
 *                   Se non fornita, naviga automaticamente a /prodotti/:id
 *   placeholder   - testo placeholder (default "Cerca prodotto per nome, SKU...")
 *   showScanner   - se true, mostra pulsante 📷 per aprire scanner (default true)
 *   onScannerOpen - callback per aprire lo scanner esterno
 *   autoFocus     - se true, focus automatico sull'input (default false)
 */
function RicercaRapidaProdotto({ onSelect, placeholder, showScanner = true, onScannerOpen, autoFocus = false }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus()
  }, [autoFocus])

  // Chiudi il dropdown cliccando fuori
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const search = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await prodottiAPI.getAll({ search: q.trim(), limit: 8 })
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      setResults(items)
      setOpen(items.length > 0)
    } catch {
      setResults([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e) => {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 300)
  }

  const handleSelect = (prodotto) => {
    setQuery(prodotto.nome)
    setOpen(false)
    if (onSelect) {
      onSelect(prodotto)
    } else {
      navigate(`/prodotti/${prodotto.id}`)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setOpen(false)
    if (e.key === 'Enter' && results.length === 1) handleSelect(results[0])
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={placeholder || 'Cerca prodotto per nome, SKU...'}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1.5px solid #e0e4ef',
              borderRadius: 8,
              fontSize: '1rem',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          {loading && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>⏳</span>
          )}
        </div>
        {showScanner && onScannerOpen && (
          <button
            type="button"
            onClick={onScannerOpen}
            title="Scansiona QR / Barcode"
            style={{
              backgroundColor: PRIMARY_COLOR,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '0 16px',
              cursor: 'pointer',
              fontSize: '1.2rem',
              flexShrink: 0,
            }}
          >📷</button>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 200,
          background: 'white',
          border: '1px solid #e0e4ef',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          marginTop: 4,
          maxHeight: 320,
          overflowY: 'auto',
        }}>
          {results.map(p => (
            <div
              key={p.id}
              onMouseDown={() => handleSelect(p)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f7ff'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1a237e' }}>{p.nome}</div>
                <div style={{ fontSize: '0.8rem', color: '#888', fontFamily: 'monospace' }}>{p.sku}</div>
              </div>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: p.quantita < (p.quantita_minima || 0) ? '#c62828' : '#2e7d32',
                minWidth: 40,
                textAlign: 'right',
              }}>
                {p.quantita} pz
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RicercaRapidaProdotto
