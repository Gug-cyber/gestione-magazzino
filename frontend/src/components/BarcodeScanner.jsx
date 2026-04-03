import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const STATUS = {
  INIT: '⏳ Inizializzazione fotocamera...',
  WAITING: '🔍 In attesa del codice a barre...',
  DETECTED: '✅ Codice rilevato!',
  FOCUSING: '🎯 Messa a fuoco...',
}

// Enhanced formats: QR_CODE first (most reliable), then common 1D barcodes
// Added CODE_39, ITF, CODABAR, DATA_MATRIX for better compatibility
const FORMATS_TO_SUPPORT = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
]

// Scanning regions: wider for 1D barcodes, square for QR codes
const QRBOX_1D = { width: 320, height: 160 }  // Optimized for barcode
const QRBOX_QR = { width: 280, height: 280 }  // Square for QR
const QRBOX = QRBOX_QR  // Default

function BarcodeScanner({ onScan, onClose }) {
  const [error, setError] = useState('')
  const [status, setStatus] = useState(STATUS.INIT)
  const [scanning, setScanning] = useState(false)
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [scanMode, setScanMode] = useState('auto') // 'auto', 'barcode', 'qr'

  const scannerRef = useRef(null)
  const mountedRef = useRef(true)
  const successHandledRef = useRef(false)
  const streamRef = useRef(null)

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

      // Check torch availability from stream
      if (scanMode === 'barcode' || scanMode === 'auto') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
          })
          streamRef.current = stream
          const track = stream.getVideoTracks()[0]
          if (track?.getCapabilities?.().torch) {
            setTorchAvailable(true)
          }
          // Close this test stream
          stream.getTracks().forEach(t => t.stop())
        } catch {
          // Ignore torch check errors
        }
      }

      const html5QrCode = new Html5Qrcode('barcode-reader')
      scannerRef.current = html5QrCode

      setStatus(STATUS.INIT)
      setError('')

      const config = {
        fps: 30, // Increased from 20 for faster, more responsive scanning
        qrbox: scanMode === 'qr' ? QRBOX_QR : scanMode === 'barcode' ? QRBOX_1D : { width: 300, height: 200 },
        aspectRatio: 1.777778,
        formatsToSupport: FORMATS_TO_SUPPORT,
        disableFlip: false, // Allow reading flipped/mirrored barcodes
        videoConstraints: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 }, // Full HD for better barcode clarity
          height: { ideal: 1080, min: 720 },
          advanced: [
            { focusMode: 'continuous' },
            { exposureMode: 'continuous' },
            { whiteBalanceMode: 'continuous' },
          ],
        },
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true, // Use native BarcodeDetector API when available
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
        onScan(decodedText.trim())
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setTorchEnabled(false)
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

  const toggleTorch = async () => {
    if (!streamRef.current) return
    try {
      const track = streamRef.current.getVideoTracks()[0]
      if (track) {
        await track.applyConstraints({ advanced: [{ torch: !torchEnabled }] })
        setTorchEnabled(!torchEnabled)
      }
    } catch (err) {
      console.error('Torch toggle error:', err)
    }
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
        <h3 style={{ color: '#1a237e', marginTop: 0 }}>📷 Scansiona QR / Barcode</h3>

        {/* Scan Mode Selector */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
          {['auto', 'barcode', 'qr'].map(mode => (
            <button
              key={mode}
              onClick={() => setScanMode(mode)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600',
                border: `2px solid ${scanMode === mode ? '#1a237e' : '#ccc'}`,
                background: scanMode === mode ? '#1a237e' : 'white',
                color: scanMode === mode ? 'white' : '#1a237e',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              aria-pressed={scanMode === mode}
            >
              {mode === 'auto' ? '🔄 Auto' : mode === 'barcode' ? '📊 Barcode' : '📱 QR'}
            </button>
          ))}
        </div>

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
            aria-label="Flusso video fotocamera per la scansione QR / barcode"
            style={{ width: '100%' }}
          ></div>

          {/* Scanning viewfinder overlay */}
          {scanning && (
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: scanMode === 'qr' ? '70%' : '80%',
              maxWidth: scanMode === 'qr' ? QRBOX_QR.width : QRBOX_1D.width,
              height: scanMode === 'qr' ? '70%' : '30%',
              maxHeight: scanMode === 'qr' ? QRBOX_QR.height : QRBOX_1D.height,
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

          {/* Torch button */}
          {torchAvailable && (
            <button
              onClick={toggleTorch}
              style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                background: torchEnabled ? '#ffc107' : 'rgba(255,255,255,0.2)',
                color: torchEnabled ? '#000' : '#fff',
                fontSize: '1.2rem',
                transition: 'all 0.2s',
                zIndex: 10,
              }}
              title={torchEnabled ? 'Disattiva torcia' : 'Attiva torcia'}
              aria-pressed={torchEnabled}
            >
              {torchEnabled ? '🔦' : '💡'}
            </button>
          )}
        </div>

        {/* Guide text */}
        <p style={{ fontSize: '0.82rem', color: '#555', marginBottom: '8px' }}>
          📐 Allinea il QR code o il barcode al centro del riquadro
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

