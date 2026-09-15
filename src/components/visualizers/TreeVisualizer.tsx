import { useState } from 'react'
import type { VisualizerType } from '../../lessons/types'
import {
  AVL_INSERT_CODE, BST_DELETE_CODE, BST_INSERT_CODE, BST_SEARCH_CODE, TRAVERSAL_CODE,
  avlInsertSteps, balanceFactors, bstDeleteSteps, bstInsertSteps, bstSearchSteps, buildBST,
  expressionTree, height, layoutTree, traversalSteps,
  type TNode, type TraversalOrder, type TreeStep,
} from './algorithms/tree'
import { useStepper } from './stepper/useStepper'
import StepControls from './stepper/StepControls'
import ModeTabs from './stepper/ModeTabs'

interface Props { type: VisualizerType; lessonId: string }

const BST_START = [50, 30, 70, 20, 40, 60, 80, 35]
const AVL_GUIDE_SEQUENCE = [1, 6, 7, 4, 2, 5, 8, 9, 0, 3]

/* ── Drawing ─────────────────────────────────────────────────────────── */

function TreeView({ root, step }: { root: TNode | null; step?: TreeStep }) {
  if (!root) {
    return <div className="viz-empty-label" style={{ padding: '2.5rem 0', textAlign: 'center' }}>Empty tree</div>
  }
  const pos = layoutTree(root)
  const gapX = 46
  const gapY = 62
  const width = Math.max(pos.size * gapX + 30, 220)
  const svgHeight = height(root) * gapY + 20
  const x = (i: number) => 15 + gapX / 2 + i * gapX
  const y = (d: number) => 30 + d * gapY
  const marked = new Set(step?.marked ?? [])
  const fresh = new Set(step?.fresh ?? [])

  const edges: { from: TNode; to: TNode }[] = []
  const nodes: TNode[] = []
  const walk = (n: TNode | null) => {
    if (!n) return
    nodes.push(n)
    if (n.left) { edges.push({ from: n, to: n.left }); walk(n.left) }
    if (n.right) { edges.push({ from: n, to: n.right }); walk(n.right) }
  }
  walk(root)

  return (
    <div className="viz-tree-stage">
      <svg width={width} height={svgHeight} viewBox={`0 0 ${width} ${svgHeight}`} style={{ maxWidth: '100%', height: 'auto' }}>
        {edges.map(({ from, to }) => {
          const a = pos.get(from.id)!
          const b = pos.get(to.id)!
          const onPath = marked.has(from.id) && marked.has(to.id)
          return (
            <line key={`${from.id}-${to.id}`} x1={x(a.x)} y1={y(a.y)} x2={x(b.x)} y2={y(b.y)}
              stroke={onPath ? 'rgba(0,212,170,0.75)' : 'rgba(124,92,191,0.45)'} strokeWidth={onPath ? 2.5 : 1.6} />
          )
        })}
        {nodes.map(n => {
          const p = pos.get(n.id)!
          const isCurrent = step?.current === n.id
          const isMarked = marked.has(n.id)
          const isFresh = fresh.has(n.id)
          const fill = isCurrent ? 'rgba(0,212,170,0.35)' : isFresh ? 'rgba(245,158,11,0.25)' : isMarked ? 'rgba(59,91,219,0.35)' : 'var(--bg-viz-strong)'
          const stroke = isCurrent ? '#00D4AA' : isFresh ? '#F59E0B' : isMarked ? 'rgba(99,131,255,0.9)' : 'rgba(124,92,191,0.6)'
          const bf = step?.balance?.[n.id]
          return (
            <g key={n.id}>
              <circle cx={x(p.x)} cy={y(p.y)} r={17} fill={fill} stroke={stroke} strokeWidth={isCurrent ? 3 : 2} />
              <text x={x(p.x)} y={y(p.y) + 4.5} textAnchor="middle" fontSize={String(n.val).length > 2 ? 10 : 12.5} fontWeight={700} fill="var(--text-viz)">
                {n.val}
              </text>
              {bf !== undefined && (
                <text x={x(p.x) + 19} y={y(p.y) - 13} className="viz-tree-bf"
                  fill={Math.abs(bf) >= 2 ? '#FF6B8A' : 'rgba(245,158,11,0.9)'}>
                  {bf > 0 ? `+${bf}` : bf}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ── Component ───────────────────────────────────────────────────────── */

type BstMode = 'search' | 'insert' | 'delete'
type AvlMode = 'insert' | 'sequence'

export default function TreeVisualizer({ type }: Props) {
  if (type === 'bst') return <BSTVisualizer />
  if (type === 'avl-tree') return <AVLVisualizer />
  return <TraversalVisualizer />
}

function TraversalVisualizer() {
  const [root] = useState<TNode>(() => expressionTree())
  const [order, setOrder] = useState<TraversalOrder>('preorder')
  const stepper = useStepper<TreeStep>()
  const step = stepper.step

  const run = (o: TraversalOrder) => {
    setOrder(o)
    stepper.load(traversalSteps(root, o))
  }

  return (
    <div className="viz-tree-root">
      <ModeTabs<TraversalOrder>
        value={order}
        onChange={run}
        modes={[
          { key: 'preorder', label: 'Preorder' },
          { key: 'inorder', label: 'Inorder' },
          { key: 'postorder', label: 'Postorder' },
        ]}
      />
      <TreeView root={step?.root ?? root} step={step} />
      <div className="viz-panel-row">
        <span className="viz-muted">Output:</span>
        {(step?.output ?? []).map((v, i) => (
          <span key={i} className={`viz-chip ${i === (step?.output?.length ?? 0) - 1 ? 'accent' : ''}`}>{v}</span>
        ))}
      </div>
      <div className="viz-panel-row">
        <span className="viz-muted">Call stack:</span>
        {(step?.stack ?? []).map((v, i) => <span key={i} className="viz-chip">{order}({v})</span>)}
      </div>
      <div className="viz-controls">
        <button className="viz-btn" onClick={() => run(order)} disabled={stepper.playing}>Run {order}</button>
        <span className="viz-muted" style={{ fontSize: '0.7rem' }}>Expression tree for (A + B) * (C − D)</span>
      </div>
      <StepControls stepper={stepper} caption={step?.caption} code={TRAVERSAL_CODE[order]} activeLine={step?.line ?? null} />
    </div>
  )
}

function BSTVisualizer() {
  const [root, setRoot] = useState<TNode | null>(() => buildBST(BST_START))
  const [mode, setMode] = useState<BstMode>('search')
  const [key, setKey] = useState('35')
  const stepper = useStepper<TreeStep>()
  const step = stepper.step

  const run = () => {
    const k = parseInt(key)
    if (isNaN(k)) return
    if (mode === 'search') {
      stepper.load(bstSearchSteps(root, k))
      return
    }
    const { steps, result } = mode === 'insert' ? bstInsertSteps(root, k) : bstDeleteSteps(root, k)
    setRoot(result)
    stepper.load(steps)
  }

  const reset = () => {
    setRoot(buildBST(BST_START))
    stepper.load([], false)
  }

  const code = mode === 'search' ? BST_SEARCH_CODE : mode === 'insert' ? BST_INSERT_CODE : BST_DELETE_CODE

  return (
    <div className="viz-tree-root">
      <ModeTabs<BstMode>
        value={mode}
        onChange={m => { setMode(m); stepper.load([], false) }}
        modes={[
          { key: 'search', label: 'Search' },
          { key: 'insert', label: 'Insert' },
          { key: 'delete', label: 'Delete' },
        ]}
      />
      <TreeView root={step?.root ?? root} step={step} />
      <div className="viz-controls">
        <label className="viz-field">
          key
          <input className="viz-input narrow" value={key} maxLength={3} onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()} />
        </label>
        <button className="viz-btn" onClick={run} disabled={stepper.playing}>
          {mode === 'search' ? 'Search' : mode === 'insert' ? 'Insert' : 'Delete'}
        </button>
        <button className="viz-btn ghost" onClick={reset}>Reset tree</button>
      </div>
      {mode === 'delete' && (
        <p className="viz-muted" style={{ fontSize: '0.68rem', margin: '0.3rem 0 0' }}>
          Try 20 (leaf), 30 (has a left subtree) or 70 after deleting 60 (no left subtree).
        </p>
      )}
      <StepControls stepper={stepper} caption={step?.caption} code={code} activeLine={step?.line ?? null} />
    </div>
  )
}

function AVLVisualizer() {
  const [root, setRoot] = useState<TNode | null>(null)
  const [mode, setMode] = useState<AvlMode>('sequence')
  const [key, setKey] = useState('')
  const stepper = useStepper<TreeStep>([], 1100)
  const step = stepper.step

  const insertKey = () => {
    const k = parseInt(key)
    if (isNaN(k)) return
    const { steps, result } = avlInsertSteps(root, k)
    setRoot(result)
    stepper.load(steps)
    setKey('')
  }

  const runSequence = () => {
    let t: TNode | null = null
    const steps: TreeStep[] = []
    for (const k of AVL_GUIDE_SEQUENCE) {
      const r = avlInsertSteps(t, k)
      // Keep the key steps: attach, the imbalance check and any rotation
      steps.push(...r.steps.filter(s => s.fresh?.length || s.line === 1 || s.line === 2 || (s.line ?? 0) >= 3))
      t = r.result
    }
    setRoot(t)
    stepper.load(steps)
  }

  const reset = () => {
    setRoot(null)
    stepper.load([], false)
  }

  return (
    <div className="viz-tree-root">
      <ModeTabs<AvlMode>
        value={mode}
        onChange={m => { setMode(m); stepper.load([], false) }}
        modes={[
          { key: 'sequence', label: 'Guide activity: 1 6 7 4 2 5 8 9 0 3' },
          { key: 'insert', label: 'Insert your own keys' },
        ]}
      />
      <TreeView root={step?.root ?? root} step={step ?? (root ? { root, balance: balanceFactors(root), line: null, caption: '' } : undefined)} />
      <div className="viz-controls">
        {mode === 'insert' ? (
          <>
            <label className="viz-field">
              key
              <input className="viz-input narrow" value={key} maxLength={3} onChange={e => setKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && insertKey()} />
            </label>
            <button className="viz-btn" onClick={insertKey} disabled={stepper.playing}>Insert</button>
          </>
        ) : (
          <button className="viz-btn" onClick={runSequence} disabled={stepper.playing}>Insert the sequence</button>
        )}
        <button className="viz-btn ghost" onClick={reset}>Clear tree</button>
      </div>
      <div className="viz-legend">
        <span className="viz-legend-item"><span className="viz-legend-dot warn" />Balance factor = left height − right height</span>
        <span className="viz-legend-item"><span className="viz-legend-dot accent" />Rotation</span>
      </div>
      <StepControls stepper={stepper} caption={step?.caption} code={AVL_INSERT_CODE} activeLine={step?.line ?? null} />
    </div>
  )
}
