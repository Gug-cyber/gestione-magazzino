import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StoreLayout from '../../components/store/StoreLayout'
import { useClienteAuth } from '../../context/ClienteAuthContext'
import { storeAPI } from '../../api/store'

const STATO_LABEL = {
  in_attesa: 'In attesa',
  confermato: 'Confermato',
  in_lavorazione: 'In lavorazione',
  spedito: 'Spedito',
  consegnato: 'Consegnato',
  annullato: 'Annullato',
  reso_richiesto: 'Reso richiesto',
  reso_approvato: 'Reso approvato',
  reso_completato: 'Reso completato',
}

const STATO_COLOR = {
  in_attesa: { bg: '#fff8e1', color: '#f59e0b' },
  confermato: { bg: '#e8f4fd', color: '#3b82f6' },
  in_lavorazione: { bg: '#ede9fe', color: '#7c3aed' },
  spedito: { bg: '#ecfdf5', color: '#10b981' },
  consegnato: { bg: '#d1fae5', color: '#059669' },
  annullato: { bg: '#fee2e2', color: '#ef4444' },
  reso_richiesto: { bg: '#ffedd5', color: '#ea580c' },
  reso_approvato: { bg: '#fef3c7', color: '#d97706' },
  reso_completato: { bg: '#f0fdf4', color: '#16a34a' },
}

function StatoBadge({ stato }) {
  const s = STATO_COLOR[stato] || { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: '600',
      background: s.bg,
      color: s.color,
    }}>
      {STATO_LABEL[stato] || stato}
    </span>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 style={{
      margin: '0 0 16px',
      fontSize: '18px',
      fontWeight: '700',
      color: 'var(--color-text)',
      paddingBottom: '10px',
      borderBottom: '1px solid var(--store-border, var(--color-border))',
    }}>
      {children}
    </h2>
  )
}

function Card({ children }) {
  return (
    <div style={{
      background: 'var(--store-surface, var(--color-bg-elevated))',
      border: '1px solid var(--store-border, var(--color-border))',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
    }}>
      {children}
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text', disabled, placeholder }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '9px 12px',
          border: '1px solid var(--store-border, var(--color-border))',
          borderRadius: '8px',
          fontSize: '14px',
          color: 'var(--color-text)',
          background: disabled ? 'var(--color-bg-muted, #f9fafb)' : 'var(--color-bg)',
          outline: 'none',
          boxSizing: 'border-box',
          cursor: disabled ? 'default' : 'text',
        }}
      />
    </div>
  )
}

