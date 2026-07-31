import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props { lessonId: string }

const TABLE_SIZE = 7

const hash = (key: string) => {
  let h = 0
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) % TABLE_SIZE
  return h
}

export default function HashVisualizer({ }: Props) {
  const [table, setTable] = useState<string[][]>(Array.from({ length: TABLE_SIZE }, () => []))
  const [input, setInput] = useState('')
  const [lastHash, setLastHash] = useState<number | null>(null)
  const [flashBucket, setFlashBucket] = useState<number | null>(null)

  const insert = () => {
    const val = input.trim()
    if (!val) return
    const h = hash(val)
    setLastHash(h)
    setFlashBucket(h)
    setTimeout(() => setFlashBucket(null), 800)
    setTable(prev => {
      const next = prev.map(row => [...row])
      if (!next[h].includes(val)) next[h] = [...next[h], val]
      return next
    })
    setInput('')
  }

  const remove = (bucket: number, val: string) => {
    setTable(prev => {
      const next = prev.map(row => [...row])
      next[bucket] = next[bucket].filter(v => v !== val)
      return next
    })
  }

  const reset = () => {
    setTable(Array.from({ length: TABLE_SIZE }, () => []))
    setLastHash(null)
  }

  return (
    <div className="viz-hash-root">
      {lastHash !== null && (
        <motion.div
          className="viz-hash-formula"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          hash("{input || '…'}") → bucket <strong>{lastHash}</strong>
        </motion.div>
      )}

      <div className="viz-hash-table">
        {table.map((bucket, i) => (
          <motion.div
            key={i}
            className={`viz-hash-row ${flashBucket === i ? 'viz-hash-flash' : ''}`}
            animate={{}}
          >
            <span className="viz-hash-index">{i}</span>
            <div className="viz-hash-bucket">
              <AnimatePresence>
                {bucket.map((val, j) => (
                  <motion.span
                    key={val}
                    className="viz-hash-item"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    onClick={() => remove(i, val)}
                    title="Click to remove"
                  >
                    {val}
                    {j < bucket.length - 1 && (
                      <span className="viz-hash-arrow"> →</span>
                    )}
                  </motion.span>
                ))}
              </AnimatePresence>
              {bucket.length === 0 && (
                <span className="viz-hash-empty">∅</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="viz-controls">
        <input
          className="viz-input"
          placeholder="Key (string or number)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && insert()}
          maxLength={10}
        />
        <button className="viz-btn" onClick={insert}>Insert</button>
        <button className="viz-btn ghost" onClick={reset}>Reset</button>
      </div>

      <div className="viz-legend">
        <span className="viz-legend-item">Table size: {TABLE_SIZE} (prime)</span>
        <span className="viz-legend-item">Separate chaining</span>
        <span className="viz-legend-item">Click item to remove</span>
      </div>
    </div>
  )
}

