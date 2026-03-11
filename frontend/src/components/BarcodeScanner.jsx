import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatOneDReader } from '@zxing/browser'

function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const reader = new BrowserMultiFormatOneDReader()
    readerRef.current = reader

    reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
      if (result) {
        onScan(result.getText())
        onClose()
      }
      if (err && !(err.name === 'NotFoundException')) {
        setError('Errore durante la scansione: ' + err.message)
      }
    }).catch((e) => {
      setError('Impossibile accedere alla webcam: ' + e.message)
    })

    return () => {
      if (readerRef.current) {
        try { readerRef.current.reset() } catch { /* ignore cleanup errors on unmount */ }
      }
    }
  }, [onScan, onClose])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', padding: '24px',
        maxWidth: '480px', width: '90%', textAlign: 'center',
      }}>
        <h3 style={{ color: '#1a237e', marginTop: 0 }}>📷 Scansiona Codice a Barre</h3>
        {error
          ? <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>
          : <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '12px' }}>
              Punta la webcam verso il codice a barre
            </p>
        }
        <video ref={videoRef} style={{ width: '100%', borderRadius: '8px', backgroundColor: '#000' }} />
        <button
          onClick={onClose}
          style={{
            marginTop: '16px', backgroundColor: '#c62828', color: 'white',
            border: 'none', borderRadius: '6px', padding: '8px 20px',
            cursor: 'pointer', fontWeight: 'bold',
          }}
        >✕ Chiudi</button>
      </div>
    </div>
  )
}

export default BarcodeScanner
