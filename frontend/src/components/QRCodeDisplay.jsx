import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

/**
 * Componente per la visualizzazione di un QR code.
 * Usa la libreria `qrcode` per renderizzare su canvas.
 *
 * Props:
 *   value       - stringa da codificare nel QR (es. SKU o "prodotto:42")
 *   size        - dimensione in pixel del canvas (default 120)
 *   productName - nome del prodotto (per accessibilità)
 */
function QRCodeDisplay({ value, size = 120, productName }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).catch(() => {})
  }, [value, size])

  if (!value) return null

  return (
    <canvas
      ref={canvasRef}
      aria-label={productName ? `QR code per ${productName}` : `QR code: ${value}`}
      style={{ display: 'block', maxWidth: '100%' }}
    />
  )
}

export default QRCodeDisplay
