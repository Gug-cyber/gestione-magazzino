import AlertCard from './AlertCard'
import { useIsMobile } from '../../hooks/useIsMobile'
import {
  lowStockProducts,
  stagnantProducts,
  lowMarginProducts,
  productsWithMissingPricing,
  pendingOrders,
  unpaidInvoices,
} from '../../utils/alertHelpers'
import {
  mockProducts,
  mockOrders,
  mockInvoices,
} from '../../mock/alertsMockData'

// SVG icons inline
const IconBox = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
)

const IconTrendingDown = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
    <polyline points="17,18 23,18 23,12" />
  </svg>
)

const IconTagX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
)

const IconCartClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61H19" />
    <circle cx="19" cy="11" r="4" />
    <polyline points="19,9 19,11 20,12" />
  </svg>
)

const IconFileAlert = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="12" y1="12" x2="12" y2="16" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
)

const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const IconCheck = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22,4 12,14.01 9,11.01" />
  </svg>
)

/**
 * Sezione Alert Intelligenti della Dashboard.
 * Usa i dati reali se disponibili, altrimenti fallback ai mock.
 */
export default function DashboardAlerts({ products, orders, invoices }) {
  const isMobile = useIsMobile()

  const effectiveProducts = products?.length ? products : mockProducts
  const effectiveOrders = orders?.length ? orders : mockOrders
  const effectiveInvoices = invoices?.length ? invoices : mockInvoices

  const alerts = [
    {
      key: 'lowStock',
      title: 'Prodotti sotto scorta minima',
      count: lowStockProducts(effectiveProducts).length,
      variant: 'danger',
      icon: <IconBox />,
      linkTo: '/prodotti?alert=sotto_scorta',
      description: 'Quantità ≤ scorta minima',
    },
    {
      key: 'stagnant30',
      title: 'Prodotti fermi da +30 giorni',
      count: stagnantProducts(effectiveProducts, 30).length,
      variant: 'warning',
      icon: <IconClock />,
      linkTo: '/prodotti?alert=fermi_30',
      description: 'Nessun movimento recente',
    },
    {
      key: 'stagnant60',
      title: 'Prodotti fermi da +60 giorni',
      count: stagnantProducts(effectiveProducts, 60).length,
      variant: 'danger',
      icon: <IconClock />,
      linkTo: '/prodotti?alert=fermi_60',
      description: 'Valuta una promozione',
    },
    {
      key: 'lowMargin',
      title: 'Prodotti con margine basso (<15%)',
      count: lowMarginProducts(effectiveProducts, 15).length,
      variant: 'warning',
      icon: <IconTrendingDown />,
      linkTo: '/prodotti?alert=margine_basso',
      description: 'Margine < 15%',
    },
    {
      key: 'missingPrice',
      title: 'Prodotti senza prezzo',
      count: productsWithMissingPricing(effectiveProducts).length,
      variant: 'info',
      icon: <IconTagX />,
      linkTo: '/prodotti?alert=senza_prezzo',
      description: 'Prezzo acquisto o vendita mancante',
    },
    {
      key: 'pendingOrders',
      title: 'Ordini da completare',
      count: pendingOrders(effectiveOrders).length,
      variant: 'warning',
      icon: <IconCartClock />,
      linkTo: '/ordini?alert=da_completare',
      description: 'Stato: confermato o spedito',
    },
    {
      key: 'unpaidInvoices',
      title: 'Fatture da pagare',
      count: unpaidInvoices(effectiveInvoices).length,
      variant: 'danger',
      icon: <IconFileAlert />,
      linkTo: '/fatture?alert=da_pagare',
      description: 'Attenzione alla liquidità',
    },
  ]

  const totalAlerts = alerts.reduce((sum, a) => sum + a.count, 0)
  const allClear = totalAlerts === 0

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        <div style={{ color: totalAlerts > 0 ? '#fbbf24' : '#4ade80' }}>
          <IconBell />
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '700',
            color: 'var(--color-text)',
          }}
        >
          Alert Intelligenti
        </h2>
        {totalAlerts > 0 && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: '700',
              padding: '3px 10px',
              borderRadius: '999px',
              backgroundColor: 'var(--color-danger-bg)',
              color: '#f87171',
              border: '1px solid var(--color-danger-border)',
            }}
          >
            {totalAlerts} attivi
          </span>
        )}
      </div>

      {allClear ? (
        /* Empty state */
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '12px',
            border: '1px solid var(--color-success-border)',
            padding: '32px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ color: '#4ade80', opacity: 0.9 }}>
            <IconCheck />
          </div>
          <div style={{ fontWeight: '600', color: '#4ade80', fontSize: '15px' }}>
            Tutto in ordine! Nessun alert attivo.
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Magazzino sotto controllo — nessuna azione richiesta.
          </div>
        </div>
      ) : (
        /* Alert grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {alerts.filter(a => a.count > 0).map((alert) => (
            <AlertCard
              key={alert.key}
              title={alert.title}
              count={alert.count}
              variant={alert.variant}
              icon={alert.icon}
              linkTo={alert.linkTo}
              description={alert.description}
            />
          ))}
        </div>
      )}
    </div>
  )
}
