import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import StoreLayout from '../../components/store/StoreLayout'
import { storeAPI } from '../../api/store'

export default function StoreFooterPage() {
  const { slug } = useParams()
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    storeAPI.getFooterPage(slug)
      .then(res => setPage(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <StoreLayout>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 16px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <div className="spinner" />
          </div>
        )}

        {!loading && notFound && (
          <div style={{ textAlign: 'center', padding: '60px 16px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <h2 style={{ color: 'var(--color-text)', marginBottom: '8px' }}>Pagina non trovata</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>
              La pagina che stai cercando non esiste o non è disponibile.
            </p>
          </div>
        )}

        {!loading && page && (
          <>
            <h1 style={{
              fontSize: 'clamp(22px, 4vw, 32px)',
              fontWeight: '700',
              color: 'var(--color-text)',
              marginBottom: '24px',
              borderBottom: '2px solid var(--color-primary)',
              paddingBottom: '12px',
            }}>
              {page.titolo}
            </h1>

            {page.contenuto ? (
              <div
                style={{
                  color: 'var(--color-text)',
                  lineHeight: '1.7',
                  fontSize: '15px',
                }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(page.contenuto),
                }}
              />
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Contenuto non ancora disponibile.
              </p>
            )}
          </>
        )}
      </div>
    </StoreLayout>
  )
}
