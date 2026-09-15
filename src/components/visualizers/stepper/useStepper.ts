import { useCallback, useEffect, useState } from 'react'

export interface Stepper<T> {
  steps: T[]
  index: number
  step: T | undefined
  playing: boolean
  speed: number
  atStart: boolean
  atEnd: boolean
  /** Replace the steps (e.g. after running a new operation) and start from step 0 */
  load: (steps: T[], autoplay?: boolean) => void
  next: () => void
  prev: () => void
  reset: () => void
  toggle: () => void
  setSpeed: (ms: number) => void
  goTo: (i: number) => void
}

/** Play back a precomputed list of algorithm steps */
export function useStepper<T>(initial: T[] = [], defaultSpeed = 900): Stepper<T> {
  const [state, setState] = useState({ steps: initial, index: 0, playing: false })
  const [speed, setSpeed] = useState(defaultSpeed)
  const { steps, index, playing } = state
  const lastIndex = Math.max(steps.length - 1, 0)

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      setState(s => {
        const end = Math.max(s.steps.length - 1, 0)
        return s.index >= end ? { ...s, playing: false } : { ...s, index: s.index + 1 }
      })
    }, speed)
    return () => clearInterval(timer)
  }, [playing, speed])

  const load = useCallback((next: T[], autoplay = true) => {
    setState({ steps: next, index: 0, playing: autoplay && next.length > 1 })
  }, [])

  return {
    steps,
    index,
    step: steps[index],
    playing,
    speed,
    atStart: index === 0,
    atEnd: index >= lastIndex,
    load,
    next: () => setState(s => ({ ...s, playing: false, index: Math.min(s.index + 1, Math.max(s.steps.length - 1, 0)) })),
    prev: () => setState(s => ({ ...s, playing: false, index: Math.max(s.index - 1, 0) })),
    reset: () => setState(s => ({ ...s, playing: false, index: 0 })),
    toggle: () => setState(s => {
      const end = Math.max(s.steps.length - 1, 0)
      if (s.playing) return { ...s, playing: false }
      // Replay from the start when already at the last step
      return { ...s, playing: s.steps.length > 1, index: s.index >= end ? 0 : s.index }
    }),
    setSpeed,
    goTo: (i: number) => setState(s => ({ ...s, playing: false, index: Math.max(0, Math.min(i, s.steps.length - 1)) })),
  }
}
