/**
 * Analytics tracking utility for the store frontend.
 * All tracking calls are non-blocking (fire-and-forget).
 */

const API_BASE = import.meta.env.VITE_API_URL || ''
const ANALYTICS_ENDPOINT = `${API_BASE}/api/analytics/event`
const STORAGE_KEY = 'utm_attribution'

// ---------------------------------------------------------------------------
// UTM / Source detection
// ---------------------------------------------------------------------------

const REFERRER_SOURCE_MAP = [
  [/instagram\.com/i, 'instagram'],
  [/facebook\.com|fb\.com/i, 'facebook'],
  [/tiktok\.com/i, 'tiktok'],
  [/google\./i, 'google'],
  [/bing\.com/i, 'bing'],
  [/yahoo\.com/i, 'yahoo'],
]

function detectSourceFromReferrer(referrer) {
  if (!referrer) return 'direct'
  for (const [pattern, source] of REFERRER_SOURCE_MAP) {
    if (pattern.test(referrer)) return source
  }
  return 'other'
}

function getAttribution() {
  const params = new URLSearchParams(window.location.search)
  const utmSource = params.get('utm_source')
  const utmMedium = params.get('utm_medium') || ''
  const utmCampaign = params.get('utm_campaign') || ''
  const referrer = document.referrer || ''

  let source = 'direct'
  if (utmSource) {
    source = utmSource.toLowerCase()
  } else if (referrer) {
    source = detectSourceFromReferrer(referrer)
  }

  return { source, medium: utmMedium, campaign: utmCampaign, referrer }
}

function getOrCreateAttribution() {
  // If UTM params are present, always refresh
  const params = new URLSearchParams(window.location.search)
  if (params.get('utm_source')) {
    const attribution = getAttribution()
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
    } catch (_) {}
    return attribution
  }

  // Otherwise read from sessionStorage (same session, same source)
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (_) {}

  const attribution = getAttribution()
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution))
  } catch (_) {}
  return attribution
}

function getOrCreateSessionId() {
  const key = 'analytics_session_id'
  try {
    let sid = sessionStorage.getItem(key)
    if (!sid) {
      sid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`
      sessionStorage.setItem(key, sid)
    }
    return sid
  } catch (_) {
    return `${Date.now()}-anon`
  }
}

function getDevice() {
  return window.innerWidth <= 768 ? 'mobile' : 'desktop'
}

// ---------------------------------------------------------------------------
// Core send function (fire-and-forget)
// ---------------------------------------------------------------------------

function sendEvent(payload) {
  try {
    const body = JSON.stringify(payload)
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(ANALYTICS_ENDPOINT, blob)
    } else {
      fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Public tracking functions
// ---------------------------------------------------------------------------

export function trackPageView(page) {
  try {
    const attribution = getOrCreateAttribution()
    sendEvent({
      event_type: 'page_view',
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign,
      referrer: attribution.referrer,
      device: getDevice(),
      session_id: getOrCreateSessionId(),
      page: page || window.location.pathname,
    })
  } catch (_) {}
}

export function trackAddToCart(productId, productName) {
  try {
    const attribution = getOrCreateAttribution()
    sendEvent({
      event_type: 'add_to_cart',
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign,
      device: getDevice(),
      session_id: getOrCreateSessionId(),
      page: window.location.pathname,
      products: [{ id: String(productId), name: productName }],
    })
  } catch (_) {}
}

export function trackCheckoutStart() {
  try {
    const attribution = getOrCreateAttribution()
    sendEvent({
      event_type: 'checkout_start',
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign,
      device: getDevice(),
      session_id: getOrCreateSessionId(),
      page: window.location.pathname,
    })
  } catch (_) {}
}

export function trackPurchase(orderId, orderTotal, products) {
  try {
    const attribution = getOrCreateAttribution()
    sendEvent({
      event_type: 'purchase',
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign,
      device: getDevice(),
      session_id: getOrCreateSessionId(),
      order_id: String(orderId),
      order_total: Number(orderTotal) || 0,
      products: Array.isArray(products) ? products : [],
    })
  } catch (_) {}
}
