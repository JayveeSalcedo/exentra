import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import type { VisualizerType } from '../../lessons/types'

interface Props { type: VisualizerType; lessonId: string }

const INITIAL = [64, 34, 25, 12, 22, 11, 90]

export default function SortVisualizer({ type }: Props) {
  const [arr, setArr]         = useState([...INITIAL])
  const [comparing, setComp]  = useState<[number, number] | null>(null)
  const [sorted, setSorted]   = useState<number[]>([])
  const [running, setRunning] = useState(false)
  const [lo, setLo]           = useState<number | null>(null)
  const [hi, setHi]           = useState<number | null>(null)
  const [mid, setMid]         = useState<number | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  const reset = () => { clearTimers(); setArr([...INITIAL]); setComp(null); setSorted([]); setRunning(false); setLo(null); setHi(null); setMid(null) }

  const schedule = (fn: () => void, delay: number) => {
    const t = setTimeout(fn, delay)
    timers.current.push(t)
    return delay
  }

  const runBubble = () => {
    clearTimers()
    setRunning(true)
    const a = [...INITIAL]
    let delay = 0
    const done: number[] = []

    for (let i = 0; i < a.length - 1; i++) {
      for (let j = 0; j < a.length - i - 1; j++) {
        const ci = j, cj = j + 1
        delay += schedule(() => setComp([ci, cj]), delay) * 0 + 300
        if (a[j] > a[j + 1]) {
          ;[a[j], a[j + 1]] = [a[j + 1], a[j]];
          ((snap, d) => { schedule(() => setArr([...snap]), d) })(a, delay)
          delay += 200
        }
      }
      done.unshift(a.length - 1 - i)
      ;((d, snap) => { schedule(() => setSorted([...snap]), d) })(delay, [...done])
    }
    schedule(() => { setComp(null); setRunning(false); setSorted(a.map((_, i) => i)) }, delay + 200)
  }

  const runMerge = () => {
    clearTimers()
    setRunning(true)
    const a = [...INITIAL]
    let delay = 0
    const steps: number[][] = []

    const merge = (arr: number[], l: number, m: number, r: number) => {
      const L = arr.slice(l, m + 1), R = arr.slice(m + 1, r + 1)
      let i = 0, j = 0, k = l
      while (i < L.length && j < R.length) {
        arr[k++] = L[i] <= R[j] ? L[i++] : R[j++]
        steps.push([...arr])
      }
      while (i < L.length) { arr[k++] = L[i++]; steps.push([...arr]) }
      while (j < R.length) { arr[k++] = R[j++]; steps.push([...arr]) }
    }
    const ms = (arr: number[], l: number, r: number) => {
      if (l >= r) return
      const m = Math.floor((l + r) / 2)
      ms(arr, l, m); ms(arr, m + 1, r); merge(arr, l, m, r)
    }
    ms(a, 0, a.length - 1)

    steps.forEach((snap, i) => {
      schedule(() => setArr([...snap]), delay)
      delay += 220
    })
    schedule(() => { setRunning(false); setSorted(a.map((_, i) => i)) }, delay + 200)
  }

  const runBinarySearch = () => {
    clearTimers()
    setRunning(true)
    const sorted_ = [...INITIAL].sort((a, b) => a - b)
    setArr(sorted_)
    const target = 25
    let l = 0, r = sorted_.length - 1
    let delay = 200

    while (l <= r) {
      const m_ = Math.floor((l + r) / 2)
      ;((ll, rr, mm, d) => {
        schedule(() => { setLo(ll); setHi(rr); setMid(mm) }, d)
      })(l, r, m_, delay)
      delay += 600
      if (sorted_[m_] === target) { break }
      else if (sorted_[m_] < target) l = m_ + 1
      else r = m_ - 1
    }
    schedule(() => { setRunning(false); setComp(null) }, delay + 400)
  }

  const run = () => {
    if (type === 'bubble-sort') runBubble()
    else if (type === 'merge-sort') runMerge()
    else runBinarySearch()
  }

  const maxVal = Math.max(...arr, 1)
  const isBSearch = type === 'binary-search'

  return (
    <div className="viz-sort-root">
      <div className="viz-sort-bars">
        {arr.map((val, i) => {
          const isComp   = comparing && (i === comparing[0] || i === comparing[1])
          const isSorted = sorted.includes(i)
          const isMid_   = isBSearch && i === mid
          const isLo_    = isBSearch && i === lo
          const isHi_    = isBSearch && i === hi

          let barColor = 'rgba(124,92,191,0.6)'
          if (isMid_)   barColor = '#00D4AA'
          else if (isComp)   barColor = '#F59E0B'
          else if (isSorted) barColor = 'rgba(0,212,170,0.5)'
          else if (isLo_ || isHi_) barColor = 'rgba(124,92,191,0.9)'

          return (
            <div key={i} className="viz-sort-bar-col">
              <motion.div
                className="viz-sort-bar"
                animate={{ height: `${(val / maxVal) * 140}px`, background: barColor }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              />
              <span className="viz-sort-label">{val}</span>
              {isBSearch && i === lo  && <span className="viz-sort-pointer">L</span>}
              {isBSearch && i === hi  && <span className="viz-sort-pointer">R</span>}
              {isBSearch && i === mid && <span className="viz-sort-pointer accent">M</span>}
            </div>
          )
        })}
      </div>

      <div className="viz-controls" style={{ marginTop: '0.75rem' }}>
        <button className="viz-btn" onClick={run} disabled={running}>
          {type === 'bubble-sort' ? 'Run Bubble Sort' : type === 'merge-sort' ? 'Run Merge Sort' : 'Search 25'}
        </button>
        <button className="viz-btn ghost" onClick={reset}>Reset</button>
      </div>

      <div className="viz-legend">
        {!isBSearch && <span className="viz-legend-item"><span className="viz-legend-dot warn" />Comparing</span>}
        {!isBSearch && <span className="viz-legend-item"><span className="viz-legend-dot accent" />Sorted</span>}
        {isBSearch  && <span className="viz-legend-item"><span className="viz-legend-dot accent" />Mid (target: 25)</span>}
        {isBSearch  && <span className="viz-legend-item"><span className="viz-legend-dot purple" />L / R bounds</span>}
      </div>
    </div>
  )
}
