import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props { lessonId: string }

const spring = { type: 'spring', stiffness: 380, damping: 28 }

export default function StackVisualizer({ }: Props) {
  const [stack, setStack] = useState<string[]>(['10', '20', '30'])
  const [input, setInput] = useState('')
  const [flashTop, setFlashTop] = useState(false)
  const [popped, setPopped] = useState<string | null>(null)

  const flash = () => { setFlashTop(true); setTimeout(() => setFlashTop(false), 600) }

  const push = () => {
    const val = input.trim() || '?'
    setStack(prev => [...prev, val])
    setInput('')
    flash()
  }

  const pop = () => {
    if (!stack.length) return
    const top = stack[stack.length - 1]
    setPopped(top)
    setStack(prev => prev.slice(0, -1))
    setTimeout(() => setPopped(null), 1200)
  }

  const peek = () => {
    if (!stack.length) return
    flash()
  }

  return (
    <div className="viz-stack-root">
      {/* Popped toast */}
      <AnimatePresence>
        {popped && (
          <motion.div
            className="viz-stack-popped"
            initial={{ opacity: 0, y: -10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            Popped: <strong>{popped}</strong>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="viz-stack-col">
        {/* Open top indicator */}
        <div className="viz-stack-top-label">← TOP</div>

        <div className="viz-stack-frame">
          <AnimatePresence>
            {[...stack].reverse().map((val, i) => {
              const isTop = i === 0
              return (
                <motion.div
                  key={`${val}-${stack.length - i}`}
                  layout
                  className={`viz-stack-cell ${isTop ? 'is-top' : ''} ${isTop && flashTop ? 'viz-cell-flash' : ''}`}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    background: isTop
                      ? 'rgba(0,212,170,0.18)'
                      : 'rgba(20,28,61,0.9)',
                    borderColor: isTop
                      ? 'rgba(0,212,170,0.6)'
                      : 'rgba(124,92,191,0.3)',
                  }}
                  exit={{ opacity: 0, x: 40, scale: 0.7 }}
                  transition={spring}
                >
                  <span className="viz-stack-val">{val}</span>
                  {isTop && <span className="viz-stack-badge">top</span>}
                </motion.div>
              )
            })}
          </AnimatePresence>

          {stack.length === 0 && (
            <div className="viz-empty-label" style={{ padding: '1.5rem' }}>Stack is empty</div>
          )}
        </div>

        {/* Closed bottom */}
        <div className="viz-stack-base" />
      </div>

      <div className="viz-controls" style={{ marginTop: '1rem' }}>
        <input
          className="viz-input"
          placeholder="Value"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && push()}
          maxLength={6}
        />
        <button className="viz-btn" onClick={push}>Push</button>
        <button className="viz-btn ghost" onClick={pop} disabled={!stack.length}>Pop</button>
        <button className="viz-btn ghost" onClick={peek} disabled={!stack.length}>Peek</button>
      </div>

      <div className="viz-legend">
        <span className="viz-legend-item"><span className="viz-legend-dot accent" />Top</span>
        <span className="viz-legend-item">LIFO</span>
        <span className="viz-legend-item">Size: {stack.length}</span>
      </div>
    </div>
  )
}


