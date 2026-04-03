'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import styles from './BarcodeScanner.module.css'

export interface BarcodeScannerProps {
  onDetected: (code: string) => void
  onError?: (error: string) => void
  autoStart?: boolean
  placeholder?: string
  className?: string
  scanMode?: 'auto' | 'barcode' | 'qr'
}

type ScannerState = 'idle' | 'scanning' | 'detected' | 'error'

function BarcodeScannerInner({
  onDetected,
  onError,
  autoStart = false,
  placeholder = 'Inserisci codice manualmente',
  className,
  scanMode = 'auto',
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const detectedRef = useRef(false)
  const videoTrackRef = useRef<MediaStreamTrack | null>(null)

  const [isOpen, setIsOpen] = useState(autoStart)
  const [scannerState, setScannerState] = useState<ScannerState>('idle')
  const [detectedCode, setDetectedCode] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [manualCode, setManualCode] = useState<string>('')
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [activeScanMode, setActiveScanMode] = useState(scanMode)

  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop()
      controlsRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (videoTrackRef.current) {
      videoTrackRef.current.stop()
      videoTrackRef.current = null
    }
    detectedRef.current = false
  }, [])

  const startScanner = useCallback(async () => {
    setErrorMessage('')
    setScannerState('scanning')
    detectedRef.current = false

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg =
        '❌ Camera non disponibile. Usa HTTPS o inserisci il codice manualmente.'
      setErrorMessage(msg)
      setScannerState('error')
      onError?.(msg)
      return
    }

    try {
      const { BrowserMultiFormatReader, DecodeHintType } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()

      // Configure hints based on scan mode for better accuracy
      const hints = new Map()
      if (activeScanMode === 'barcode' || activeScanMode === 'auto') {
        hints.set(DecodeHintType.TRY_HARDER, true)
        hints.set(DecodeHintType.ALSO_INVERTED, true)
      }
      reader.setHints(hints)

      // Request camera with higher resolution for better barcode clarity
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      }

      const controls = await reader.decodeFromConstraints(
        constraints,
        videoRef.current!,
        (result, error) => {
          if (detectedRef.current) return

          if (result) {
            detectedRef.current = true
            const code = result.getText()
            setDetectedCode(code)
            setScannerState('detected')
            onDetected(code)

            // Haptic feedback on detection
            if (navigator.vibrate) {
              navigator.vibrate([50, 100, 50])
            }

            setTimeout(() => {
              stopScanner()
              setIsOpen(false)
              setScannerState('idle')
              setDetectedCode('')
            }, 1500)
          } else if (
            error &&
            error.name !== 'NotFoundException' &&
            error.message !== 'No MultiFormat Readers were able to detect the code.'
          ) {
            // Surface unexpected errors only
            const msg = `❌ Errore scanner: ${error.message}`
            setErrorMessage(msg)
            setScannerState('error')
            onError?.(msg)
          }
        }
      )

      // Check torch availability
      try {
        const stream = videoRef.current?.srcObject as MediaStream
        const track = stream?.getVideoTracks?.()?.[0]
        videoTrackRef.current = track || null
        if (track?.getCapabilities?.()?.torch) {
          setTorchAvailable(true)
        }
      } catch {
        // Ignore torch detection errors
      }

      controlsRef.current = controls
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? '❌ Permesso camera negato. Consenti l\'accesso alla camera.'
          : '❌ Impossibile accedere alla camera.'
      setErrorMessage(msg)
      setScannerState('error')
      onError?.(msg)
    }
  }, [onDetected, onError, stopScanner, activeScanMode])

  useEffect(() => {
    if (isOpen) {
      startScanner()
    } else {
      stopScanner()
      setScannerState('idle')
      setErrorMessage('')
      setDetectedCode('')
    }
    return () => {
      stopScanner()
    }
  }, [isOpen, startScanner, stopScanner])

  const handleToggle = () => {
    setIsOpen((prev) => !prev)
  }

  const toggleTorch = async () => {
    if (!videoTrackRef.current) return
    try {
      await videoTrackRef.current.applyConstraints({
        advanced: [{ torch: !torchEnabled }],
      })
      setTorchEnabled(!torchEnabled)
    } catch (err) {
      console.error('Torch toggle failed:', err)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = manualCode.trim()
    if (!trimmed) return
    onDetected(trimmed)
    setManualCode('')
  }

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        onClick={handleToggle}
        className={styles.toggleBtn}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Chiudi Scanner' : 'Apri Scanner'}
      >
        {isOpen ? '✕ Chiudi Scanner' : '📷 Apri Scanner'}
      </button>

      {/* Scan Mode Selector */}
      {isOpen && (
        <div className={styles.modeSelector}>
          {(['auto', 'barcode', 'qr'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveScanMode(mode)}
              className={[
                styles.modeBtn,
                activeScanMode === mode ? styles.modeBtnActive : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={activeScanMode === mode}
            >
              {mode === 'auto' ? '🔄 Auto' : mode === 'barcode' ? '📊 Barcode' : '📱 QR'}
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <div className={styles.videoWrapper}>
          <video
            ref={videoRef}
            className={styles.video}
            playsInline
            autoPlay
            muted
            aria-label="Viewport fotocamera per scansione"
          />
          <div
            className={styles.overlay}
            aria-hidden="true"
          >
            <div
              className={[
                styles.reticle,
                activeScanMode === 'barcode' ? styles.reticleBarcode : '',
                activeScanMode === 'qr' ? styles.reticleQr : '',
                scannerState === 'scanning' ? styles.reticlePulse : '',
                scannerState === 'detected' ? styles.reticleDetected : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
            {scannerState === 'scanning' && (
              <div className={styles.scanLine} />
            )}
          </div>

          {/* Torch button */}
          {torchAvailable && (
            <button
              type="button"
              onClick={toggleTorch}
              className={[
                styles.torchBtn,
                torchEnabled ? styles.torchBtnOn : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={torchEnabled}
              title={torchEnabled ? 'Disattiva torcia' : 'Attiva torcia'}
            >
              {torchEnabled ? '🔦' : '💡'}
            </button>
          )}
        </div>
      )}

      {scannerState === 'detected' && detectedCode && (
        <div className={styles.feedbackSuccess} role="status">
          ✅ Codice rilevato: <strong>{detectedCode}</strong>
        </div>
      )}

      {scannerState === 'error' && errorMessage && (
        <div className={styles.feedbackError} role="alert">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleManualSubmit} className={styles.manualInput}>
        <label htmlFor="manual-code" className={styles.manualLabel}>
          Inserisci codice manualmente
        </label>
        <div className={styles.manualRow}>
          <input
            id="manual-code"
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder={placeholder}
            className={styles.input}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button type="submit" className={styles.confirmBtn}>
            Conferma
          </button>
        </div>
      </form>
    </div>
  )
}

const BarcodeScannerNoSSR = dynamic(
  () => Promise.resolve(BarcodeScannerInner),
  { ssr: false }
)

export function BarcodeScanner(props: BarcodeScannerProps) {
  return <BarcodeScannerNoSSR {...props} />
}
