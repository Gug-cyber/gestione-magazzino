import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const STATUS = {
  INIT: '⏳ Inizializzazione fotocamera...',
  WAITING: '🔍 In attesa del codice a barre...',
  DETECTED: '✅ Codice rilevato!',
}

// Formats to scan: CODE_128 first (primary format used for product labels),
// then CODE_39 and common retail formats as fallback.
const FORMATS_TO_SUPPORT = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.QR_CODE,
]

// Scanning region dimensions — wider and shorter for CODE128 1D barcodes.
// Shared between the html5-qrcode config and the viewfinder overlay so both stay in sync.
const QRBOX = { width: 300, height: 120 }

function BarcodeScanner({ onScan, onClose }) {
  const [error, setError] = useState('')
  const [status, setStatus] = useState(STATUS.INIT)
  const [scanning, setScanning] = useState(false)
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)

  const scannerRef = useRef(null)
  const mountedRef = useRef(true)
  const successHandledRef = useRef(false)

  // Initialize scanner and enumerate cameras on mount
  useEffect(() => {
    mountedRef.current = true
    successHandledRef.current = false

    async function init() {
      try {
        const devices = await Html5Qrcode.getCameras()

        if (!mountedRef.current) return

        if (!devices || devices.length === 0) {
          setError('Nessuna fotocamera trovata su questo dispositivo.')
          return
        }

        setCameras(devices)

        // Restore saved camera preference or prefer rear camera
        let preferredCameraId = null
        try {
          preferredCameraId = localStorage.getItem('barcode_preferred_camera')
        } catch { /* private browsing */ }

        const savedExists = preferredCameraId && devices.some(d => d.id === preferredCameraId)

        let cameraId
        if (savedExists) {
          cameraId = preferredCameraId
        } else {
          // Prefer rear/back/environment camera
          const rearCamera = devices.find(d =>
            /back|rear|environment/i.test(d.label)
          )
          cameraId = rearCamera?.id || devices[0]?.id
        }

        setSelectedCamera(cameraId)
        await startScanning(cameraId)
      } catch (err) {
        if (mountedRef.current) {
          setError('Impossibile accedere alla fotocamera: ' + (err.message || 'Errore sconosciuto'))
        }
      }
    }

    init()

    return () => {
      mountedRef.current = false
      stopScanning()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startScanning = async (cameraId) => {
    if (!mountedRef.current) return

    try {
      // Stop any existing scanner instance before creating a new one
      if (scannerRef.current) {
        try { await scannerRef.current.stop() } catch { /* ignore */ }
        try { scannerRef.current.clear() } catch { /* ignore */ }
        scannerRef.current = null
      }

      const html5QrCode = new Html5Qrcode('barcode-reader')
      scannerRef.current = html5QrCode

      setStatus(STATUS.INIT)
      setError('')

      const config = {
        fps: 15,
        qrbox: QRBOX,
        aspectRatio: 1.777778,
        formatsToSupport: FORMATS_TO_SUPPORT,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      }

      // Success callback: called once when a barcode is detected
      const onScanSuccess = (decodedText) => {
        if (successHandledRef.current || !mountedRef.current) return

        successHandledRef.current = true
        setStatus(STATUS.DETECTED)
        setScanning(false)

        // Haptic feedback (vibration on mobile)
        if (navigator.vibrate) {
          navigator.vibrate(200)
        }

        stopScanning()
        onScan(decodedText)
        onClose()
      }

      // Error callback: called every frame when no barcode is visible — ignore silently
      const onScanError = () => {}

      await html5QrCode.start(
        cameraId,
        config,
        onScanSuccess,
        onScanError
      )

      if (!mountedRef.current) {
        stopScanning()
        return
      }

      setStatus(STATUS.WAITING)
      setScanning(true)

    } catch (err) {
      if (!mountedRef.current) return

      const httpsRequiredMsg = 'Per usare la webcam da telefono/tablet è necessario HTTPS. Riavvia l\'app con VITE_HTTPS=true oppure accedi da localhost.'

      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        const isLAN = !window.location.hostname.match(/^(localhost|127\.0\.0\.1)$/)
        if (isLAN && window.location.protocol !== 'https:') {
          setError(httpsRequiredMsg)
        } else {
          setError('Permesso fotocamera negato. Vai nelle impostazioni del browser e abilita la fotocamera.')
        }
      } else if (err.name === 'NotFoundError' || err.message?.includes('not found')) {
        setError('Nessuna fotocamera trovata su questo dispositivo.')
      } else if (err.name === 'NotReadableError' || err.message?.includes('in use')) {
        setError('Fotocamera ancora in uso. Attendi qualche secondo e riprova.')
      } else if (err.name === 'SecurityError') {
        setError(httpsRequiredMsg)
      } else {
        setError('Impossibile avviare lo scanner: ' + (err.message || 'Errore sconosciuto'))
      }
    }
  }

  const stopScanning = () => {
    if (scannerRef.current) {
      try { scannerRef.current.stop().catch(() => {}) } catch { /* ignore */ }
      try { scannerRef.current.clear() } catch { /* ignore */ }
      scannerRef.current = null
    }
  }

  const switchCamera = async (cameraId) => {
    setSelectedCamera(cameraId)
    if (cameraId) {
      try {
        localStorage.setItem('barcode_preferred_camera', cameraId)
      } catch { /* private browsing */ }
    }
    successHandledRef.current = false
    await startScanning(cameraId)
  }

  const handleClose = () => {
    stopScanning()
    onClose()
  }

  const statusColor = status === STATUS.DETECTED ? '#2e7d32'
    : status === STATUS.WAITING ? '#1565c0'
    : '#555'

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <style>{`
        @keyframes pulse-border {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div style={{
        backgroundColor: 'white', borderRadius: '12px', padding: '24px',
        maxWidth: '480px', width: '90%', textAlign: 'center',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <h3 style={{ color: '#1a237e', marginTop: 0 }}>📷 Scansiona Codice a Barre</h3>

        {/* Status indicator */}
        <p style={{
          color: statusColor, fontSize: '0.9rem', marginBottom: '12px',
          fontWeight: 600, minHeight: '1.2em',
        }}>
          {error ? <span style={{ color: 'red' }}>{error}</span> : status}
        </p>

        {/* html5-qrcode renders the video feed inside this div */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '8px',
          marginBottom: '12px',
        }}>
          <div
            id="barcode-reader"
            aria-label="Flusso video fotocamera per la scansione del codice a barre"
            style={{ width: '100%' }}
          ></div>

          {/* Scanning viewfinder overlay */}
          {scanning && (
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '70%', maxWidth: QRBOX.width,
              height: '40%', maxHeight: QRBOX.height,
              border: '3px solid #00e5ff',
              borderRadius: '8px',
              boxSizing: 'border-box',
              animation: 'pulse-border 1.5s ease-in-out infinite',
              pointerEvents: 'none',
            }}>
              {/* Corner accents */}
              {[
                { top: -3, left: -3, borderTop: '4px solid #ff1744', borderLeft: '4px solid #ff1744' },
                { top: -3, right: -3, borderTop: '4px solid #ff1744', borderRight: '4px solid #ff1744' },
                { bottom: -3, left: -3, borderBottom: '4px solid #ff1744', borderLeft: '4px solid #ff1744' },
                { bottom: -3, right: -3, borderBottom: '4px solid #ff1744', borderRight: '4px solid #ff1744' },
              ].map((s, i) => (
                <div key={i} style={{
                  position: 'absolute', width: 18, height: 18,
                  borderRadius: 2, ...s,
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Guide text */}
        <p style={{ fontSize: '0.82rem', color: '#555', marginBottom: '8px' }}>
          📐 Allinea il codice a barre al centro del riquadro
        </p>

        {/* Camera selector (only shown when multiple cameras are available) */}
        {cameras.length > 1 && (
          <select
            value={selectedCamera || ''}
            onChange={e => switchCamera(e.target.value)}
            style={{
              marginBottom: '12px',
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontSize: '0.9rem',
            }}
            aria-label="Seleziona fotocamera"
          >
            {cameras.map(cam => (
              <option key={cam.id} value={cam.id}>
                {cam.label || `Fotocamera ${cam.id.slice(0, 8)}`}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={handleClose}
          style={{
            marginTop: '8px',
            backgroundColor: '#c62828',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 24px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.95rem',
          }}
        >
          ✕ Chiudi
        </button>
      </div>
    </div>
  )
}

export default BarcodeScanner

