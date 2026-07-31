import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { VisualizerType } from '../../lessons/types'

interface Props { type: VisualizerType; lessonId: string }

interface LLNode { id: number; val: string }

let nextId = 100

export default function LinkedListVisualizer({ type }: Props) {
  const [nodes, setNodes] = useState<LLNode[]>([
    { id: 1, val: '10' }, { id: 2, val: '20' }, { id: 3, val: '30' },
  ])
  const [input, setInput] = useState('')
  const [highlight, setHighlight] = useState<number | null>(null)

  const flash = (id: number) => { setHighlight(id); setTimeout(() => setHighlight(null), 700) }

  const prepend = () => {
    const node: LLNode = { id: ++nextId, val: input.trim() || '?' }
    setNodes(prev => [node, ...prev])
    flash(node.id)
    setInput('')
  }

  const append = () => {
    const node: LLNode = { id: ++nextId, val: input.trim() || '?' }
    setNodes(prev => [...prev, node])
    flash(node.id)
    setInput('')
  }

  const removeHead = () => setNodes(prev => prev.slice(1))
  const removeTail = () => setNodes(prev => prev.slice(0, -1))

  const isCircular = type === 'circular-linked-list'
  const isDoubly   = type === 'doubly-linked-list'

  return (
    <div className="viz-ll-root">
      <div className="viz-ll-row">
        <AnimatePresence>
          {nodes.map((node, i) => (
            <motion.div
              key={node.id}
              className="viz-ll-node-wrap"
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            >
              <motion.div
                className={`viz-ll-node ${highlight === node.id ? 'viz-ll-flash' : ''}`}
                animate={{}}
              >
                <span className="viz-ll-val">{node.val}</span>
                <span className="viz-ll-ptr">●</span>
              </motion.div>

              {/* Arrow to next */}
              {i < nodes.length - 1 && (
                <div className="viz-ll-arrow">
                  {isDoubly && <span className="viz-ll-back">◀</span>}
                  <span>▶</span>
                </div>
              )}

              {/* Circular: last node back to head */}
              {isCircular && i === nodes.length - 1 && (
                <div className="viz-ll-circular-label">↩ head</div>
              )}

              {/* null terminator */}
              {!isCircular && i === nodes.length - 1 && (
                <div className="viz-ll-null">null</div>
              )}
            </motion.div>
          ))}
          {nodes.length === 0 && (
            <motion.span key="empty" className="viz-empty-label" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              null (empty list)
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="viz-controls">
        <input
          className="viz-input"
          placeholder="Value"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && append()}
          maxLength={6}
        />
        <button className="viz-btn" onClick={prepend}>Prepend</button>
        <button className="viz-btn" onClick={append}>Append</button>
        <button className="viz-btn ghost" onClick={removeHead} disabled={!nodes.length}>Remove Head</button>
        <button className="viz-btn ghost" onClick={removeTail} disabled={!nodes.length}>Remove Tail</button>
      </div>

      <div className="viz-legend">
        <span className="viz-legend-item"><span className="viz-legend-dot accent" />Node</span>
        {isDoubly && <span className="viz-legend-item">◀▶ Bidirectional</span>}
        {isCircular && <span className="viz-legend-item">↩ Tail → Head</span>}
        <span className="viz-legend-item">Size: {nodes.length}</span>
      </div>
    </div>
  )
}

