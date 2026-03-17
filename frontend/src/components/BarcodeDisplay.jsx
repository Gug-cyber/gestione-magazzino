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
 */
function BarcodeDisplay({ value, productName, width = 2, height = 60, showLabel = true }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current || !value) return
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width,
        height,
        displayValue: showLabel,
        lineColor: '#000000',
        background: '#ffffff',
        margin: 8,
        fontSize: 12,
        textMargin: 4,
      })
    } catch {
      // Valore barcode non valido: lascia SVG vuoto
    }
  }, [value, width, height, showLabel])

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
