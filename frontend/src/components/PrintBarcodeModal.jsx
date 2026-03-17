import { useMemo } from 'react'
import JsBarcode from 'jsbarcode'
import styles from './PrintBarcodeModal.module.css'

// Delay in ms before removing the print iframe from the DOM after printing.
const IFRAME_CLEANUP_DELAY_MS = 1000
// High-resolution canvas for crisp barcode rendering at 30×20mm label size.
const CANVAS_W = 900
const CANVAS_H = 600

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
 * Render a CODE128 barcode for `value` at high resolution and return it as
 * a PNG data-URL on a fixed CANVAS_W × CANVAS_H canvas.
 * Returns null if the value is invalid or JsBarcode throws.
 */
function renderBarcodeToHighResPng(value) {
  try {
    if (!value) return null
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 3,
      height: 90,
      displayValue: false,
      margin: 8,
      lineColor: '#000000',
      background: '#ffffff',
    })

    const out = document.createElement('canvas')
    out.width = CANVAS_W
    out.height = CANVAS_H
    const ctx = out.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    const scale = Math.min((CANVAS_W - 16) / canvas.width, (CANVAS_H - 16) / canvas.height)
    const dw = canvas.width * scale
    const dh = canvas.height * scale
    ctx.drawImage(canvas, (CANVAS_W - dw) / 2, (CANVAS_H - dh) / 2, dw, dh)
    return out.toDataURL('image/png')
  } catch (err) {
    console.error('Barcode generation failed for value:', value, err)
    return null
  }
}

/**
 * Build the full HTML document for the print iframe.
 * Layout: 6-column grid, 30mm × 20mm labels, A4 portrait with 8mm/6mm margins.
 * Labels that have no barcode image are skipped.
 */
function buildPrintHtml(labels) {
  return `<!DOCTYPE html><html lang="it"><head>
    <meta charset="utf-8">
    <title>Stampa Barcode</title>
    <style>
      @page { size: A4 portrait; margin: 8mm 6mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; background: white; }
      .grid {
        display: grid;
        grid-template-columns: repeat(6, 30mm);
        gap: 1mm;
        width: 100%;
      }
      .label {
        width: 30mm;
        height: 20mm;
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
      .label-sku  { font-size: 3.5pt; color: #555; text-align: center; }
      .label-barcode img {
        width: 100%;
        height: auto;
        max-height: 9mm;
        image-rendering: auto;
        display: block;
      }
      .label-value { font-size: 4pt; font-family: monospace; text-align: center; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  </head><body>
    <div class="grid">
      ${labels.filter(l => l.imgData).map(l => `
        <div class="label">
          <div class="label-name" title="${escapeHtml(l.nome)}">${escapeHtml(l.nome)}</div>
          <div class="label-sku">${escapeHtml(l.codice || l.sku || String(l.id || ''))}</div>
          <div class="label-barcode"><img src="${l.imgData}" alt="barcode ${escapeHtml(l.barcode)}"></div>
          <div class="label-value">${escapeHtml(l.barcode)}</div>
        </div>
      `).join('')}
    </div>
  </body></html>`
}

/**
 * Modal for printing product barcodes.
 * Printing happens in a hidden iframe — avoids popup blockers and does not
 * print the main application UI.
 *
 * Props:
 *   prodotti  — array of product objects with a `barcode` field
 *   onClose   — callback to close the modal
 */
function PrintBarcodeModal({ prodotti, onClose }) {
  const prodottiConBarcode = prodotti.filter(p => p.barcode)

  // Compute barcode images once per render cycle, keyed by product list identity.
  const labelsWithImg = useMemo(
    () => prodottiConBarcode.map(p => ({
      ...p,
      imgData: renderBarcodeToHighResPng(p.barcode),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prodotti]
  )

  const handlePrint = () => {
    const html = buildPrintHtml(labelsWithImg)

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
          <h2 className={styles.title}>🖨️ Stampa Barcode ({prodottiConBarcode.length} etichette)</h2>
          <div className={styles.actions}>
            <button
              onClick={handlePrint}
              className={styles.btnPrint}
              disabled={prodottiConBarcode.length === 0}
            >
              🖨️ Stampa
            </button>
            <button onClick={onClose} className={styles.btnClose}>
              ✕ Chiudi
            </button>
          </div>
        </div>

        {prodottiConBarcode.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', padding: '32px 0' }}>
            Nessun prodotto con barcode generato da stampare.
          </p>
        ) : (
          <div className={styles.grid}>
            {labelsWithImg.map(p => (
              <div key={p.id} className={styles.label}>
                <div className={styles.labelName} title={p.nome}>{p.nome}</div>
                <div className={styles.labelSku}>{p.codice ?? p.sku ?? String(p.id ?? '')}</div>
                {p.imgData
                  ? <img src={p.imgData} alt={`barcode ${p.barcode}`} className={styles.labelBarcode} />
                  : <span style={{ fontSize: 9, color: '#aaa' }}>N/D</span>
                }
                <div className={styles.labelValue}>{p.barcode}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PrintBarcodeModal
