import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* --------------------------------------------------------------------------
 * Icons (inline SVG – nessuna dipendenza aggiuntiva)
 * -------------------------------------------------------------------------- */
function Icon({ name }) {
  const icons = {
    box: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27,6.96 12,12.01 20.73,6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    barcode: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14" /><path d="M3 5h2M3 19h2M19 5h2M19 19h2" />
      </svg>
    ),
    cart: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
    chart: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
    truck: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" /><polygon points="16,8 20,8 23,11 23,16 16,16 16,8" />
        <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    users: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    invoice: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10,9 9,9 8,9" />
      </svg>
    ),
    shield: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    check: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20,6 9,17 4,12" />
      </svg>
    ),
    x: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    zap: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
      </svg>
    ),
    store: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
      </svg>
    ),
    mobile: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
    github: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
      </svg>
    ),
  }
  return icons[name] || null
}

/* --------------------------------------------------------------------------
 * Sezione Hero
 * -------------------------------------------------------------------------- */
function HeroSection() {
  return (
    <section style={{
      padding: 'clamp(60px, 10vw, 120px) clamp(16px, 5vw, 48px)',
      textAlign: 'center',
      background: 'linear-gradient(160deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow decorativo */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '400px',
        background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(99,102,241,0.12)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '999px',
          padding: '6px 16px',
          fontSize: '13px',
          color: 'var(--primary-300)',
          fontWeight: '600',
          marginBottom: '28px',
          letterSpacing: '0.02em',
        }}>
          <span>✨</span>
          <span>Open Source · Licenza MIT · Gratis</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(2.2rem, 6vw, 4rem)',
          fontWeight: '800',
          lineHeight: '1.1',
          color: 'var(--text-primary)',
          margin: '0 0 24px',
          letterSpacing: '-0.02em',
        }}>
          Gestione magazzino<br />
          <span style={{
            background: 'linear-gradient(90deg, var(--primary), var(--primary-300))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>semplice e completa</span>
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
          color: 'var(--text-secondary)',
          lineHeight: '1.7',
          maxWidth: '620px',
          margin: '0 auto 40px',
        }}>
          Inventario, ordini, fornitori, fatturazione italiana, store e-commerce integrato,
          barcode/QR, analisi finanziarie e tracking spedizioni — tutto in un'unica app.
        </p>

        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--primary)',
              color: '#fff',
              padding: '14px 28px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '15px',
              transition: 'all 150ms ease',
              boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-hover)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            🚀 Inizia gratis
          </Link>
          <a
            href="/store"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              color: 'var(--text-primary)',
              padding: '14px 28px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '15px',
              border: '1px solid var(--border-secondary)',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary-300)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-secondary)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          >
            🛍️ Vedi lo store demo
          </a>
          <a
            href="https://github.com/Gug-cyber/gestione-magazzino"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              padding: '14px 24px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '15px',
              border: '1px solid var(--border-primary)',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-primary)' }}
          >
            <Icon name="github" />
            GitHub
          </a>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 'clamp(24px, 5vw, 56px)',
          marginTop: '56px',
          flexWrap: 'wrap',
        }}>
          {[
            { value: '100%', label: 'Open Source' },
            { value: 'MIT', label: 'Licenza libera' },
            { value: '5 min', label: 'Setup con Docker' },
            { value: '0€', label: 'Self-hosted gratis' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: '800', color: 'var(--primary-300)' }}>{stat.value}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
 * Sezione Features
 * -------------------------------------------------------------------------- */
const FEATURES = [
  {
    icon: 'box',
    title: 'Inventario completo',
    desc: 'Catalogo prodotti con SKU, categorie, ubicazioni fisiche, soglie di riordino e alert automatici per scorte esaurite.',
  },
  {
    icon: 'barcode',
    title: 'Barcode & QR Code',
    desc: 'Genera, stampa e scansiona barcode/QR da browser o smartphone. Creazione rapida prodotto da scansione.',
  },
  {
    icon: 'cart',
    title: 'Ordini & Store integrato',
    desc: 'Gestisci ordini B2B dal backoffice e attiva uno store e-commerce pubblico con carrello e checkout in un clic.',
  },
  {
    icon: 'truck',
    title: 'Forniture & Tracking',
    desc: 'Ciclo acquisti completo: ordina ai fornitori, traccia le spedizioni in ingresso e uscita con aggiornamento automatico.',
  },
  {
    icon: 'chart',
    title: 'Analisi finanziarie',
    desc: 'Dashboard con ricavi, costi, marginalità mensile/annuale, top prodotti venduti e confronto mese su mese.',
  },
  {
    icon: 'invoice',
    title: 'Fatturazione italiana',
    desc: 'Genera fatture PDF con P.IVA, codice SDI, PEC, IVA. Supporto note di credito e archiviazione documenti.',
  },
  {
    icon: 'users',
    title: 'Ruoli e permessi',
    desc: '5 livelli di accesso: guest, operatore, magazziniere, manager, admin. Ogni utente vede solo ciò che gli compete.',
  },
  {
    icon: 'mobile',
    title: 'PWA Mobile-first',
    desc: 'Installabile come app su smartphone. Interfaccia ottimizzata per operatori di magazzino in mobilità.',
  },
  {
    icon: 'store',
    title: 'Integrazioni marketplace',
    desc: 'Prezzi aggiornati da CardMarket ed eBay API. Supporto CardTrader. Import/export CSV prodotti.',
  },
  {
    icon: 'shield',
    title: 'Sicurezza & Audit',
    desc: 'JWT, bcrypt, RBAC, rate limiting, activity log completo. CI/CD con Bandit, Semgrep e npm audit.',
  },
  {
    icon: 'zap',
    title: 'Feature Flags',
    desc: 'Attiva o disattiva funzionalità a caldo senza riavvii. Ideale per rollout graduali e personalizzazioni per cliente.',
  },
  {
    icon: 'github',
    title: 'Open Source & Docker',
    desc: 'Deploy in 5 minuti con Docker Compose. Supporto Render, Koyeb, Vercel. Codice MIT — nessun lock-in.',
  },
]

function FeaturesSection() {
  return (
    <section style={{
      padding: 'clamp(60px, 8vw, 100px) clamp(16px, 5vw, 48px)',
      background: 'var(--bg-secondary)',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 16px' }}>
            Tutto quello che ti serve, già dentro
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
            Nessun plugin, nessun add-on a pagamento. Ogni funzionalità è inclusa di default.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
        }}>
          {FEATURES.map(f => (
            <div
              key={f.title}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '12px',
                padding: '24px',
                transition: 'all 200ms ease',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.1)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-primary)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(99,102,241,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-300)',
                marginBottom: '16px',
              }}>
                <Icon name={f.icon} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
 * Sezione Demo (link allo store demo e al login)
 * -------------------------------------------------------------------------- */
function DemoSection() {
  return (
    <section style={{
      padding: 'clamp(60px, 8vw, 100px) clamp(16px, 5vw, 48px)',
      background: 'var(--bg-primary)',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 16px' }}>
          Prova subito senza installare nulla
        </h2>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 48px', lineHeight: '1.6' }}>
          Accedi al backoffice di demo oppure sfoglia lo store e-commerce pubblico direttamente dal browser.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '48px',
        }}>
          {/* Card backoffice */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '16px',
            padding: '32px 28px',
            textAlign: 'left',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: '180px', height: '180px',
              background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🖥️</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 10px' }}>
              Backoffice Admin
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 0 24px' }}>
              Dashboard, prodotti, ordini, fornitori, analisi, fatture e molto altro.
              Accedi con le credenziali demo.
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--primary)',
                color: '#fff',
                padding: '11px 22px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary)' }}
            >
              → Accedi al backoffice
            </Link>
          </div>

          {/* Card store */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '16px',
            padding: '32px 28px',
            textAlign: 'left',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: '180px', height: '180px',
              background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🛍️</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 10px' }}>
              Store pubblico
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 0 24px' }}>
              Catalogo prodotti pubblico, carrello e checkout.
              Vedi come appare ai tuoi clienti finali.
            </p>
            <a
              href="/store"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--success-500)',
                color: '#fff',
                padding: '11px 22px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--success-700)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--success-500)' }}
            >
              → Apri lo store
            </a>
          </div>
        </div>

        {/* Quick start */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '12px',
          padding: '24px 28px',
          textAlign: 'left',
        }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ⚡ Quick start — self-hosted
          </p>
          <pre style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: '8px',
            padding: '16px 20px',
            fontSize: '13px',
            color: 'var(--primary-300)',
            fontFamily: 'var(--font-mono, monospace)',
            overflowX: 'auto',
            lineHeight: '1.6',
            margin: 0,
          }}>
            {`git clone https://github.com/Gug-cyber/gestione-magazzino
cd gestione-magazzino
docker compose up --build`}
          </pre>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '12px 0 0' }}>
            Richiede Docker ≥ 24. L'app parte su <code style={{ color: 'var(--primary-300)' }}>localhost:3000</code> con database PostgreSQL incluso.
          </p>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
 * Sezione Pricing
 * -------------------------------------------------------------------------- */
