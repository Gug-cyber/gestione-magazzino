import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { controlPanelAPI } from '../api/controlPanel'

export const FeatureFlagsContext = createContext(null)

export function FeatureFlagsProvider({ children }) {
  const { user } = useAuth()
  const [flags, setFlags] = useState({})
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await controlPanelAPI.getFlags()
      setFlags(res.data)
    } catch {
      // fail open: mantieni flags vuoti (tutti = true per default)
      setFlags({})
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      refresh()
    } else {
      setFlags({})
    }
  }, [user, refresh])

  function isFeatureEnabled(key, defaultValue = true) {
    if (!flags || !(key in flags)) return defaultValue
    return flags[key]
  }

  return (
    <FeatureFlagsContext.Provider value={{ flags, isFeatureEnabled, loading, refresh }}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagsContext)
  if (!ctx) throw new Error('useFeatureFlags must be used within FeatureFlagsProvider')
  return ctx
}

export function isFeatureEnabled(flags, key, defaultValue = true) {
  if (!flags || !(key in flags)) return defaultValue
  return flags[key]
}
