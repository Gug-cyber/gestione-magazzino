import { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'

const STATUS = {
  INIT: '⏳ Inizializzazione fotocamera...',
  WAITING: '🔍 In attesa del codice a barre...',
  DETECTED: '✅ Codice rilevato!',
}

// Decode hints: explicitly list the formats to scan so the reader focuses on common
// product barcode types. CODE_39 and CODE_128 are prioritised (first in the array),
// with EAN/UPC/QR support as fallback. TRY_HARDER improves detection at low resolution.
const READER_HINTS = new Map([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_39, BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.QR_CODE]],
  [DecodeHintType.TRY_HARDER, true],
])

function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const streamRef = useRef(null)
  // Counter to detect stale async startCamera calls after unmount or re-invocation
  const startIdRef = useRef(0)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [status, setStatus] = useState(STATUS.INIT)
  const [scanning, setScanning] = useState(false)
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)

  const stopStream = useCallback(() => {
    try { readerRef.current?.reset() } catch { /* ignore */ }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startCamera = useCallback(async (deviceId) => {
    // Claim this start slot; any previous in-flight call will see a mismatched id and abort
    const startId = ++startIdRef.current

    // Helper: stop a newly acquired stream when this call has been superseded
    const abortIfSuperseded = (s) => {
      if (startId !== startIdRef.current) {
        s.getTracks().forEach(t => t.stop())
        return true
      }
      return false
    }

    stopStream()
    setError('')
    setStatus(STATUS.INIT)
    setScanning(false)

    // Brief pause to let the browser fully release the previous camera stream before
    // requesting a new one — this prevents the "camera flashes on then off" race condition
    // that occurs when the component is quickly unmounted and remounted.
    await new Promise(resolve => setTimeout(resolve, 150))
    if (startId !== startIdRef.current) return // a newer call superseded this one

    let stream
    try {
      const videoConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: 'environment' } }
      stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints })
    } catch {
      // Fallback: try any camera
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      } catch (e) {
        if (startId !== startIdRef.current) return
        const httpsRequiredMsg = 'Per usare la webcam da telefono/tablet è necessario HTTPS. Riavvia l\'app con VITE_HTTPS=true oppure accedi da localhost.'
        if (e.name === 'NotAllowedError') {
          const isLAN = !window.location.hostname.match(/^(localhost|127\.0\.0\.1)$/)
          if (isLAN && window.location.protocol !== 'https:') {
            setError(httpsRequiredMsg)
          } else {
            setError('Permesso fotocamera negato. Vai nelle impostazioni del browser e abilita la fotocamera.')
          }
        } else if (e.name === 'NotFoundError') {
          setError('Nessuna fotocamera trovata su questo dispositivo.')
        } else if (e.name === 'SecurityError') {
          setError(httpsRequiredMsg)
        } else {
          setError('Impossibile accedere alla fotocamera: ' + (e.message || 'Errore sconosciuto'))
        }
        return
      }
    }

    if (abortIfSuperseded(stream)) return

    // Apply continuous autofocus where supported
    try {
      const [track] = stream.getVideoTracks()
      if (track && typeof track.applyConstraints === 'function') {
        await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
      }
    } catch { /* not all cameras support this */ }

    if (abortIfSuperseded(stream)) return

    streamRef.current = stream
    if (!videoRef.current) { stream.getTracks().forEach(t => t.stop()); return }
    videoRef.current.srcObject = stream

    // Explicit play() is required on iOS even with autoPlay attribute
    try {
      await videoRef.current.play()
    } catch { /* ignore — some browsers auto-play without needing this */ }

    if (startId !== startIdRef.current) { stopStream(); return }

    const reader = new BrowserMultiFormatReader(READER_HINTS)
    readerRef.current = reader

    setStatus(STATUS.WAITING)
    setScanning(true)

    reader.decodeFromStream(stream, videoRef.current, (result) => {
      if (result) {
        setStatus(STATUS.DETECTED)
        setScanning(false)
        stopStream()
        onScan(result.getText())
        onClose()
      }
      // Scan-loop errors (NotFoundException, ChecksumException, FormatException, etc.)
      // are emitted every frame when no barcode is visible — ignore them silently.
    }).catch((e) => {
      if (startId !== startIdRef.current) return // stale — ignore
      setError('Impossibile avviare il lettore: ' + (e.message || 'Errore sconosciuto'))
    })
  }, [stopStream, onScan, onClose])

  // Enumerate cameras on mount, then start the preferred one
  useEffect(() => {
    let cancelled = false

    async function init() {
      // We need to request camera access once before enumerateDevices gives us labels
      try {
        await navigator.mediaDevices.getUserMedia({ video: true }).then(s => s.getTracks().forEach(t => t.stop()))
      } catch { /* ignore — we'll surface the error in startCamera */ }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(d => d.kind === 'videoinput')
        if (!cancelled) {
          setCameras(videoDevices)
          // Restore saved camera preference if it still exists, otherwise prefer rear camera
          let savedId = null
          try { savedId = localStorage.getItem('barcode_preferred_camera') } catch { /* private browsing / storage disabled */ }
          const savedExists = savedId && videoDevices.some(d => d.deviceId === savedId)
          let preferred
          if (savedExists) {
            preferred = savedId
          } else {
            const rearCam = videoDevices.find(d =>
              /back|rear|environment/i.test(d.label)
            )
            preferred = rearCam?.deviceId || videoDevices[0]?.deviceId || null
          }
          setSelectedCamera(preferred)
          startCamera(preferred)
        }
      } catch {
        if (!cancelled) startCamera(null)
      }
    }

    init()

    return () => {
      cancelled = true
      // Invalidate any in-flight startCamera call so it aborts after its next await
      startIdRef.current++
      stopStream()
    }
    // Empty deps: camera enumeration and initial stream must run only on mount.
    // startCamera/stopStream are stable useCallback refs; re-running on parent
    // re-renders would cause undesired camera restarts.
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const switchCamera = useCallback((deviceId) => {
    setSelectedCamera(deviceId)
    if (deviceId) {
      try { localStorage.setItem('barcode_preferred_camera', deviceId) } catch { /* private browsing / storage disabled */ }
    }
    startCamera(deviceId)
  }, [startCamera])

  const handleClose = () => {
    stopStream()
    onClose()
  }

  const statusColor = status === STATUS.DETECTED ? '#2e7d32'
    : status === STATUS.WAITING ? '#1565c0'
    : '#555'

  const videoMaxHeight = window.innerWidth < 480 ? '50vh' : '300px'

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

        {/* Video container with viewfinder overlay */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          borderRadius: '8px', backgroundColor: '#000',
          lineHeight: 0,
        }}>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            aria-label="Flusso video fotocamera per la scansione del codice a barre"
            style={{
              width: '100%',
              maxHeight: videoMaxHeight,
              objectFit: 'cover',
              display: 'block',
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease',
            }}
          />

          {/* Viewfinder rectangle */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '70%', height: '35%',
            border: '3px solid #00e5ff',
            borderRadius: '6px',
            boxSizing: 'border-box',
            animation: scanning ? 'pulse-border 1.5s ease-in-out infinite' : 'none',
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
        </div>

        {/* Camera selector (shown only when multiple cameras are available) */}
        {cameras.length > 1 && (
          <select
            value={selectedCamera || ''}
            onChange={e => switchCamera(e.target.value)}
            style={{ marginTop: '8px', width: '100%', padding: '6px', borderRadius: '4px', fontSize: '0.9rem' }}
            aria-label="Seleziona fotocamera"
          >
            {cameras.map(cam => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Fotocamera ${cam.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        )}

        {/* Zoom slider */}
        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.85rem', color: '#555', whiteSpace: 'nowrap' }}>
            Zoom:
          </label>
          <input
            type="range"
            min={1} max={3} step={0.1}
            value={zoom}
            aria-label="Livello zoom"
            aria-valuetext={`${zoom.toFixed(1)} volte`}
            onChange={e => setZoom(parseFloat(e.target.value))}
            style={{ flex: 1, cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.85rem', color: '#333', minWidth: '3ch' }}>
            {zoom.toFixed(1)}×
          </span>
        </div>

        <button
          onClick={handleClose}
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

