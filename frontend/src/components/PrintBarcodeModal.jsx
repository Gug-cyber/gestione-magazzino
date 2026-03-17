import JsBarcode from 'jsbarcode'
import BarcodeDisplay from './BarcodeDisplay'
import styles from './PrintBarcodeModal.module.css'

// Output canvas dimensions for barcode PNG images.
// Using fixed pixel dimensions ensures every product gets an identical-size PNG,
// preventing layout inconsistencies in the printed 4-column grid.
const BARCODE_PNG_W = 300
const BARCODE_PNG_H = 100

/** Escape HTML special chars to prevent injection in the print popup. */
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
 * Render a CODE128 barcode for `value` and return it as a PNG data-URL
 * with fixed pixel dimensions (BARCODE_PNG_W × BARCODE_PNG_H).
 * All products will get PNG images of the same size → uniform label layout.
 */
function renderBarcodeToFixedPng(value) {
  try {
    // Step 1: let JsBarcode render at its natural size
    const tmpCanvas = document.createElement('canvas')
    JsBarcode(tmpCanvas, value, {
      format: 'CODE128',
      width: 3,
      height: 70,
      displayValue: false,
      margin: 10,
      lineColor: '#000',
      background: '#fff',
    })

    // Step 2: redraw centered onto a fixed-size output canvas
    const outCanvas = document.createElement('canvas')
    outCanvas.width = BARCODE_PNG_W
    outCanvas.height = BARCODE_PNG_H
    const ctx = outCanvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, BARCODE_PNG_W, BARCODE_PNG_H)

    const srcW = tmpCanvas.width
    const srcH = tmpCanvas.height
    // Scale to fit, leaving a 2px border on each side
    const scale = Math.min((BARCODE_PNG_W - 4) / srcW, (BARCODE_PNG_H - 4) / srcH)
    const dstW = srcW * scale
    const dstH = srcH * scale
    const dstX = (BARCODE_PNG_W - dstW) / 2
    const dstY = (BARCODE_PNG_H - dstH) / 2
    ctx.drawImage(tmpCanvas, dstX, dstY, dstW, dstH)

    return outCanvas.toDataURL('image/png')
  } catch (err) {
    console.error('Barcode generation failed for value:', value, err)
    return ''
  }
}

/**
 * Modal for printing product barcodes.
 * Printing happens in a dedicated popup window (window.open) containing
 * only barcode labels — no other UI elements.
 *
 * Props:
 *   prodotti  — array of product objects with a `barcode` field
 *   onClose   — callback to close the modal
 */
function PrintBarcodeModal({ prodotti, onClose }) {
  const prodottiConBarcode = prodotti.filter(p => p.barcode)

  const handlePrint = () => {
    // Generate a fixed-size PNG for every product
    const labels = prodottiConBarcode.map(p => ({
      ...p,
      imgData: renderBarcodeToFixedPng(p.barcode),
    }))

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) {
      alert(
        'Il browser ha bloccato il popup di stampa.\n' +
        'Per favore consenti i popup per questo sito e riprova.'
      )
      return
    }

    win.document.write(`<!DOCTYPE html><html lang="it"><head>
      <meta charset="utf-8">
      <title>Stampa Barcode</title>
      <style>
        @page { size: A4 portrait; margin: 8mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background: white; }
        .grid {
          display: grid;
          grid-template-columns: repeat(4, 46mm);
          gap: 3mm;
          justify-content: center;
        }
        .label {
          width: 46mm;
          height: 52mm;
          border: 0.4mm solid #aaa;
          border-radius: 1.5mm;
          padding: 2.5mm 2mm;
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          overflow: hidden;
        }
        .label-name {
          font-size: 7.5pt;
          font-weight: bold;
          color: #1a237e;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
        }
        .label-sku {
          font-size: 6pt;
          color: #555;
          font-family: monospace;
        }
        .label-barcode {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          overflow: hidden;
        }
        .label-barcode img {
          width: 100%;
          height: 22mm;
          object-fit: contain;
          display: block;
          margin: 0 auto;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
          image-rendering: pixelated;
        }
        .label-value {
          font-size: 5.5pt;
          color: #333;
          font-family: monospace;
          word-break: break-all;
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
            <div class="label-sku">${escapeHtml(l.sku || '')}</div>
            <div class="label-barcode">${l.imgData
              ? `<img src="${l.imgData}" alt="barcode ${escapeHtml(l.barcode)}">`
              : '<span style="font-size:6pt;color:#aaa">N/D</span>'
            }</div>
            <div class="label-value">${escapeHtml(l.barcode)}</div>
          </div>
        `).join('')}
      </div>
      <script>window.onload = function() { window.print(); }<\/script>
    </body></html>`)
    win.document.close()
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
                    height={60}
                    showLabel={false}
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
