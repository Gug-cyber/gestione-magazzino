'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState } from 'react'
import styles from './page.module.css'

const BarcodeScanner = dynamic(
  () => import('@/components/BarcodeScanner').then((m) => m.BarcodeScanner),
  { ssr: false }
)

export default function ScannerDemoPage() {
  const [codes, setCodes] = useState<string[]>([])
  const [lastError, setLastError] = useState<string>('')

  const handleDetected = (code: string) => {
    setCodes((prev) => [code, ...prev].slice(0, 5))
    setLastError('')
  }

  const handleError = (error: string) => {
    setLastError(error)
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/" className={styles.backBtn} aria-label="Torna alla home">
          ←
        </Link>
        <h1 className={styles.title}>
          <span className={styles.titleIcon}>🔬</span>
          Scanner Demo
        </h1>
      </header>

      <BarcodeScanner
        onDetected={handleDetected}
        onError={handleError}
        placeholder="Es. 8001234567890"
      />

      {lastError && (
        <div className={styles.errorBanner} role="alert">
          {lastError}
        </div>
      )}

      <section className={styles.resultSection}>
        <h2 className={styles.sectionTitle}>Ultimi codici rilevati</h2>

        {codes.length === 0 ? (
          <p className={styles.emptyState}>
            Nessun codice ancora scansionato
          </p>
        ) : (
          <ol className={styles.codeList}>
            {codes.map((code, i) => (
              <li key={`${code}-${i}`} className={styles.codeItem}>
                <span
                  className={`${styles.codeBadge} ${i === 0 ? styles.codeBadgeActive : ''}`}
                >
                  {i + 1}
                </span>
                <span
                  className={`${styles.codeText} ${i === 0 ? styles.codeTextActive : ''}`}
                >
                  {code}
                </span>
              </li>
            ))}
          </ol>
        )}

        {codes.length > 0 && (
          <button
            type="button"
            onClick={() => setCodes([])}
            className={styles.clearBtn}
          >
            Cancella lista
          </button>
        )}
      </section>
    </main>
  )
}
