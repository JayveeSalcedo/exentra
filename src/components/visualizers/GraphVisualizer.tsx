import { useState } from 'react'
import type { VisualizerType } from '../../lessons/types'
import {
  BFS_CODE, DFS_CODE, GUIDE_EDGES, GUIDE_VERTICES,
  bfsSteps, dfsSteps, type GraphStep,
} from './algorithms/graph'
import { useStepper } from './stepper/useStepper'
import StepControls from './stepper/StepControls'
import ModeTabs from './stepper/ModeTabs'

interface Props { type: VisualizerType; lessonId: string }

type Traversal = 'bfs' | 'dfs'

const R = 16

export default function GraphVisualizer({ type }: Props) {
  // The traversal lesson follows the study guide's directed example graph
  const directed = type !== 'graph-undirected'
  const [mode, setMode] = useState<Traversal>('dfs')
  const [start, setStart] = useState(1)
  const stepper = useStepper<GraphStep>()
  const step = stepper.step

  const run = (m: Traversal = mode, s: number = start) => {
    stepper.load(m === 'bfs' ? bfsSteps(s, GUIDE_EDGES, directed) : dfsSteps(s, GUIDE_EDGES, directed))
  }

  const vertex = (id: number) => GUIDE_VERTICES.find(v => v.id === id)!
  const visited = new Set(step?.visited ?? [])
  const treeEdges = new Set(step?.treeEdges ?? [])

  return (
    <div className="viz-graph-root">
      <ModeTabs<Traversal>
        value={mode}
        onChange={m => { setMode(m); run(m) }}
        modes={[
          { key: 'dfs', label: 'Depth First Search' },
          { key: 'bfs', label: 'Breadth First Search' },
        ]}
      />

      <div className="viz-graph-stage">
        <svg viewBox="0 0 385 290">
          <defs>
            <marker id="viz-arrow" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" fill="rgba(124,92,191,0.7)" />
            </marker>
            <marker id="viz-arrow-active" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" fill="#00D4AA" />
            </marker>
          </defs>

          {GUIDE_EDGES.map(e => {
            const a = vertex(e.from)
            const b = vertex(e.to)
            const key = `${e.from}-${e.to}`
            const used = treeEdges.has(key) || (!directed && treeEdges.has(`${e.to}-${e.from}`))
            const active = step?.activeEdge === key
            // Stop the line at the edge of the target circle so the arrow is visible
            const dx = b.x - a.x
            const dy = b.y - a.y
            const len = Math.hypot(dx, dy)
            const ex = b.x - (dx / len) * (R + 2)
            const ey = b.y - (dy / len) * (R + 2)
            return (
              <line key={key} x1={a.x} y1={a.y} x2={directed ? ex : b.x} y2={directed ? ey : b.y}
                stroke={used ? '#00D4AA' : active ? '#F59E0B' : 'rgba(124,92,191,0.45)'}
                strokeWidth={used || active ? 2.6 : 1.5}
                strokeDasharray={active && !used ? '4 3' : undefined}
                markerEnd={directed ? `url(#${used ? 'viz-arrow-active' : 'viz-arrow'})` : undefined} />
            )
          })}

          {GUIDE_VERTICES.map(v => {
            const isCurrent = step?.current === v.id
            const isVisited = visited.has(v.id)
            return (
              <g key={v.id} style={{ cursor: 'pointer' }} onClick={() => { setStart(v.id); run(mode, v.id) }}>
                <circle cx={v.x} cy={v.y} r={R}
                  fill={isCurrent ? 'rgba(0,212,170,0.4)' : isVisited ? 'rgba(59,91,219,0.35)' : 'var(--bg-viz-strong)'}
                  stroke={isCurrent ? '#00D4AA' : isVisited ? 'rgba(99,131,255,0.9)' : v.id === start ? '#F59E0B' : 'rgba(124,92,191,0.6)'}
                  strokeWidth={isCurrent ? 3 : 2} />
                <text x={v.x} y={v.y + 4.5} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="var(--text-viz)">{v.id}</text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="viz-panel-row">
        <span className="viz-muted">{mode === 'bfs' ? 'QUEUE (front → rear):' : 'Recursion stack (bottom → top):'}</span>
        {(step?.frontier ?? []).map((v, i) => <span key={i} className="viz-chip">{v}</span>)}
      </div>
      <div className="viz-panel-row">
        <span className="viz-muted">Visit order:</span>
        {(step?.order ?? []).map((v, i) => (
          <span key={i} className={`viz-chip ${i === (step?.order.length ?? 0) - 1 ? 'accent' : ''}`}>{v}</span>
        ))}
      </div>

      <div className="viz-controls">
        <button className="viz-btn" onClick={() => run()} disabled={stepper.playing}>Run {mode.toUpperCase()} from {start}</button>
        <span className="viz-muted" style={{ fontSize: '0.7rem' }}>Click a vertex to start from it. Neighbours are taken in ascending order.</span>
      </div>

      <StepControls stepper={stepper} caption={step?.caption} code={mode === 'bfs' ? BFS_CODE : DFS_CODE} activeLine={step?.line ?? null} />
    </div>
  )
}
