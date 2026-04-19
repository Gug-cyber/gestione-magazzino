import { useEffect, useRef } from 'react'

/**
 * Hook per intercettare input da scanner barcode/QR hardware (USB HID o Bluetooth).
 *
 * Gli scanner hardware si comportano come una tastiera virtuale: inviano i caratteri
 * del codice molto rapidamente (< 80ms tra un carattere e l'altro) e terminano
 * con Enter o Tab.
 *
 * @param {Object} options
 * @param {function} options.onScan - Callback chiamata con il codice scansionato
 * @param {boolean} [options.enabled=true] - Se false, il listener è inattivo
 * @param {number} [options.minLength=3] - Lunghezza minima del buffer per considerare valida la scansione
 */
function useExternalScanner({ onScan, enabled = true, minLength = 3 } = {}) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const resetTimerRef = useRef(null)
  // Ref per onScan: aggiornata ad ogni render senza causare re-subscription
  const onScanRef = useRef(onScan)

  // Mantieni sempre il ref aggiornato all'ultima versione della callback
  useEffect(() => {
    onScanRef.current = onScan
  })

  useEffect(() => {
    if (!enabled) return

    const SCANNER_INTERVAL_MS = 80   // Max ms tra caratteri consecutivi da scanner
    const RESET_TIMEOUT_MS = 250     // Ms di silenzio dopo cui resettiamo il buffer

    const resetBuffer = () => {
      bufferRef.current = ''
      lastKeyTimeRef.current = 0
    }

    const scheduleReset = () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(resetBuffer, RESET_TIMEOUT_MS)
    }

    const handleKeyDown = (e) => {
      // Non interferire con la digitazione normale nei form
      const tag = e.target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      const now = Date.now()
      const elapsed = now - lastKeyTimeRef.current

      // Enter o Tab → fine del codice
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
        const code = bufferRef.current
        resetBuffer()
        if (code.length >= minLength) {
          e.preventDefault()
          onScanRef.current(code)
        } else if (code.length > 0) {
          e.preventDefault()
        }
        return
      }

      // Ignora tasti non-carattere (frecce, F1-F12, ecc.)
      if (e.key.length !== 1) {
        scheduleReset()
        return
      }

      // Se il tempo tra due keydown supera la soglia → digitazione umana, reset
      if (lastKeyTimeRef.current !== 0 && elapsed > SCANNER_INTERVAL_MS) {
        resetBuffer()
      }

      bufferRef.current += e.key
      lastKeyTimeRef.current = now
      scheduleReset()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetBuffer()
    }
  }, [enabled, minLength])
}

export default useExternalScanner
