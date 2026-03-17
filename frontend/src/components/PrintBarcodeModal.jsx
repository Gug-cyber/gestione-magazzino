import JsBarcode from 'jsbarcode'
import BarcodeDisplay from './BarcodeDisplay'
import styles from './PrintBarcodeModal.module.css'

// Delay in ms before removing the print iframe from the DOM after printing.
const IFRAME_CLEANUP_DELAY_MS = 1000
// A larger canvas ensures barcodes are crisp even when scaled down on printed labels.
const CANVAS_W = 600
const CANVAS_H = 200

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
 * Using width:4 and height:140 in JsBarcode produces thick, scannable bars.
 */
function renderBarcodeToHighResPng(value) {
  try {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, value, {
      format: 'CODE128',
      width: 4,
      height: 140,
      displayValue: false,
      margin: 12,
      lineColor: '#000000',
      background: '#ffffff',
    })

    const out = document.createElement('canvas')
    out.width = CANVAS_W
    out.height = CANVAS_H
    const ctx = out.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    const scale = Math.min((CANVAS_W - 8) / canvas.width, (CANVAS_H - 8) / canvas.height)
    const dw = canvas.width * scale
    const dh = canvas.height * scale
    ctx.drawImage(canvas, (CANVAS_W - dw) / 2, (CANVAS_H - dh) / 2, dw, dh)
    return out.toDataURL('image/png')
  } catch (err) {
    console.error('Barcode generation failed for value:', value, err)
    return ''
  }
}

/**
 * Build the full HTML document for the print iframe.
 * Layout: 4-column grid, 45mm label height, A4 portrait with 8mm margins.
 */
function buildPrintHtml(labels) {
  return `<!DOCTYPE html><html lang="it"><head>
    <meta charset="utf-8">
    <title>Stampa Barcode</title>
    <style>
      @page { size: A4 portrait; margin: 8mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; background: white; }
      .grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 2mm;
      }
      .label {
        width: 100%;
        height: 45mm;
        border: 0.4pt solid #ccc;
        border-radius: 2mm;
        padding: 2mm 1.5mm;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .label-name { font-size: 7pt; font-weight: bold; color: #111; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .label-sku  { font-size: 6pt; color: #555; font-family: monospace; }
      .label-barcode { flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; overflow: hidden; }
      .label-barcode img { width: 100%; height: 22mm; object-fit: contain; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; }
      .label-value { font-size: 5.5pt; color: #333; font-family: monospace; word-break: break-all; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
  </head><body>
    <div class="grid">
      ${labels.map(l => `
        <div class="label">
          <div class="label-name" title="${escapeHtml(l.nome)}">${escapeHtml(l.nome)}</div>
          <div class="label-sku">${escapeHtml(l.sku || '')}</div>
          <div class="label-barcode">${l.imgData
            ? `<img src="${l.imgData}" alt="barcode ${escapeHtml(l.barcode)}">`
            : '<span style="font-size:6pt;color:#aaa">N/D</span>'
          }</div>
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

  const handlePrint = () => {
    const labels = prodottiConBarcode.map(p => ({
      ...p,
      imgData: renderBarcodeToHighResPng(p.barcode),
    }))

    const html = buildPrintHtml(labels)

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
            {prodottiConBarcode.map(p => (
              <div key={p.id} className={styles.label}>
                <div className={styles.labelName} title={p.nome}>{p.nome}</div>
                <div className={styles.labelSku}>{p.sku}</div>
                <div className={styles.labelBarcode}>
                  <BarcodeDisplay
                    value={p.barcode}
                    productName={p.nome}
                    width={2}
                    height={55}
                    showLabel={true}
                  />
                </div>
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