const PLANS = [
  {
    name: 'Self-Hosted',
    emoji: '🏠',
    price: '0€',
    period: 'per sempre',
    desc: 'Scarica, installa e gestisci il tuo magazzino sul tuo server. Nessun costo, nessun limite artificiale.',
    highlight: false,
    cta: 'Scarica gratis',
    ctaHref: 'https://github.com/Gug-cyber/gestione-magazzino',
    ctaExternal: true,
    features: [
      { text: 'Tutte le funzionalità', ok: true },
      { text: 'Utenti illimitati', ok: true },
      { text: 'Prodotti illimitati', ok: true },
      { text: 'Store e-commerce integrato', ok: true },
      { text: 'Deploy Docker in 5 min', ok: true },
      { text: 'Supporto community GitHub', ok: true },
      { text: 'Supporto prioritario', ok: false },
      { text: 'Aggiornamenti automatici gestiti', ok: false },
    ],
  },
  {
    name: 'Pro',
    emoji: '⚡',
    price: '39€',
    period: '/mese',
    desc: 'Cloud gestito, zero manutenzione. Ideale per negozi, studi e PMI che non vogliono gestire server.',
    highlight: true,
    badge: 'Più scelto',
    cta: 'Inizia il trial gratuito',
    ctaHref: '/login',
    ctaExternal: false,
    features: [
      { text: 'Tutte le funzionalità', ok: true },
      { text: 'Fino a 10 utenti', ok: true },
      { text: 'Prodotti illimitati', ok: true },
      { text: 'Store e-commerce integrato', ok: true },
      { text: 'Backup automatici giornalieri', ok: true },
      { text: 'Supporto email prioritario', ok: true },
      { text: 'SSL e CDN inclusi', ok: true },
      { text: 'Multi-magazzino', ok: false },
    ],
  },
  {
    name: 'Business',
    emoji: '🏢',
    price: '129€',
    period: '/mese',
    desc: 'Per aziende con più sedi, team grandi e necessità di integrazioni avanzate o white-label.',
    highlight: false,
    cta: 'Contatta le vendite',
    ctaHref: 'mailto:info@gestione-magazzino.it',
    ctaExternal: true,
    features: [
      { text: 'Tutte le funzionalità Pro', ok: true },
      { text: 'Utenti illimitati', ok: true },
      { text: 'Multi-magazzino', ok: true },
      { text: 'API key per integrazioni', ok: true },
      { text: 'White-label (logo personalizzato)', ok: true },
      { text: 'Onboarding dedicato', ok: true },
      { text: 'SLA 99.9% uptime', ok: true },
      { text: 'Fattura elettronica SDI', ok: true },
    ],
  },
]

