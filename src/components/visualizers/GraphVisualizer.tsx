import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { VisualizerType } from '../../lessons/types'

interface Props { type: VisualizerType; lessonId: string }

interface GNode { id: number; label: string; x: number; y: number }
interface GEdge { from: number; to: number; weight?: number }

const PRESET_NODES: GNode[] = [
  { id: 0, label: '0', x: 100, y: 60 },
  { id: 1, label: '1', x: 220, y: 40 },
  { id: 2, label: '2', x: 60,  y: 160 },
  { id: 3, label: '3', x: 180, y: 160 },
  { id: 4, label: '4', x: 280, y: 120 },
]

const PRESET_EDGES: GEdge[] = [
  { from: 0, to: 1 }, { from: 0, to: 2 },
  { from: 1, to: 3 }, { from: 1, to: 4 },
  { from: 2, to: 3 }, { from: 3, to: 4 },
]

const DIJKSTRA_EDGES: GEdge[] = [
  { from: 0, to: 1, weight: 4 }, { from: 0, to: 2, weight: 1 },
  { from: 2, to: 1, weight: 2 }, { from: 2, to: 3, weight: 2 },
  { from: 1, to: 3, weight: 1 },
]

export default function GraphVisualizer({ type }: Props) {
  const [visited, setVisited]   = useState<Set<number>>(new Set())
  const [current, setCurrent]   = useState<number | null>(null)
  const [queue_,  setQueue_]    = useState<number[]>([])
  const [running, setRunning]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => { timerRef.current.forEach(clearTimeout); timerRef.current = [] }

  const reset = () => { clearTimers(); setVisited(new Set()); setCurrent(null); setQueue_([]); setRunning(false) }

  const runBFS = () => {
    reset()
    setRunning(true)
    const adj: Record<number, number[]> = {}
    PRESET_NODES.forEach(n => { adj[n.id] = [] })
    PRESET_EDGES.forEach(e => {
      adj[e.from].push(e.to)
      if (type !== 'graph-directed') adj[e.to].push(e.from)
    })

    const order: number[] = []
    const vis = new Set<number>()
    const bfsQ = [0]; vis.add(0)
    while (bfsQ.length) {
      const v = bfsQ.shift()!
      order.push(v)
      for (const nb of adj[v]) if (!vis.has(nb)) { vis.add(nb); bfsQ.push(nb) }
    }

    let delay = 0
    order.forEach((v, i) => {
      const t1 = setTimeout(() => { setCurrent(v); setQueue_(order.slice(i + 1)) }, delay)
      const t2 = setTimeout(() => setVisited(prev => new Set([...prev, v])), delay + 300)
      timerRef.current.push(t1, t2)
      delay += 600
    })
    const t3 = setTimeout(() => { setCurrent(null); setRunning(false) }, delay + 300)
    timerRef.current.push(t3)
  }

  useEffect(() => () => clearTimers(), [])

  const isDirected = type === 'graph-directed' || type === 'bfs-dfs'

  return (
    <div className="viz-graph-root">
      <svg width="100%" height="220" viewBox="0 0 340 210" className="viz-graph-svg">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="rgba(124,92,191,0.6)" />
          </marker>
        </defs>

        {/* Edges */}
        {PRESET_EDGES.map((e, i) => {
          const from = PRESET_NODES.find(n => n.id === e.from)!
          const to   = PRESET_NODES.find(n => n.id === e.to)!
          const isActive = visited.has(e.from) && visited.has(e.to)
          return (
            <line
              key={i}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={isActive ? 'rgba(0,212,170,0.6)' : 'rgba(124,92,191,0.35)'}
              strokeWidth={isActive ? 2.5 : 1.5}
              markerEnd={isDirected ? 'url(#arrow)' : undefined}
            />
          )
        })}

        {/* Nodes */}
        {PRESET_NODES.map(node => {
          const isVisited = visited.has(node.id)
          const isCurrent = current === node.id
          return (
            <g key={node.id}>
              <motion.circle
                cx={node.x} cy={node.y} r={20}
                fill={isCurrent ? 'rgba(0,212,170,0.4)' : isVisited ? 'rgba(124,92,191,0.3)' : 'rgba(20,28,61,0.95)'}
                stroke={isCurrent ? '#00D4AA' : isVisited ? 'rgba(124,92,191,0.8)' : 'rgba(124,92,191,0.4)'}
                strokeWidth={isCurrent ? 3 : 2}
                animate={{ r: isCurrent ? 23 : 20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              />
              <text x={node.x} y={node.y + 5} textAnchor="middle"
                fill={isCurrent ? '#00D4AA' : 'var(--text-viz)'} fontSize={13} fontWeight={600}>
                {node.label}
              </text>
            </g>
          )
        })}
      </svg>

      {queue_.length > 0 && (
        <div className="viz-traversal-row">
          <span className="viz-traversal-label">Queue:</span>
          {queue_.map((v, i) => (
            <span key={i} className="viz-traversal-val">{v}</span>
          ))}
        </div>
      )}

      <div className="viz-controls">
        <button className="viz-btn" onClick={runBFS} disabled={running}>Run BFS</button>
        <button className="viz-btn ghost" onClick={reset}>Reset</button>
      </div>

      <div className="viz-legend">
        <span className="viz-legend-item"><span className="viz-legend-dot accent" />Current</span>
        <span className="viz-legend-item"><span className="viz-legend-dot purple" />Visited</span>
        <span className="viz-legend-item">{isDirected ? 'Directed' : 'Weighted'}</span>
      </div>
    </div>
  )
}
