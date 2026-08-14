import { useEffect, useState } from 'react'

/**
 * Tracks whether the viewport is at or below the given breakpoint.
 * Used to switch the sidebar into an off-canvas hamburger drawer on mobile.
 */
export default function useIsMobile(breakpoint = 900): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint
  )

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches)
    handler(mql)
    mql.addEventListener('change', handler as (e: MediaQueryListEvent) => void)
    return () => mql.removeEventListener('change', handler as (e: MediaQueryListEvent) => void)
  }, [breakpoint])

  return isMobile
}
