import { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatOneDReader } from '@zxing/browser'

const STATUS = {
  INIT: '⏳ Inizializzazione fotocamera...',
  WAITING: '🔍 In attesa del codice a barre...',
  DETECTED: '✅ Codice rilevato!',
}

function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [status, setStatus] = useState(STATUS.INIT)
  const [scanning, setScanning] = useState(false)

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

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      try {
        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)

        // Apply advanced focus constraints where supported
        try {
          const [track] = stream.getVideoTracks()
          if (track && typeof track.applyConstraints === 'function') {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' }],
            })
          }
        } catch {
          // Not all browsers/cameras support these constraints — degrade gracefully
        }

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = stream
        if (!videoRef.current) return
        videoRef.current.srcObject = stream

        const reader = new BrowserMultiFormatOneDReader()
        readerRef.current = reader

        setStatus(STATUS.WAITING)
        setScanning(true)

        reader.decodeFromVideoElement(videoRef.current, (result, err) => {
          if (cancelled) return
          if (result) {
            setStatus(STATUS.DETECTED)
            setScanning(false)
            stopStream()
            onScan(result.getText())
            onClose()
            return
          }
          if (err) {
            const ignoredErrors = ['NotFoundException', 'ChecksumException', 'FormatException']
            if (!ignoredErrors.includes(err.name) && err.message) {
              setError('Errore durante la scansione: ' + err.message)
            }
          }
        }).catch((e) => {
          if (!cancelled) {
            setError('Impossibile avviare il lettore: ' + (e.message || 'Errore sconosciuto'))
          }
        })
      } catch (e) {
        if (!cancelled) {
          setError('Impossibile accedere alla webcam: ' + (e.message || 'Errore sconosciuto'))
        }
      }
    }

    startCamera()

    return () => {
      cancelled = true
      stopStream()
    }
  }, [onScan, onClose, stopStream])

  const handleClose = () => {
    stopStream()
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
            aria-label="Flusso video fotocamera per la scansione del codice a barre"
            style={{
              width: '100%', display: 'block',
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
