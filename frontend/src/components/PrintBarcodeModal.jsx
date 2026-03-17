import JsBarcode from 'jsbarcode'
import BarcodeDisplay from './BarcodeDisplay'
import styles from './PrintBarcodeModal.module.css'

/**
 * Escape special HTML characters to prevent injection in the print window.
 */
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
 * Modal per la stampa di barcode prodotti.
 * La stampa avviene in una finestra popup dedicata (window.open) contenente
 * solo le etichette barcode — nessun altro elemento UI.
 *
 * Props:
 *   prodotti  - array di oggetti prodotto con campo barcode
 *   onClose   - callback per chiudere il modal
 */
function PrintBarcodeModal({ prodotti, onClose }) {
  const prodottiConBarcode = prodotti.filter(p => p.barcode)

  const handlePrint = () => {
    // Render each barcode on a temporary canvas and export as PNG data URL.
    // This ensures crisp, high-resolution barcodes in the printed page.
    const labels = prodottiConBarcode.map(p => {
      const canvas = document.createElement('canvas')
      try {
        JsBarcode(canvas, p.barcode, {
          format: 'CODE128',
          width: 3,
          height: 80,
          displayValue: false,
          margin: 10,
          lineColor: '#000',
          background: '#fff',
        })
      } catch {
        // Leave canvas empty if the barcode value is invalid
      }
      return { ...p, imgData: canvas.toDataURL('image/png') }
    })

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
          grid-template-columns: repeat(4, 1fr);
          gap: 4mm;
        }
        .label {
          border: 0.5mm solid #999;
          border-radius: 2mm;
          padding: 3mm 2mm;
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
          background: white;
        }
        .label-name {
          font-size: 8pt;
          font-weight: bold;
          color: #1a237e;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: 1mm;
        }
        .label-sku {
          font-size: 6.5pt;
          color: #555;
          font-family: monospace;
          margin-bottom: 2mm;
        }
        .label-barcode img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0 auto;
          image-rendering: crisp-edges;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: pixelated;
        }
        .label-value {
          font-size: 5.5pt;
          color: #333;
          font-family: monospace;
          word-break: break-all;
          margin-top: 1mm;
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
            <div class="label-barcode"><img src="${l.imgData}" alt="barcode ${escapeHtml(l.barcode)}"></div>
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
            <button onClick={handlePrint} className={styles.btnPrint} disabled={prodottiConBarcode.length === 0}>
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
                    height={70}
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
