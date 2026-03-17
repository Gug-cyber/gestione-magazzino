import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import styles from './PrintBarcodeModal.module.css'

// Delay in ms before removing the print iframe from the DOM after printing.
const IFRAME_CLEANUP_DELAY_MS = 1000

/** Escape HTML special chars to prevent injection in the print iframe. */
function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Generate a QR code for `value` and return it as a PNG data-URL.
 * Uses the `qrcode` library asynchronously. Returns null on error.
 */
async function renderQRToHighResPng(value) {
  try {
    if (!value) return null
    return await QRCode.toDataURL(value, {
      width: 256,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
  } catch (err) {
    console.error('QR generation failed for value:', value, err)
    return null
  }
}

/**
 * Generate a barcode for `value` and return it as a PNG data-URL.
 * Uses JsBarcode on a temporary canvas. Returns null on error or missing value.
 */
function renderBarcodeToDataUrl(value) {
  if (!value) return null
  try {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 2,
      height: 50,
      displayValue: true,
      lineColor: '#000000',
      background: '#ffffff',
      margin: 4,
      fontSize: 10,
      textMargin: 2,
    })
    return canvas.toDataURL('image/png')
  } catch (err) {
    console.error('Failed to generate barcode for value:', value, err)
    return null
  }
}

/**
 * Build the full HTML document for the print iframe.
 * Layout: 5-column grid, 36mm × 35mm labels, A4 portrait with 8mm/6mm margins.
 * Each label shows: name, sku, barcode image (if available), QR code.
 */
function buildPrintHtml(labels) {
  return `<!DOCTYPE html><html lang="it"><head>
    <meta charset="utf-8">
    <title>Stampa Etichette</title>
    <style>
      @page { size: A4 portrait; margin: 8mm 6mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; background: white; }
      .grid {
        display: grid;
        grid-template-columns: repeat(5, 36mm);
        gap: 1mm;
        width: 100%;
      }
      .label {
        width: 36mm;
        height: 35mm;
        box-sizing: border-box;
        border: 0.3pt solid #ccc;
        padding: 1.5mm;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .label-name {
        font-size: 4pt;
        font-weight: bold;
        color: #111;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: center;
      }
      .label-sku { font-size: 3.5pt; color: #555; text-align: center; }
      .label-barcode img {
        width: 32mm;
        height: auto;
        max-height: 10mm;
        display: block;
      }
      .label-qr img {
        width: 10mm;
        height: 10mm;
        image-rendering: pixelated;
        display: block;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  </head><body>
    <div class="grid">
      ${labels.map(l => `
        <div class="label">
          <div class="label-name" title="${escapeHtml(l.nome)}">${escapeHtml(l.nome)}</div>
          <div class="label-sku">${escapeHtml(l.codice || l.sku || String(l.id || ''))}</div>
          ${l.barcodeData ? `<div class="label-barcode"><img src="${l.barcodeData}" alt="Barcode ${escapeHtml(l.barcode)}"></div>` : ''}
          ${l.qrData ? `<div class="label-qr"><img src="${l.qrData}" alt="QR ${escapeHtml(l.qrValue)}"></div>` : ''}
        </div>
      `).join('')}
    </div>
  </body></html>`
}

/**
 * Modal for printing product labels with QR codes.
 * Printing happens in a hidden iframe — avoids popup blockers and does not
 * print the main application UI.
 *
 * Props:
 *   prodotti  — array of product objects
 *   onClose   — callback to close the modal
 */
function PrintBarcodeModal({ prodotti, onClose }) {
  const [labelsWithQr, setLabelsWithQr] = useState([])
  const [loadingQr, setLoadingQr] = useState(true)

  // Generate QR codes and barcodes asynchronously for all products
  useEffect(() => {
    let cancelled = false
    async function generateQRs() {
      setLoadingQr(true)
      const results = await Promise.all(
        prodotti.map(async (p) => {
          const qrValue = `prodotto:${p.id}`
          const qrData = await renderQRToHighResPng(qrValue)
          const barcodeData = renderBarcodeToDataUrl(p.barcode)
          return { ...p, qrValue, qrData, barcodeData }
        })
      )
      if (!cancelled) {
        setLabelsWithQr(results)
        setLoadingQr(false)
      }
    }
    generateQRs()
    return () => { cancelled = true }
  }, [prodotti])

  const handlePrint = () => {
    const html = buildPrintHtml(labelsWithQr)

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;'
    document.body.appendChild(iframe)
    iframe.contentDocument.open()
    iframe.contentDocument.write(html)
    iframe.contentDocument.close()

    iframe.contentWindow.onload = () => {
      try {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      } catch (err) {
        console.error('Print failed:', err)
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
          }
        }, IFRAME_CLEANUP_DELAY_MS)
      }
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>🖨️ Stampa Etichette ({prodotti.length} etichette)</h2>
          <div className={styles.actions}>
            <button
              onClick={handlePrint}
              className={styles.btnPrint}
              disabled={prodotti.length === 0 || loadingQr}
            >
              {loadingQr ? '⏳ Generazione...' : '🖨️ Stampa'}
            </button>
            <button onClick={onClose} className={styles.btnClose}>
              ✕ Chiudi
            </button>
          </div>
        </div>

        {prodotti.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', padding: '32px 0' }}>
            Nessun prodotto da stampare.
          </p>
        ) : loadingQr ? (
          <p style={{ textAlign: 'center', color: '#888', padding: '32px 0' }}>
            ⏳ Generazione QR code in corso...
          </p>
        ) : (
          <div className={styles.grid}>
            {labelsWithQr.map(p => (
              <div key={p.id} className={styles.label}>
                <div className={styles.labelName} title={p.nome}>{p.nome}</div>
                <div className={styles.labelSku}>{p.codice ?? p.sku ?? String(p.id ?? '')}</div>
                {p.barcodeData && (
                  <img src={p.barcodeData} alt={`Barcode ${p.barcode}`} className={styles.labelBarcode} />
                )}
                {p.qrData
                  ? <img src={p.qrData} alt={`QR ${p.qrValue}`} className={styles.labelQr} />
                  : <span style={{ fontSize: 9, color: '#aaa' }}>N/D</span>
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PrintBarcodeModal
