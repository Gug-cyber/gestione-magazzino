import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

/**
 * Componente per la visualizzazione grafica di un barcode.
 * Usa JsBarcode per renderizzare il codice in formato CODE128 su SVG.
 *
 * Props:
 *   value        - stringa barcode da visualizzare
 *   productName  - nome del prodotto (opzionale, per accessibilità)
 *   width        - spessore delle barre (default 2)
 *   height       - altezza barre in pixel (default 60)
 *   showLabel    - mostra il valore testuale sotto il barcode (default true)
 *   forPrint     - se true, usa parametri ottimizzati per la stampa (default false)
 */
function BarcodeDisplay({ value, productName, width = 2, height = 60, showLabel = true, forPrint = false }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current || !value) return
    try {
      const opts = forPrint
        ? {
            format: 'CODE128',
            width: 3,
            height: 80,
            displayValue: showLabel,
            lineColor: '#000000',
            background: '#ffffff',
            margin: 12,
            fontSize: 12,
            textMargin: 4,
          }
        : {
            format: 'CODE128',
            width: Math.max(2, width),
            height,
            displayValue: showLabel,
            lineColor: '#000000',
            background: '#ffffff',
            margin: 4,
            fontSize: 11,
            textMargin: 3,
            quiet: 0,
          }
      JsBarcode(svgRef.current, value, opts)
    } catch {
      // Valore barcode non valido: lascia SVG vuoto
    }
  }, [value, width, height, showLabel, forPrint])

  if (!value) {
    return (
      <span style={{ fontSize: '0.85rem', color: '#aaa', fontStyle: 'italic' }}>
        Nessun barcode
      </span>
    )
  }

  return (
    <svg
      ref={svgRef}
      aria-label={productName ? `Barcode per ${productName}: ${value}` : `Barcode: ${value}`}
      style={{ display: 'block', maxWidth: '100%' }}
    />
  )
}

export default BarcodeDisplay
