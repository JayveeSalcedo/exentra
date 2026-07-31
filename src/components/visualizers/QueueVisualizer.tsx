import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { VisualizerType } from '../../lessons/types'

interface Props { type: VisualizerType; lessonId: string }

const spring = { type: 'spring', stiffness: 360, damping: 28 }

export default function QueueVisualizer({ type }: Props) {
  const [queue, setQueue] = useState<string[]>(['10', '20', '30'])
  const [input, setInput] = useState('')
  const [dequeued, setDequeued] = useState<string | null>(null)
  const [flashFront, setFlashFront] = useState(false)

  const flash = () => { setFlashFront(true); setTimeout(() => setFlashFront(false), 600) }

  const enqueue = () => {
    const val = input.trim() || '?'
    setQueue(prev => [...prev, val])
    setInput('')
  }

  const dequeue = () => {
    if (!queue.length) return
    const front = queue[0]
    setDequeued(front)
    setQueue(prev => prev.slice(1))
    setTimeout(() => setDequeued(null), 1200)
  }

  const peek = () => flash()

  const isCircular  = type === 'circular-queue'
  const isPriority  = type === 'priority-queue'

  // For priority queue, display in sorted order visually
  const displayQueue = isPriority
    ? [...queue].sort((a, b) => Number(a) - Number(b))
    : queue

  return (
    <div className="viz-queue-root">
      <AnimatePresence>
        {dequeued && (
          <motion.div
            className="viz-stack-popped"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            Dequeued: <strong>{dequeued}</strong>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Labels */}
      <div className="viz-queue-labels">
        <span className="viz-queue-label-front">FRONT ←</span>
        <span className="viz-queue-label-rear">→ REAR</span>
      </div>

      <div className="viz-queue-track">
        {isCircular && (
          <div className="viz-queue-circular-ring">
            <span>↻ circular</span>
          </div>
        )}

        <div className="viz-queue-row">
          <AnimatePresence>
            {displayQueue.map((val, i) => {
              const isFront = i === 0
              const isRear  = i === displayQueue.length - 1
              return (
                <motion.div
                  key={`${val}-${i}`}
                  layout
                  className={`viz-queue-cell ${isFront ? 'is-front' : ''} ${isRear && !isFront ? 'is-rear' : ''} ${isFront && flashFront ? 'viz-cell-flash' : ''}`}
                  initial={{ opacity: 0, y: -16 }}
                  animate={{
                    opacity: 1, y: 0,
                    background: isFront
                      ? 'rgba(0,212,170,0.18)'
                      : isRear
                        ? 'rgba(124,92,191,0.18)'
                        : 'rgba(20,28,61,0.9)',
                    borderColor: isFront
                      ? 'rgba(0,212,170,0.6)'
                      : isRear
                        ? 'rgba(124,92,191,0.5)'
                        : 'rgba(124,92,191,0.3)',
                  }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={spring}
                >
                  <span className="viz-queue-val">{val}</span>
                  {isFront && <span className="viz-queue-badge front">F</span>}
                  {isRear && !isFront && <span className="viz-queue-badge rear">R</span>}
                  {isPriority && isFront && <span className="viz-queue-badge priority">min</span>}
                </motion.div>
              )
            })}
          </AnimatePresence>
          {queue.length === 0 && (
            <div className="viz-empty-label" style={{ padding: '1rem 2rem' }}>Queue is empty</div>
          )}
        </div>
      </div>

      <div className="viz-controls" style={{ marginTop: '1rem' }}>
        <input
          className="viz-input"
          placeholder="Value"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && enqueue()}
          maxLength={6}
        />
        <button className="viz-btn" onClick={enqueue}>Enqueue</button>
        <button className="viz-btn ghost" onClick={dequeue} disabled={!queue.length}>Dequeue</button>
        <button className="viz-btn ghost" onClick={peek} disabled={!queue.length}>Peek Front</button>
      </div>

      <div className="viz-legend">
        <span className="viz-legend-item"><span className="viz-legend-dot accent" />Front</span>
        <span className="viz-legend-item"><span className="viz-legend-dot purple" />Rear</span>
        <span className="viz-legend-item">{isPriority ? 'Min-Heap' : isCircular ? 'Circular' : 'FIFO'}</span>
        <span className="viz-legend-item">Size: {queue.length}</span>
      </div>
    </div>
  )
}


