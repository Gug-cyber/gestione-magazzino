import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client'

function EbayCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    if (!code || !state) {
      setError('Parametri callback mancanti')
      return
    }

    api.get(`/api/ebay/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`)
      .then(() => {
        navigate('/ebay', { replace: true, state: { message: 'Account eBay collegato con successo' } })
      })
      .catch((e) => setError(e.response?.data?.detail || 'Errore durante il collegamento eBay'))
  }, [navigate, searchParams])

  if (error) {
    return (
      <div style={{ maxWidth: 560, margin: '80px auto', textAlign: 'center' }}>
        <h2>Errore collegamento eBay</h2>
        <p>{error}</p>
        <button className="gm-btn gm-btn-primary" onClick={() => navigate('/ebay')}>Riprova</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '80px auto', textAlign: 'center' }}>
      <h2>Collegamento in corso...</h2>
    </div>
  )
}

export default EbayCallback