export default function StoreAccountPage() {
  const { cliente, loading, logout, updateCliente } = useClienteAuth()
  const navigate = useNavigate()

  const [ordini, setOrdini] = useState([])
  const [ordiniLoading, setOrdiniLoading] = useState(true)

  const [editMode, setEditMode] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    cognome: '',
    telefono: '',
    indirizzo: '',
    numero_civico: '',
    cap: '',
    citta: '',
    provincia: '',
    paese: '',
  })

  useEffect(() => {
    if (!loading && !cliente) {
      navigate('/store/login', { replace: true, state: { from: '/store/account' } })
    }
    if (cliente) {
      setForm({
        nome: cliente.nome || '',
        cognome: cliente.cognome || '',
        telefono: cliente.telefono || '',
        indirizzo: cliente.indirizzo || '',
        numero_civico: cliente.numero_civico || '',
        cap: cliente.cap || '',
        citta: cliente.citta || '',
        provincia: cliente.provincia || '',
        paese: cliente.paese || '',
      })
    }
  }, [cliente, loading, navigate])

  useEffect(() => {
    if (cliente) {
      storeAPI.clienteOrdini()
        .then(res => setOrdini(res.data || []))
        .catch(() => setOrdini([]))
        .finally(() => setOrdiniLoading(false))
    }
  }, [cliente])

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveError('')
    setSaveSuccess(false)
    setSaveLoading(true)
    try {
      await updateCliente(form)
      setEditMode(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err?.response?.data?.detail || 'Errore durante il salvataggio')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/store', { replace: true })
  }

  if (loading) {
    return (
      <StoreLayout>
        <div style={{ textAlign: 'center', padding: '80px 16px', color: 'var(--color-text-secondary)' }}>
          Caricamento…
        </div>
      </StoreLayout>
    )
  }

  if (!cliente) return null

  return (
    <StoreLayout>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: 'var(--color-text)' }}>
              Il mio account
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Bentornato, {cliente.nome}!
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '9px 18px',
              background: 'none',
              border: '1px solid var(--color-danger-border, #fca5a5)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--color-danger, #d32f2f)',
              cursor: 'pointer',
            }}
          >
            Esci
          </button>
        </div>

        {/* Profilo */}
        <Card>
          <SectionTitle>Profilo</SectionTitle>
          {saveSuccess && (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#059669',
            }}>
              Profilo aggiornato con successo!
            </div>
          )}
          {saveError && (
            <div style={{
              background: 'var(--color-danger-bg, #fff0f0)',
              border: '1px solid var(--color-danger-border, #ffcccc)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '13px',
              color: 'var(--color-danger, #d32f2f)',
            }}>
              {saveError}
            </div>
          )}

          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <InputField label="Nome" value={form.nome} onChange={set('nome')} disabled={!editMode} />
              <InputField label="Cognome" value={form.cognome} onChange={set('cognome')} disabled={!editMode} />
            </div>
            <InputField label="Email" value={cliente.email} disabled type="email" />
            <InputField label="Telefono" value={form.telefono} onChange={set('telefono')} disabled={!editMode} placeholder="+39 333 123 4567" />

            <p style={{ margin: '16px 0 8px', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
              INDIRIZZO DI SPEDIZIONE
            </p>
            <InputField label="Indirizzo" value={form.indirizzo} onChange={set('indirizzo')} disabled={!editMode} />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0 14px' }}>
              <InputField label="Città" value={form.citta} onChange={set('citta')} disabled={!editMode} />
              <InputField label="N. civico" value={form.numero_civico} onChange={set('numero_civico')} disabled={!editMode} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 14px' }}>
              <InputField label="CAP" value={form.cap} onChange={set('cap')} disabled={!editMode} />
              <InputField label="Provincia" value={form.provincia} onChange={set('provincia')} disabled={!editMode} />
              <InputField label="Paese" value={form.paese} onChange={set('paese')} disabled={!editMode} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              {!editMode ? (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  style={{
                    padding: '9px 20px',
                    background: 'var(--store-primary, var(--color-primary))',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Modifica
                </button>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    style={{
                      padding: '9px 20px',
                      background: saveLoading ? 'var(--color-border)' : 'var(--store-primary, var(--color-primary))',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: saveLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {saveLoading ? 'Salvataggio…' : 'Salva'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false)
                      setSaveError('')
                    }}
                    style={{
                      padding: '9px 20px',
                      background: 'none',
                      border: '1px solid var(--store-border, var(--color-border))',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Annulla
                  </button>
                </>
              )}
            </div>
          </form>
        </Card>

        {/* Ordini */}
        <Card>
          <SectionTitle>I miei ordini</SectionTitle>
          {ordiniLoading ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Caricamento ordini…</p>
          ) : ordini.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              Nessun ordine effettuato ancora.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ordini.map(ordine => (
                <div key={ordine.id} style={{
                  border: '1px solid var(--store-border, var(--color-border))',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--color-text)' }}>
                      {ordine.numero_ordine}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {ordine.data_ordine ? new Date(ordine.data_ordine).toLocaleDateString('it-IT') : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <StatoBadge stato={ordine.stato} />
                    <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--color-text)', marginTop: '4px' }}>
                      €{Number(ordine.totale).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </StoreLayout>
  )
}
