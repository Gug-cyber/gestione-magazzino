import { useState, useEffect } from 'react'

const STORAGE_KEY_URL = 'gm_logo_url'
const STORAGE_KEY_TITLE = 'gm_portal_title'

const DEFAULT_TITLE = '🏭 Gestione Magazzino'

/**
 * Hook per leggere/scrivere le impostazioni del logo e del titolo del portale.
 * I valori vengono persistiti in localStorage.
 *
 * Returns:
 *   logoUrl       - data URL dell'immagine logo (stringa o null)
 *   portalTitle   - titolo testuale del portale
 *   setLogo       - (dataUrl: string | null) => void
 *   setPortalTitle - (title: string) => void
 *   resetToDefault - ripristina i valori predefiniti
 */
function useLogoSettings() {
  const [logoUrl, setLogoUrl] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY_URL) || null } catch { return null }
  })
  const [portalTitle, setPortalTitleState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY_TITLE) || DEFAULT_TITLE } catch { return DEFAULT_TITLE }
  })

  const setLogo = (dataUrl) => {
    try {
      if (dataUrl) {
        localStorage.setItem(STORAGE_KEY_URL, dataUrl)
      } else {
        localStorage.removeItem(STORAGE_KEY_URL)
      }
    } catch { /* private browsing – ignore */ }
    setLogoUrl(dataUrl)
    // notify other Navbar instances (same tab)
    window.dispatchEvent(new Event('gm_logo_changed'))
  }

  const setPortalTitle = (title) => {
    const val = title || DEFAULT_TITLE
    try {
      localStorage.setItem(STORAGE_KEY_TITLE, val)
    } catch { /* ignore */ }
    setPortalTitleState(val)
    window.dispatchEvent(new Event('gm_logo_changed'))
  }

  const resetToDefault = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_URL)
      localStorage.removeItem(STORAGE_KEY_TITLE)
    } catch { /* ignore */ }
    setLogoUrl(null)
    setPortalTitleState(DEFAULT_TITLE)
    window.dispatchEvent(new Event('gm_logo_changed'))
  }

  // Re-sync if another component fires the event (same tab)
  useEffect(() => {
    const sync = () => {
      try {
        setLogoUrl(localStorage.getItem(STORAGE_KEY_URL) || null)
        setPortalTitleState(localStorage.getItem(STORAGE_KEY_TITLE) || DEFAULT_TITLE)
      } catch { /* ignore */ }
    }
    window.addEventListener('gm_logo_changed', sync)
    return () => window.removeEventListener('gm_logo_changed', sync)
  }, [])

  return { logoUrl, portalTitle, setLogo, setPortalTitle, resetToDefault, DEFAULT_TITLE }
}

export default useLogoSettings
