import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props { lessonId: string }

const spring = { type: 'spring', stiffness: 400, damping: 28 }

export default function ArrayVisualizer({ lessonId }: Props) {
  const init = lessonId === 'l1-3'
    ? ['[0][0]', '[0][1]', '[0][2]', '[1][0]', '[1][1]', '[1][2]']
    : [10, 20, 30, 40, 50].map(String)

  const [cells, setCells] = useState<string[]>(init)
  const [input, setInput] = useState('')
  const [insertIdx, setInsertIdx] = useState(0)
  const [highlighted, setHighlighted] = useState<number | null>(null)

  const flash = (i: number) => {
    setHighlighted(i)
    setTimeout(() => setHighlighted(null), 700)
  }

  const insert = () => {
    const val = input.trim() || '?'
    const next = [...cells]
    next.splice(insertIdx, 0, val)
    setCells(next)
    setInput('')
    flash(insertIdx)
  }

  const remove = () => {
    if (cells.length === 0) return
    const next = [...cells]
    next.splice(insertIdx, 1)
    setCells(next)
    setInsertIdx(Math.min(insertIdx, next.length - 1))
  }

  const reset = () => {
    setCells(init)
    setInsertIdx(0)
    setInput('')
  }

  return (
    <div className="viz-array-root">
      <div className="viz-cells-row">
        <AnimatePresence>
          {cells.map((val, i) => (
            <motion.div
              key={`${val}-${i}`}
              className={`viz-cell ${highlighted === i ? 'viz-cell-flash viz-cell-highlighted' : ''}`}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1, background: highlighted === i ? 'rgba(0,212,170,0.25)' : 'rgba(20,28,61,0.9)' }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={spring}
            >
              <span className="viz-cell-val">{val}</span>
              <span className="viz-cell-idx">{i}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {cells.length === 0 && (
          <span className="viz-empty-label">Array is empty</span>
        )}
      </div>

      <div className="viz-controls">
        <input
          className="viz-input"
          placeholder="Value"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && insert()}
          maxLength={6}
        />
        <select
          className="viz-select"
          value={insertIdx}
          onChange={e => setInsertIdx(Number(e.target.value))}
        >
          {Array.from({ length: cells.length + 1 }, (_, i) => (
            <option key={i} value={i}>at index {i}</option>
          ))}
        </select>
        <button className="viz-btn" onClick={insert}>Insert</button>
        <button className="viz-btn ghost" onClick={remove} disabled={cells.length === 0}>Remove</button>
        <button className="viz-btn ghost" onClick={reset}>Reset</button>
      </div>

      <div className="viz-legend">
        <span className="viz-legend-item"><span className="viz-legend-dot accent" />Value</span>
        <span className="viz-legend-item"><span className="viz-legend-dot muted" />Index</span>
        <span className="viz-legend-item">Size: {cells.length}</span>
      </div>
    </div>
  )
}