function PricingSection() {
  return (
    <section id="pricing" style={{
      padding: 'clamp(60px, 8vw, 100px) clamp(16px, 5vw, 48px)',
      background: 'var(--bg-secondary)',
    }}>
      <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 16px' }}>
            Prezzi semplici e trasparenti
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto', lineHeight: '1.6' }}>
            Self-hosted gratis per sempre. Cloud gestito a partire da 39€/mese.
            Nessun costo nascosto.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          alignItems: 'stretch',
        }}>
          {PLANS.map(plan => (
            <div
              key={plan.name}
              style={{
                background: plan.highlight ? 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, var(--bg-tertiary) 100%)' : 'var(--bg-tertiary)',
                border: plan.highlight ? '2px solid rgba(99,102,241,0.5)' : '1px solid var(--border-primary)',
                borderRadius: '16px',
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0',
                position: 'relative',
                boxShadow: plan.highlight ? '0 0 40px rgba(99,102,241,0.12)' : 'none',
              }}
            >
              {plan.badge && (
                <div style={{
                  position: 'absolute',
                  top: '-13px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--primary)',
                  color: '#fff',
                  padding: '4px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: '700',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ marginBottom: '4px', fontSize: '24px' }}>{plan.emoji}</div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px' }}>{plan.name}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 24px' }}>{plan.desc}</p>

              <div style={{ marginBottom: '28px' }}>
                <span style={{ fontSize: '2.4rem', fontWeight: '800', color: plan.highlight ? 'var(--primary-300)' : 'var(--text-primary)' }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', marginLeft: '4px' }}>{plan.period}</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: f.ok ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    <span style={{ color: f.ok ? 'var(--success)' : 'var(--danger)', flexShrink: 0, opacity: f.ok ? 1 : 0.5 }}>
                      <Icon name={f.ok ? 'check' : 'x'} />
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>

              {plan.ctaExternal ? (
                <a
                  href={plan.ctaHref}
                  target={plan.ctaHref.startsWith('http') ? '_blank' : undefined}
                  rel={plan.ctaHref.startsWith('http') ? 'noopener noreferrer' : undefined}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: plan.highlight ? 'var(--primary)' : 'transparent',
                    color: plan.highlight ? '#fff' : 'var(--text-primary)',
                    border: plan.highlight ? 'none' : '1px solid var(--border-secondary)',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '14px',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                >
                  {plan.cta}
                </a>
              ) : (
                <Link
                  to={plan.ctaHref}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: plan.highlight ? 'var(--primary)' : 'transparent',
                    color: plan.highlight ? '#fff' : 'var(--text-primary)',
                    border: plan.highlight ? 'none' : '1px solid var(--border-secondary)',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '14px',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: '24px' }}>
          I piani cloud includono 14 giorni di prova gratuita. Nessuna carta di credito richiesta.
        </p>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
 * Sezione Use Cases / Verticali
 * -------------------------------------------------------------------------- */
const USE_CASES = [
  { emoji: '🃏', title: 'Collezionisti TCG', desc: 'Magic, Pokémon, Yu-Gi-Oh. Prezzi in tempo reale da CardMarket ed eBay, gestione condizioni e lingue.' },
  { emoji: '🏪', title: 'Negozi retail', desc: 'Inventario, cassa virtuale, fatture italiane, fornitori, alert sottoscorta. Tutto in un unico gestionale.' },
  { emoji: '🛒', title: 'E-commerce piccoli', desc: 'Store integrato, checkout, gestione ordini e stock sincronizzato. Senza plugin, senza integrazioni costose.' },
  { emoji: '🔧', title: 'Officine e ricambisti', desc: 'Catalogo codici OEM, ubicazioni scaffale, fornitori multipli, barcode per trovare i pezzi in secondi.' },
  { emoji: '🍞', title: 'Artigiani e food', desc: 'Gestione materie prime, prodotti finiti, movimenti di carico/scarico e costi di produzione.' },
  { emoji: '📦', title: 'PMI e magazzini', desc: 'Multi-utente con ruoli, audit trail, analisi marginalità, tracking corrieri e notifiche Telegram.' },
]

function UseCasesSection() {
  return (
    <section style={{
      padding: 'clamp(60px, 8vw, 100px) clamp(16px, 5vw, 48px)',
      background: 'var(--bg-primary)',
    }}>
      <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 14px' }}>
            Adatto al tuo settore
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Un sistema flessibile per chi vende, compra o trasforma prodotti fisici.
          </p>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '16px',
        }}>
          {USE_CASES.map(uc => (
            <div
              key={uc.title}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '12px',
                padding: '22px 20px',
                transition: 'border-color 200ms ease, transform 200ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{uc.emoji}</div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px' }}>{uc.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>{uc.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
 * CTA finale
 * -------------------------------------------------------------------------- */
function CTASection() {
  return (
    <section style={{
      padding: 'clamp(60px, 8vw, 100px) clamp(16px, 5vw, 48px)',
      background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, var(--bg-secondary) 50%, rgba(99,102,241,0.05) 100%)',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 16px' }}>
          Inizia oggi, gratis
        </h2>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '36px' }}>
          Self-hosted in 5 minuti con Docker, oppure prova il cloud senza carta di credito.
          Il codice è tuo — sempre.
        </p>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--primary)',
              color: '#fff',
              padding: '14px 32px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '700',
              fontSize: '15px',
              boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-hover)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            🚀 Accedi / Registrati
          </Link>
          <a
            href="https://github.com/Gug-cyber/gestione-magazzino"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              padding: '14px 28px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '15px',
              border: '1px solid var(--border-secondary)',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-secondary)' }}
          >
            <Icon name="github" /> Vedi su GitHub
          </a>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
 * Navbar pubblica della landing
 * -------------------------------------------------------------------------- */
function LandingNavbar() {
  const { isAuthenticated } = useAuth()

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 200,
      background: 'rgba(10,10,15,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-primary)',
      padding: '0 clamp(16px, 4vw, 48px)',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Link to="/landing" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '22px' }}>📦</span>
        <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Gestione Magazzino
        </span>
      </Link>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <a
          href="#pricing"
          onClick={e => {
            e.preventDefault()
            document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
          }}
          style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', padding: '6px 12px', borderRadius: '6px', transition: 'color 150ms ease' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          Prezzi
        </a>
        <a
          href="https://github.com/Gug-cyber/gestione-magazzino"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', padding: '6px 12px', borderRadius: '6px', transition: 'color 150ms ease', display: 'flex', alignItems: 'center', gap: '6px' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <Icon name="github" /> GitHub
        </a>
        {isAuthenticated ? (
          <Link
            to="/dashboard"
            style={{
              background: 'var(--primary)',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary)' }}
          >
            Dashboard →
          </Link>
        ) : (
          <Link
            to="/login"
            style={{
              background: 'var(--primary)',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary)' }}
          >
            Accedi
          </Link>
        )}
      </nav>
    </header>
  )
}

/* --------------------------------------------------------------------------
 * Footer
 * -------------------------------------------------------------------------- */
function LandingFooter() {
  return (
    <footer style={{
      background: 'var(--bg-primary)',
      borderTop: '1px solid var(--border-primary)',
      padding: 'clamp(32px, 4vw, 48px) clamp(16px, 5vw, 48px)',
    }}>
      <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '32px',
          marginBottom: '40px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>📦</span>
              <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)' }}>Gestione Magazzino</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
              Software open-source per la gestione completa del magazzino. Licenza MIT.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Prodotto
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Funzionalità', href: '#features' },
                { label: 'Prezzi', href: '#pricing' },
                { label: 'Store demo', href: '/store' },
                { label: 'Accedi', href: '/login' },
              ].map(l => (
                <li key={l.label}>
                  <a href={l.href} style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 150ms ease' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Sviluppatori
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'GitHub', href: 'https://github.com/Gug-cyber/gestione-magazzino' },
                { label: 'Documentazione', href: 'https://github.com/Gug-cyber/gestione-magazzino#readme' },
                { label: 'Licenza MIT', href: 'https://github.com/Gug-cyber/gestione-magazzino/blob/main/README.md' },
              ].map(l => (
                <li key={l.label}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 150ms ease' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid var(--border-primary)',
          paddingTop: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            © {new Date().getFullYear()} Gestione Magazzino. Rilasciato sotto licenza MIT.
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="https://github.com/Gug-cyber/gestione-magazzino" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '12px', transition: 'color 150ms ease' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              Open Source ♥
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* --------------------------------------------------------------------------
 * Pagina principale
 * -------------------------------------------------------------------------- */
export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans, Inter, sans-serif)',
    }}>
      <LandingNavbar />
      <HeroSection />
      <div id="features">
        <FeaturesSection />
      </div>
      <DemoSection />
      <UseCasesSection />
      <PricingSection />
      <CTASection />
      <LandingFooter />
    </div>
  )
}
