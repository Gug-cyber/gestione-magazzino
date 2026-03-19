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
}

type ScannerState = 'idle' | 'scanning' | 'detected' | 'error'

function BarcodeScannerInner({
  onDetected,
  onError,
  autoStart = false,
  placeholder = 'Inserisci codice manualmente',
  className,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const detectedRef = useRef(false)

  const [isOpen, setIsOpen] = useState(autoStart)
  const [scannerState, setScannerState] = useState<ScannerState>('idle')
  const [detectedCode, setDetectedCode] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [manualCode, setManualCode] = useState<string>('')

  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop()
      controlsRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
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
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()

      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current!,
        (result, error) => {
          if (detectedRef.current) return

          if (result) {
            detectedRef.current = true
            const code = result.getText()
            setDetectedCode(code)
            setScannerState('detected')
            onDetected(code)

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
  }, [onDetected, onError, stopScanner])

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
                scannerState === 'scanning' ? styles.reticlePulse : '',
                scannerState === 'detected' ? styles.reticleDetected : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
          </div>
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
