import { useState } from 'react'
import { motion } from 'framer-motion'
import type { VisualizerType } from '../../lessons/types'

interface Props { type: VisualizerType; lessonId: string }

interface TreeNode { val: number; left?: TreeNode; right?: TreeNode }

// Static preset trees per type
function makeBST(vals: number[]): TreeNode | undefined {
  let root: TreeNode | undefined
  const insert = (node: TreeNode | undefined, v: number): TreeNode => {
    if (!node) return { val: v }
    if (v < node.val) return { ...node, left: insert(node.left, v) }
    return { ...node, right: insert(node.right, v) }
  }
  for (const v of vals) root = insert(root, v)
  return root
}

const PRESETS: Record<string, number[]> = {
  'binary-tree': [1, 2, 3, 4, 5, 6, 7],
  'bst': [50, 30, 70, 20, 40, 60, 80],
  'avl-tree': [30, 20, 10, 25, 40, 35, 50],
}

function TreeNodeComponent({
  node, x, y, parentX, parentY, highlight,
}: {
  node: TreeNode; x: number; y: number; parentX?: number; parentY?: number; highlight: number | null
}) {
  const isHighlit = highlight === node.val
  const spacing = 60
  const childY = y + 70

  return (
    <g>
      {/* Edge to parent */}
      {parentX !== undefined && parentY !== undefined && (
        <line x1={parentX} y1={parentY + 20} x2={x} y2={childY - 20}
          stroke="rgba(124,92,191,0.4)" strokeWidth={2} />
      )}

      {/* Left child */}
      {node.left && (
        <TreeNodeComponent
          node={node.left}
          x={x - spacing}
          y={childY}
          parentX={x}
          parentY={y}
          highlight={highlight}
        />
      )}

      {/* Right child */}
      {node.right && (
        <TreeNodeComponent
          node={node.right}
          x={x + spacing}
          y={childY}
          parentX={x}
          parentY={y}
          highlight={highlight}
        />
      )}

      {/* Node circle */}
      <motion.circle
        cx={x} cy={y} r={20}
        fill={isHighlit ? 'rgba(0,212,170,0.35)' : 'rgba(20,28,61,0.95)'}
        stroke={isHighlit ? '#00D4AA' : 'rgba(124,92,191,0.7)'}
        strokeWidth={2}
        animate={{ r: isHighlit ? 23 : 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      />
      <text x={x} y={y + 5} textAnchor="middle"
        fill={isHighlit ? '#00D4AA' : 'var(--text-viz)'} fontSize={13} fontWeight={600}>
        {node.val}
      </text>
    </g>
  )
}

export default function TreeVisualizer({ type }: Props) {
  const presetVals = PRESETS[type] ?? PRESETS['bst']
  const [vals, setVals]         = useState<number[]>(presetVals)
  const [input, setInput]       = useState('')
  const [highlight, setHighlight] = useState<number | null>(null)
  const [traversal, setTraversal] = useState<number[]>([])
  const [travIdx, setTravIdx]     = useState(-1)

  const tree = makeBST(vals)

  const insertNode = () => {
    const v = parseInt(input)
    if (isNaN(v)) return
    setVals(prev => [...prev, v])
    setHighlight(v)
    setTimeout(() => setHighlight(null), 800)
    setInput('')
  }

  const reset = () => { setVals(presetVals); setTraversal([]); setTravIdx(-1) }

  // Collect in-order traversal
  const inOrder = (n?: TreeNode, acc: number[] = []) => {
    if (!n) return acc
    inOrder(n.left, acc); acc.push(n.val); inOrder(n.right, acc)
    return acc
  }

  const runTraversal = () => {
    const order = inOrder(tree)
    setTraversal(order)
    setTravIdx(0)
    order.forEach((v, i) => {
      setTimeout(() => setHighlight(v), i * 500)
      setTimeout(() => setTravIdx(i), i * 500)
    })
    setTimeout(() => { setHighlight(null); setTravIdx(-1) }, order.length * 500 + 300)
  }

  return (
    <div className="viz-tree-root">
      <svg width="100%" height="240" viewBox="0 0 320 220" className="viz-tree-svg">
        {tree && (
          <TreeNodeComponent node={tree} x={160} y={30} highlight={highlight} />
        )}
        {!tree && (
          <text x={160} y={110} textAnchor="middle" fill="rgba(232,234,255,0.4)" fontSize={14}>
            Empty tree
          </text>
        )}
      </svg>

      {traversal.length > 0 && (
        <div className="viz-traversal-row">
          <span className="viz-traversal-label">In-order:</span>
          {traversal.map((v, i) => (
            <motion.span
              key={i}
              className={`viz-traversal-val ${i === travIdx ? 'active' : i < travIdx ? 'done' : ''}`}
              animate={{ scale: i === travIdx ? 1.2 : 1 }}
            >
              {v}
            </motion.span>
          ))}
        </div>
      )}

      <div className="viz-controls">
        <input
          className="viz-input"
          placeholder="Number"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && insertNode()}
          maxLength={4}
        />
        <button className="viz-btn" onClick={insertNode}>Insert</button>
        <button className="viz-btn ghost" onClick={runTraversal} disabled={!tree}>In-Order</button>
        <button className="viz-btn ghost" onClick={reset}>Reset</button>
      </div>

      <div className="viz-legend">
        <span className="viz-legend-item"><span className="viz-legend-dot accent" />Highlighted</span>
        <span className="viz-legend-item">
          {type === 'bst' ? 'left < root < right' : type === 'avl-tree' ? 'Self-balancing' : 'Binary Tree'}
        </span>
      </div>
    </div>
  )
}
