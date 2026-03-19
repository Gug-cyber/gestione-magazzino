'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState } from 'react'

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
    <main
      style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 8,
            background: '#e8eaf6',
            color: '#1a237e',
            fontWeight: 700,
            fontSize: '1.1rem',
            flexShrink: 0,
          }}
          aria-label="Torna alla home"
        >
          ←
        </Link>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a237e' }}>
          🔬 Scanner Demo
        </h1>
      </header>

      <BarcodeScanner
        onDetected={handleDetected}
        onError={handleError}
        placeholder="Es. 8001234567890"
      />

      {lastError && (
        <div
          style={{
            background: '#ffebee',
            color: '#c62828',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: '0.9rem',
          }}
          role="alert"
        >
          {lastError}
        </div>
      )}

      <section>
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#333',
            marginBottom: 12,
          }}
        >
          Ultimi codici rilevati
        </h2>

        {codes.length === 0 ? (
          <p
            style={{
              color: '#999',
              fontSize: '0.9rem',
              textAlign: 'center',
              padding: '32px 0',
              background: '#fff',
              borderRadius: 10,
              border: '1.5px dashed #ddd',
            }}
          >
            Nessun codice ancora scansionato
          </p>
        ) : (
          <ol
            style={{
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {codes.map((code, i) => (
              <li
                key={`${code}-${i}`}
                style={{
                  background: '#fff',
                  borderRadius: 8,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  fontSize: '0.95rem',
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: i === 0 ? '#1a237e' : '#e8eaf6',
                    color: i === 0 ? '#fff' : '#1a237e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: i === 0 ? 600 : 400,
                    color: i === 0 ? '#1a237e' : '#333',
                    wordBreak: 'break-all',
                  }}
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
            style={{
              marginTop: 12,
              width: '100%',
              padding: '10px',
              borderRadius: 8,
              border: '1.5px solid #ddd',
              background: '#fff',
              color: '#777',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Cancella lista
          </button>
        )}
      </section>
    </main>
  )
}
