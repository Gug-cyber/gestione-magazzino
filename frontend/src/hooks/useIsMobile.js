import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < breakpoint)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])
  return isMobile
}

export function useBreakpoint() {
  const getBreakpoint = () => {
    if (typeof window === 'undefined') return { isMobile: false, isTablet: false, isDesktop: true, width: 1200 }
    const w = window.innerWidth
    return {
      isMobile: w < 768,
      isTablet: w >= 768 && w < 1024,
      isDesktop: w >= 1024,
      width: w,
    }
  }
  const [bp, setBp] = useState(getBreakpoint)
  useEffect(() => {
    const handler = () => setBp(getBreakpoint())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return bp
}
