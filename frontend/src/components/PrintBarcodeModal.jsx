import BarcodeDisplay from './BarcodeDisplay'
import styles from './PrintBarcodeModal.module.css'

/**
 * Modal per la stampa di barcode prodotti.
 * Layout a griglia 3 colonne ottimizzato per A4.
 *
 * Props:
 *   prodotti  - array di oggetti prodotto con campo barcode
 *   onClose   - callback per chiudere il modal
 */
function PrintBarcodeModal({ prodotti, onClose }) {
  const prodottiConBarcode = prodotti.filter(p => p.barcode)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>🖨️ Stampa Barcode ({prodottiConBarcode.length} etichette)</h2>
          <div className={styles.actions}>
            <button onClick={handlePrint} className={styles.btnPrint}>
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
                    width={1.5}
                    height={50}
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
