import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, CheckCircle, Flame, HelpCircle, RotateCcw, Swords,
  Timer, Trash2, Users, Zap, AlertTriangle, GitBranch, Volume2, VolumeX,
} from 'lucide-react'
import { sfx, gameMusic, useSfxToggle } from '../../../lib/sfx'
import './TreeBuilder.css'

/* ── Types ─────────────────────────────────────────────────────────────── */

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type Mode       = 'solo' | 'multiplayer'
type Phase      = 'lobby' | 'playing' | 'result'

type ChallengeType =
  | 'scenario_insert'    // Where does a value land in a BST? (scenario, no recipe)
  | 'identify_traversal' // Given a tree, which output matches pre/in/post order? (MC)
  | 'predict_search'     // BST search path — what's the next node visited / found? (MC)
  | 'build_bst'          // Drag values one at a time into correct BST position
  | 'traversal_trace'    // Click nodes in correct traversal order (no labels beyond order type)
  | 'spot_violation'     // What rule was broken in this tree? (MC)
  | 'height_balance'     // Compute height / balance factor of a node (MC)
  | 'avl_rotation'       // Which rotation fixes this unbalanced tree? (MC)

interface MCOption { label: string; correct: boolean }

interface TNode {
  id: string
  value: number
  left: string | null
  right: string | null
}

interface Challenge {
  type: ChallengeType
  title: string
  scenario: string          // Narrative, never a step-by-step recipe
  timeLimit: number
  maxSize: number
  nodes: TNode[]
  rootId: string | null
  stream?: number[]         // values to insert one at a time (build_bst)
  traversalKind?: 'preorder' | 'inorder' | 'postorder'
  expectedOrder?: string[]  // ids in correct traversal order
  targetNodeId?: string     // for height_balance / predict_search
  answer?: string
  mcOptions?: MCOption[]
  violationKind?: string
}

interface FloatingScore { id: string; value: number; x: number }

/* ── Constants ─────────────────────────────────────────────────────────── */

const ACCENT       = '#00D4AA'
const TOTAL_ROUNDS  = 5
const POINT_BASE    = 100
const POINT_SPEED   = 50
const POINT_WRONG   = -25
const POINT_HINT    = -35

const DIFFICULTY_CONFIG: Record<Difficulty, {
  label: string; desc: string; time: number; maxSize: number; color: string
}> = {
  easy:   { label: 'Easy',   desc: 'Mental BST inserts — no hand-holding', time: 40,  maxSize: 7,  color: ACCENT    },
  medium: { label: 'Medium', desc: 'Build BSTs & trace traversals',        time: 55,  maxSize: 9,  color: '#9B7ED4' },
  hard:   { label: 'Hard',   desc: 'Height, balance & violations',        time: 70,  maxSize: 11, color: '#FFB830' },
  expert: { label: 'Expert', desc: 'AVL rotations, deep traversals',      time: 90,  maxSize: 13, color: '#FF6B8A' },
}

const TYPES_BY_DIFF: Record<Difficulty, ChallengeType[]> = {
  easy:   ['scenario_insert', 'identify_traversal', 'predict_search'],
  medium: ['build_bst', 'traversal_trace', 'spot_violation'],
  hard:   ['height_balance', 'build_bst', 'spot_violation'],
  expert: ['avl_rotation', 'traversal_trace', 'height_balance'],
}

const FAKE_OPPONENTS = [
  { name: 'Kai [AI]',  ops: 0 },
  { name: 'Mira [AI]', ops: 0 },
  { name: 'Theo [AI]', ops: 0 },
]

/* ── Utilities ─────────────────────────────────────────────────────────── */

function uid()  { return Math.random().toString(36).slice(2, 9) }
function rng(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(arr: readonly T[]) { return arr[rng(0, arr.length - 1)] }
function shuffle<T>(arr: T[]) { return [...arr].sort(() => Math.random() - 0.5) }
function uniqueVals(n: number, lo = 1, hi = 99) {
  const set = new Set<number>()
  while (set.size < n) set.add(rng(lo, hi))
  return [...set]
}

/** Build a BST from a sequence of values inserted in order. Returns node map + root id. */
function buildBstFromSequence(values: number[]): { nodes: TNode[]; rootId: string | null } {
  const nodes: Record<string, TNode> = {}
  let rootId: string | null = null

  function insert(value: number): void {
    const newId = uid()
    nodes[newId] = { id: newId, value, left: null, right: null }
    if (rootId === null) { rootId = newId; return }
    let curId = rootId
    while (true) {
      const cur = nodes[curId]
      if (value < cur.value) {
        if (cur.left === null) { cur.left = newId; return }
        curId = cur.left
      } else {
        if (cur.right === null) { cur.right = newId; return }
        curId = cur.right
      }
    }
  }
  values.forEach(insert)
  return { nodes: Object.values(nodes), rootId }
}

function findNode(nodes: TNode[], id: string | null) { return nodes.find(n => n.id === id) ?? null }

function nodeHeight(nodes: TNode[], id: string | null): number {
  if (!id) return -1
  const n = findNode(nodes, id)
  if (!n) return -1
  return 1 + Math.max(nodeHeight(nodes, n.left), nodeHeight(nodes, n.right))
}

function traverse(nodes: TNode[], id: string | null, kind: 'preorder' | 'inorder' | 'postorder'): string[] {
  if (!id) return []
  const n = findNode(nodes, id)
  if (!n) return []
  if (kind === 'preorder')  return [n.id, ...traverse(nodes, n.left, kind), ...traverse(nodes, n.right, kind)]
  if (kind === 'postorder') return [...traverse(nodes, n.left, kind), ...traverse(nodes, n.right, kind), n.id]
  return [...traverse(nodes, n.left, kind), n.id, ...traverse(nodes, n.right, kind)] // inorder
}

/** Assign x,y layout positions (in-order x, depth y) for rendering. */
function layoutTree(nodes: TNode[], rootId: string | null) {
  const positions: Record<string, { x: number; y: number; depth: number }> = {}
  let counter = 0
  function walk(id: string | null, depth: number) {
    if (!id) return
    const n = findNode(nodes, id)
    if (!n) return
    walk(n.left, depth + 1)
    positions[id] = { x: counter, y: depth, depth }
    counter += 1
    walk(n.right, depth + 1)
  }
  walk(rootId, 0)
  return positions
}

/* ── Challenge pools ───────────────────────────────────────────────────── */

const SCENARIO_INSERT_POOL = [
  { story: 'A BST holds root 50. You insert 30. Which side of 50 does 30 become a child of?', root: 50, insert: 30, correct: 'left', },
  { story: 'A BST holds root 50. You insert 70. Which side of 50 does 70 become a child of?', root: 50, insert: 70, correct: 'right', },
  { story: 'A BST has root 40, with a left child 20. You insert 25. Where does 25 land?', root: 40, path: [20], insert: 25, correct: 'right child of 20', },
  { story: 'A BST has root 40, with a right child 60. You insert 55. Where does 55 land?', root: 40, path: [60], insert: 55, correct: 'left child of 60', },
]

const VIOLATION_POOL = [
  { scenario: 'A node with value 50 has a left subtree containing a node valued 62. What BST rule was broken?', correct: 'Left subtree must hold only values smaller than the parent', distractors: ['Right subtree must hold only values smaller than the parent', 'Tree must be balanced (AVL property)', 'Duplicate values are required'] },
  { scenario: 'A node with value 30 has a right subtree containing a node valued 18. What BST rule was broken?', correct: 'Right subtree must hold only values greater than the parent', distractors: ['Left subtree must hold only values greater than the parent', 'Tree height must be log(n)', 'Nodes must be inserted in sorted order'] },
  { scenario: 'A binary tree node has three children attached to it. What rule was broken?', correct: 'A binary tree node may have at most two children', distractors: ['A binary tree node may have at most one child', 'Every node must have exactly two children', 'Leaf nodes cannot have values'] },
  { scenario: 'An AVL node\'s left subtree has height 4 and its right subtree has height 1. What rule was broken?', correct: 'AVL balance factor must stay within −1 and +1', distractors: ['BST ordering property', 'A node cannot have a height of 4', 'Leaf nodes must be balanced'] },
]

const HEIGHT_QUESTION_POOL = ['height', 'balance'] as const

const AVL_ROTATION_POOL = [
  { scenario: 'A node\'s left child has a taller left subtree (left-left case) — the node is unbalanced with balance factor +2. Which rotation restores balance?', correct: 'Right rotation (single)', distractors: ['Left rotation (single)', 'Left-Right rotation (double)', 'Right-Left rotation (double)'] },
  { scenario: 'A node\'s right child has a taller right subtree (right-right case) — the node is unbalanced with balance factor −2. Which rotation restores balance?', correct: 'Left rotation (single)', distractors: ['Right rotation (single)', 'Right-Left rotation (double)', 'Left-Right rotation (double)'] },
  { scenario: 'A node\'s left child has a taller right subtree (left-right case). Which rotation restores balance?', correct: 'Left-Right rotation (double)', distractors: ['Right rotation (single)', 'Left rotation (single)', 'Right-Left rotation (double)'] },
  { scenario: 'A node\'s right child has a taller left subtree (right-left case). Which rotation restores balance?', correct: 'Right-Left rotation (double)', distractors: ['Left rotation (single)', 'Right rotation (single)', 'Left-Right rotation (double)'] },
]

function generateChallenge(difficulty: Difficulty, round: number): Challenge {
  const cfg = DIFFICULTY_CONFIG[difficulty]
  const forcedFinal: Partial<Record<Difficulty, ChallengeType>> = {
    hard: 'height_balance', expert: 'avl_rotation',
  }
  const type: ChallengeType =
    round === TOTAL_ROUNDS - 1 && forcedFinal[difficulty]
      ? forcedFinal[difficulty]!
      : pick(TYPES_BY_DIFF[difficulty])

  /* ── scenario_insert ─────────────────────────────────────────────────── */
  if (type === 'scenario_insert') {
    const p = pick(SCENARIO_INSERT_POOL)
    const vals = p.path ? [p.root, ...p.path] : [p.root]
    const { nodes, rootId } = buildBstFromSequence(vals)
    const distractorPool = ['left', 'right', 'left child of 20', 'right child of 20', 'left child of 60', 'right child of 60', 'becomes the new root']
      .filter(d => d !== p.correct)
    const mcOptions = shuffle([
      { label: p.correct, correct: true },
      ...shuffle(distractorPool).slice(0, 3).map(l => ({ label: l, correct: false })),
    ])
    return {
      type, title: 'Where Does It Land?', scenario: p.story,
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, rootId, mcOptions, answer: p.correct,
    }
  }

  /* ── identify_traversal ──────────────────────────────────────────────── */
  if (type === 'identify_traversal') {
    const vals = uniqueVals(rng(5, 6), 1, 90)
    const { nodes, rootId } = buildBstFromSequence(vals)
    const kind = pick(['preorder', 'inorder', 'postorder'] as const)
    const correctOrder = traverse(nodes, rootId, kind).map(id => findNode(nodes, id)!.value)
    const wrongKinds = (['preorder', 'inorder', 'postorder'] as const).filter(k => k !== kind)
    const distractorOrders = wrongKinds.map(k => traverse(nodes, rootId, k).map(id => findNode(nodes, id)!.value).join(', '))
    const correctStr = correctOrder.join(', ')
    const extraDistractor = shuffle([...correctOrder]).join(', ')
    const allDistractors = [...distractorOrders, extraDistractor].filter(d => d !== correctStr)
    const mcOptions = shuffle([
      { label: correctStr, correct: true },
      ...shuffle(allDistractors).slice(0, 3).map(l => ({ label: l, correct: false })),
    ])
    return {
      type, title: `Spot the ${kind[0].toUpperCase()}${kind.slice(1)}`,
      scenario: `Which sequence below is the correct ${kind} traversal of this tree?`,
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, rootId, traversalKind: kind,
      mcOptions, answer: correctStr,
    }
  }

  /* ── predict_search ──────────────────────────────────────────────────── */
  if (type === 'predict_search') {
    const vals = uniqueVals(rng(5, 7), 1, 90)
    const { nodes, rootId } = buildBstFromSequence(vals)
    const target = pick(vals)
    // trace path
    const path: number[] = []
    let curId: string | null = rootId
    while (curId) {
      const cur = findNode(nodes, curId)!
      path.push(cur.value)
      if (cur.value === target) break
      curId = target < cur.value ? cur.left : cur.right
    }
    const correct = `Found after visiting: ${path.join(' → ')}`
    const wrongPath1 = `Found after visiting: ${[...path].reverse().join(' → ')}`
    const wrongPath2 = `Not found — ${target} does not exist in the tree`
    const wrongPath3 = `Found after visiting: ${vals.slice(0, path.length).join(' → ')}`
    const distractors = [wrongPath1, wrongPath2, wrongPath3].filter(d => d !== correct)
    const mcOptions = shuffle([
      { label: correct, correct: true },
      ...shuffle(distractors).slice(0, 3).map(l => ({ label: l, correct: false })),
    ])
    return {
      type, title: 'Trace the Search', scenario: `Searching for ${target} in this BST. Which path does the search actually take?`,
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, rootId, mcOptions, answer: correct,
    }
  }

  /* ── build_bst ───────────────────────────────────────────────────────── */
  if (type === 'build_bst') {
    const n = rng(5, 7)
    const stream = uniqueVals(n, 1, 90)
    return {
      type, title: 'Build the Tree',
      scenario: 'Values arrive one at a time. Drag each into the tree — drop it on the LEFT or RIGHT slot of whichever node it belongs under. Figure out the correct spot using BST ordering: smaller goes left, larger goes right.',
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes: [], rootId: null, stream,
    }
  }

  /* ── traversal_trace ─────────────────────────────────────────────────── */
  if (type === 'traversal_trace') {
    const vals = uniqueVals(rng(6, 8), 1, 90)
    const { nodes, rootId } = buildBstFromSequence(vals)
    const kind = pick(['preorder', 'inorder', 'postorder'] as const)
    const expectedOrder = traverse(nodes, rootId, kind)
    return {
      type, title: `${kind[0].toUpperCase()}${kind.slice(1)} Order`,
      scenario: `Click the nodes in correct ${kind} traversal order. No labels — apply the rule yourself.`,
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, rootId, traversalKind: kind, expectedOrder,
    }
  }

  /* ── spot_violation ──────────────────────────────────────────────────── */
  if (type === 'spot_violation') {
    const v = pick(VIOLATION_POOL)
    const mcOptions = shuffle([
      { label: v.correct, correct: true },
      ...v.distractors.map(l => ({ label: l, correct: false })),
    ])
    return {
      type, title: 'Spot the Violation', scenario: v.scenario,
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes: [], rootId: null, mcOptions, answer: v.correct,
    }
  }

  /* ── height_balance ──────────────────────────────────────────────────── */
  if (type === 'height_balance') {
    const vals = uniqueVals(rng(6, 9), 1, 90)
    const { nodes, rootId } = buildBstFromSequence(vals)
    const targetId = pick(nodes).id
    const target = findNode(nodes, targetId)!
    const question = pick(HEIGHT_QUESTION_POOL)
    if (question === 'height') {
      const h = nodeHeight(nodes, targetId)
      const distractors = [h - 1, h + 1, h + 2].filter(d => d >= 0 && d !== h).map(String)
      const mcOptions = shuffle([
        { label: String(h), correct: true },
        ...shuffle(distractors).slice(0, 3).map(l => ({ label: l, correct: false })),
      ])
      return {
        type, title: 'Compute the Height', scenario: `What is the height of the subtree rooted at node ${target.value}? (A leaf has height 0.)`,
        timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, rootId, targetNodeId: targetId,
        mcOptions, answer: String(h),
      }
    } else {
      const bf = nodeHeight(nodes, target.left) - nodeHeight(nodes, target.right)
      const distractors = [bf - 1, bf + 1, -bf].filter(d => d !== bf).map(String)
      const mcOptions = shuffle([
        { label: String(bf), correct: true },
        ...shuffle(distractors).slice(0, 3).map(l => ({ label: l, correct: false })),
      ])
      return {
        type, title: 'Compute the Balance Factor', scenario: `What is the balance factor (left height − right height) of node ${target.value}?`,
        timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, rootId, targetNodeId: targetId,
        mcOptions, answer: String(bf),
      }
    }
  }

  /* ── avl_rotation ────────────────────────────────────────────────────── */
  const v = pick(AVL_ROTATION_POOL)
  const mcOptions = shuffle([
    { label: v.correct, correct: true },
    ...v.distractors.map(l => ({ label: l, correct: false })),
  ])
  return {
    type: 'avl_rotation', title: 'Fix the Balance', scenario: v.scenario,
    timeLimit: cfg.time, maxSize: cfg.maxSize, nodes: [], rootId: null, mcOptions, answer: v.correct,
  }
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function CountUp({ target }: { target: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let cur = 0
    const step = Math.max(1, Math.ceil(target / 35))
    const t = setInterval(() => {
      cur = Math.min(target, cur + step)
      setN(cur)
      if (cur >= target) clearInterval(t)
    }, 24)
    return () => clearInterval(t)
  }, [target])
  return <>{n.toLocaleString()}</>
}

function TimerBar({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [rem, setRem] = useState(seconds)
  useEffect(() => {
    setRem(seconds)
    const t = setInterval(() => {
      setRem(prev => {
        if (prev <= 1) { clearInterval(t); onExpire(); return 0 }
        if (prev - 1 <= 5) sfx.tick()
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [seconds, onExpire])
  const pct   = (rem / seconds) * 100
  const color = pct > 45 ? ACCENT : pct > 20 ? '#F97316' : '#FF6B8A'
  return (
    <div className="tb-timer">
      <Timer size={14} color={color} />
      <div className="tb-timer-track">
        <motion.div className="tb-timer-fill" style={{ background: color }} animate={{ width: `${pct}%` }} />
      </div>
      <span style={{ color }}>{rem}s</span>
    </div>
  )
}

/** Visual tree canvas — renders nodes by depth/in-order position with SVG connector lines */
function TreeCanvas({
  nodes, rootId, clickedIds, wrongId, highlightId, onNodeClick, dropTargets, onDropAt,
}: {
  nodes: TNode[]; rootId: string | null
  clickedIds?: string[]; wrongId?: string | null; highlightId?: string | null
  onNodeClick?: (id: string) => void
  dropTargets?: { nodeId: string; side: 'left' | 'right' }[]
  onDropAt?: (nodeId: string, side: 'left' | 'right') => void
}) {
  const positions = useMemo(() => layoutTree(nodes, rootId), [nodes, rootId])
  const maxDepth = Math.max(0, ...Object.values(positions).map(p => p.depth))
  const maxX     = Math.max(0, ...Object.values(positions).map(p => p.x))
  const colW = 64
  const rowH = 78
  const width  = Math.max(260, (maxX + 1) * colW + 40)
  const height = (maxDepth + 1) * rowH + 50

  function px(id: string) { return 20 + (positions[id]?.x ?? 0) * colW + colW / 2 }
  function py(id: string) { return 20 + (positions[id]?.depth ?? 0) * rowH }

  return (
    <div className="tb-canvas-wrap">
      <svg className="tb-canvas" viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height }}>
        {nodes.map(n => {
          const edges: React.ReactNode[] = []
          if (n.left) edges.push(
            <line key={`${n.id}-l`} x1={px(n.id)} y1={py(n.id) + 22} x2={px(n.left)} y2={py(n.left) + 22}
              stroke="rgba(0,212,170,0.25)" strokeWidth={1.5} />
          )
          if (n.right) edges.push(
            <line key={`${n.id}-r`} x1={px(n.id)} y1={py(n.id) + 22} x2={px(n.right)} y2={py(n.right) + 22}
              stroke="rgba(0,212,170,0.25)" strokeWidth={1.5} />
          )
          return edges
        })}

        {/* Drop slot indicators for build_bst */}
        {dropTargets?.map(dt => {
          const parent = findNode(nodes, dt.nodeId)
          if (!parent) return null
          const childOffset = dt.side === 'left' ? -colW * 0.65 : colW * 0.65
          const cx = px(dt.nodeId) + childOffset
          const cy = py(dt.nodeId) + rowH
          return (
            <g key={`${dt.nodeId}-${dt.side}`}>
              <line x1={px(dt.nodeId)} y1={py(dt.nodeId) + 22} x2={cx} y2={cy + 22}
                stroke="rgba(0,212,170,0.15)" strokeWidth={1} strokeDasharray="4 3" />
              <foreignObject x={cx - 26} y={cy} width={52} height={44}>
                <div
                  className="tb-drop-slot"
                  onDragOver={e => { e.preventDefault() }}
                  onDrop={e => { e.preventDefault(); onDropAt?.(dt.nodeId, dt.side) }}
                >
                  {dt.side === 'left' ? 'L' : 'R'}
                </div>
              </foreignObject>
            </g>
          )
        })}

        {nodes.map(n => {
          const isClicked = clickedIds?.includes(n.id)
          const isWrong   = wrongId === n.id
          const isHi      = highlightId === n.id
          let cls = 'tb-node-circle'
          if (isWrong) cls += ' tb-node-circle--wrong'
          else if (isClicked) cls += ' tb-node-circle--done'
          else if (isHi) cls += ' tb-node-circle--hi'
          return (
            <foreignObject key={n.id} x={px(n.id) - 22} y={py(n.id)} width={44} height={44}>
              <div
                className={cls}
                onClick={onNodeClick ? () => onNodeClick(n.id) : undefined}
                style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
              >
                {n.value}
              </div>
            </foreignObject>
          )
        })}
      </svg>
      {nodes.length === 0 && <div className="tb-canvas-empty">Drop the first value anywhere to set the root</div>}
    </div>
  )
}

/** Multiple-choice answer grid */
function MCGrid({
  options, onPick, locked,
}: {
  options: MCOption[]; onPick: (o: MCOption) => void; locked: boolean
}) {
  const [chosen, setChosen] = useState<string | null>(null)
  function handle(o: MCOption) {
    if (locked || chosen) return
    sfx.select()
    setChosen(o.label)
    onPick(o)
  }
  return (
    <div className="tb-mc-grid">
      {options.map(o => {
        let cls = 'tb-mc-btn'
        if (chosen === o.label) cls += o.correct ? ' correct' : ' wrong'
        if (chosen && o.correct && chosen !== o.label) cls += ' reveal'
        return (
          <button key={o.label} className={cls} onClick={() => handle(o)} disabled={locked || !!chosen}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function TreeBuilder() {
  const navigate = useNavigate()

  /* Global state */
  const [phase,      setPhase]      = useState<Phase>('lobby')
  const [mode,       setMode]       = useState<Mode>('solo')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')

  /* Round state */
  const [challenge,   setChallenge]   = useState<Challenge | null>(null)
  const [liveNodes,   setLiveNodes]   = useState<TNode[]>([])
  const [liveRootId,  setLiveRootId]  = useState<string | null>(null)
  const [streamIndex, setStreamIndex] = useState(0)
  const [clickedIds,  setClickedIds]  = useState<string[]>([])
  const [wrongId,     setWrongId]     = useState<string | null>(null)
  const [mcLocked,    setMcLocked]    = useState(false)
  const [,            setDragValue]   = useState<number | null>(null)

  /* Score / progress */
  const [score,    setScore]    = useState(0)
  const [combo,    setCombo]    = useState(0)
  const [round,    setRound]    = useState(0)
  const [correct,  setCorrect]  = useState(0)
  const [ops,      setOps]      = useState(0)
  const [badges,   setBadges]   = useState<string[]>([])
  const [opponents,setOpponents]= useState(FAKE_OPPONENTS)

  /* UI */
  const [feedback,      setFeedback]      = useState<'correct' | 'wrong' | null>(null)
  const [shake,         setShake]         = useState(false)
  const [hintUsed,      setHintUsed]      = useState(false)
  const [hintVisible,   setHintVisible]   = useState(false)
  const [floatingScores,setFloatingScores]= useState<FloatingScore[]>([])
  const [wrongMsg,      setWrongMsg]      = useState<string | null>(null)
  const runStart = useRef(Date.now())

  const { muted: sfxMuted, toggle: toggleSfx } = useSfxToggle()

  useEffect(() => {
    if (phase === 'result') {
      gameMusic.stop()
      const acc = correct / TOTAL_ROUNDS
      if (acc >= 0.6) sfx.success()
      else sfx.needsWork()
    }
  }, [phase])

  useEffect(() => () => { gameMusic.stop() }, [])

  const cfg         = DIFFICULTY_CONFIG[difficulty]
  const activeValue  = challenge?.stream?.[streamIndex]

  /* ── Hint text ── */
  const hintText = useMemo(() => {
    if (!challenge) return ''
    if (challenge.type === 'scenario_insert' || challenge.type === 'predict_search')
      return 'In a BST, smaller values always go left, larger values always go right of each node you compare against.'
    if (challenge.type === 'identify_traversal' || challenge.type === 'traversal_trace')
      return challenge.traversalKind === 'preorder' ? 'Preorder: visit the node itself, then its entire left subtree, then its entire right subtree.'
        : challenge.traversalKind === 'postorder' ? 'Postorder: visit the entire left subtree, then the entire right subtree, then the node itself.'
        : 'Inorder: visit the entire left subtree, then the node itself, then the entire right subtree. For a BST this produces sorted order.'
    if (challenge.type === 'build_bst')
      return 'Compare the incoming value against the current node: smaller goes left, larger goes right. Repeat at each node until you find an empty slot.'
    if (challenge.type === 'height_balance')
      return 'Height counts edges down to the deepest leaf (a leaf alone has height 0). Balance factor = left subtree height − right subtree height.'
    if (challenge.type === 'avl_rotation')
      return 'Name the case by which grandchild is too tall: left-left → single right rotation, right-right → single left rotation, left-right and right-left need a double rotation.'
    return 'Apply the rule that defines this structure — there is no single click that does it for you.'
  }, [challenge])

  /* ── Helpers ── */
  function spawnFloat(val: number) {
    const id = uid()
    setFloatingScores(prev => [...prev, { id, value: val, x: rng(25, 75) }])
    setTimeout(() => setFloatingScores(prev => prev.filter(f => f.id !== id)), 950)
  }

  function loadChallenge(r: number) {
    const c = generateChallenge(difficulty, r)
    setChallenge(c)
    setLiveNodes(c.nodes)
    setLiveRootId(c.rootId)
    setStreamIndex(0)
    setClickedIds([])
    setWrongId(null)
    setMcLocked(false)
    setDragValue(null)
    setFeedback(null)
    setHintUsed(false)
    setHintVisible(false)
    setWrongMsg(null)
    runStart.current = Date.now()
  }

  function startGame() {
    sfx.submit()
    gameMusic.play()
    setScore(0); setCombo(0); setRound(0); setCorrect(0); setOps(0); setBadges([])
    setOpponents(FAKE_OPPONENTS.map(o => ({ ...o, ops: rng(8, 18) })))
    loadChallenge(0)
    setPhase('playing')
  }

  function completeRound(extra = 0) {
    sfx.success()
    const elapsed    = (Date.now() - runStart.current) / 1000
    const speedBonus = elapsed < (challenge?.timeLimit ?? cfg.time) * 0.5 ? POINT_SPEED : 0
    const nextCombo  = combo + 1
    const mult       = nextCombo >= 3 ? 3 : nextCombo >= 2 ? 2 : 1
    const gained     = (POINT_BASE + speedBonus + extra) * mult
    setScore(prev => prev + gained)
    setCombo(nextCombo)
    setCorrect(prev => prev + 1)
    setFeedback('correct')
    spawnFloat(gained)
    const earned = new Set(badges)
    if (challenge?.type === 'avl_rotation' && nextCombo >= 2) earned.add('Balance Master')
    if (challenge?.type === 'traversal_trace')                earned.add('Order Tracker')
    if (challenge?.type === 'build_bst')                       earned.add('Tree Architect')
    if (nextCombo >= 3)                                        earned.add('On Fire 🔥')
    setBadges([...earned])
    const nextRound = round + 1
    setTimeout(() => {
      if (nextRound >= TOTAL_ROUNDS) setPhase('result')
      else { setRound(nextRound); loadChallenge(nextRound) }
    }, 950)
  }

  function wrong(msg?: string) {
    sfx.error()
    setScore(prev => Math.max(0, prev + POINT_WRONG))
    setCombo(0)
    setFeedback('wrong')
    setWrongMsg(msg ?? null)
    setShake(true)
    spawnFloat(POINT_WRONG)
    setTimeout(() => { setFeedback(null); setShake(false); setWrongId(null) }, 700)
  }

  function useHint() {
    if (hintUsed) return
    sfx.hint()
    setHintUsed(true)
    setHintVisible(true)
    setScore(prev => Math.max(0, prev + POINT_HINT))
    spawnFloat(POINT_HINT)
  }

  function expireRound() {
    setCombo(0)
    const nextRound = round + 1
    if (nextRound >= TOTAL_ROUNDS) setPhase('result')
    else { setRound(nextRound); loadChallenge(nextRound) }
  }

  /* ── MC handler ── */
  function handleMC(o: MCOption) {
    setMcLocked(true)
    setOps(prev => prev + 1)
    if (o.correct) {
      setTimeout(() => completeRound(), 650)
      return
    }
    wrong(`Incorrect. The right answer is: ${challenge?.answer}`)
    const nextRound = round + 1
    setTimeout(() => {
      if (nextRound >= TOTAL_ROUNDS) setPhase('result')
      else { setRound(nextRound); loadChallenge(nextRound) }
    }, 1400)
  }

  /* ── build_bst: drag value, drop on a node's left/right slot ── */
  function getDropTargets(): { nodeId: string; side: 'left' | 'right' }[] {
    const out: { nodeId: string; side: 'left' | 'right' }[] = []
    liveNodes.forEach(n => {
      if (n.left === null)  out.push({ nodeId: n.id, side: 'left' })
      if (n.right === null) out.push({ nodeId: n.id, side: 'right' })
    })
    return out
  }

  function handleBuildDrop(nodeId: string, side: 'left' | 'right') {
    if (!challenge || activeValue === undefined) return
    const parent = findNode(liveNodes, nodeId)
    if (!parent) return
    const correctSide: 'left' | 'right' = activeValue < parent.value ? 'left' : 'right'
    if (side !== correctSide) {
      wrong(`${activeValue} ${correctSide === 'left' ? 'is smaller than' : 'is greater than or equal to'} ${parent.value} — it belongs on the ${correctSide}.`)
      return
    }
    const newId = uid()
    const newNode: TNode = { id: newId, value: activeValue, left: null, right: null }
    const updated = liveNodes.map(n => n.id === nodeId
      ? { ...n, [side]: newId }
      : n)
    const nextNodes = [...updated, newNode]
    setLiveNodes(nextNodes)
    setOps(prev => prev + 1)
    sfx.place()
    const nextIndex = streamIndex + 1
    setStreamIndex(nextIndex)
    setDragValue(null)
    if (nextIndex >= (challenge.stream?.length ?? 0)) completeRound()
  }

  function handleRootDrop() {
    if (!challenge || activeValue === undefined || liveRootId !== null) return
    const newId = uid()
    setLiveNodes([{ id: newId, value: activeValue, left: null, right: null }])
    setLiveRootId(newId)
    setOps(prev => prev + 1)
    sfx.place()
    const nextIndex = streamIndex + 1
    setStreamIndex(nextIndex)
    setDragValue(null)
    if (nextIndex >= (challenge.stream?.length ?? 0)) completeRound()
  }

  /* ── traversal_trace: click nodes in order ── */
  function handleTraversalClick(nodeId: string) {
    if (!challenge?.expectedOrder) return
    const expectedNext = challenge.expectedOrder[clickedIds.length]
    if (nodeId !== expectedNext) {
      setWrongId(nodeId)
      wrong('Wrong order for this traversal type.')
      return
    }
    const nextClicked = [...clickedIds, nodeId]
    setClickedIds(nextClicked)
    setOps(prev => prev + 1)
    sfx.place()
    if (nextClicked.length >= challenge.expectedOrder.length) completeRound()
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LOBBY
  ════════════════════════════════════════════════════════════════════════ */
  if (phase === 'lobby') {
    return (
      <div className="tb-page">
        <div className="tb-grid-bg" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button className="tb-back-btn" style={{ marginBottom: 0 }} onClick={() => navigate('/student/games')}>
            <ArrowLeft size={15} /> Back
          </button>
          <button className="tb-sfx-toggle" onClick={toggleSfx} title={sfxMuted ? 'Unmute sound' : 'Mute sound'}>
            {sfxMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
        <section className="tb-lobby">
          <motion.div className="tb-logo-tree" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>
            <GitBranch size={40} color={ACCENT} />
          </motion.div>
          <h1>TREE BUILDER</h1>
          <p className="tb-lobby-sub">MODULE 05 · TREES</p>
          <p className="tb-lobby-desc">
            No step-by-step recipes. Insert by comparison, trace traversals, compute height
            and balance, and fix AVL violations — using your own understanding of tree rules.
          </p>

          <div className="tb-selector">
            <button className={mode === 'solo' ? 'active' : ''} onClick={() => setMode('solo')}>
              <Zap size={18} /> Solo
            </button>
            <button className={mode === 'multiplayer' ? 'active' : ''} onClick={() => setMode('multiplayer')}>
              <Users size={18} /> Multiplayer
            </button>
          </div>

          <div className="tb-diff-grid">
            {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG.easy][]).map(([key, d]) => (
              <button
                key={key}
                className={difficulty === key ? 'active' : ''}
                style={{ '--diff-color': d.color } as React.CSSProperties}
                onClick={() => setDifficulty(key)}
              >
                <strong>{d.label}</strong>
                <span>{d.desc}</span>
                <small>{d.time}s · max {d.maxSize}</small>
              </button>
            ))}
          </div>

          <motion.button className="tb-start-btn" onClick={startGame} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Flame size={20} /> Start Building
          </motion.button>
        </section>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RESULT
  ════════════════════════════════════════════════════════════════════════ */
  if (phase === 'result') {
    const accuracy = Math.round((correct / TOTAL_ROUNDS) * 100)
    const rank     = accuracy >= 80 ? 'S' : accuracy >= 60 ? 'A' : accuracy >= 40 ? 'B' : 'C'
    const ranked   = mode === 'multiplayer'
      ? [{ name: 'You', ops, isMe: true }, ...opponents.map(o => ({ ...o, isMe: false }))].sort((a, b) => a.ops - b.ops)
      : []
    return (
      <div className="tb-page tb-page--result">
        <div className="tb-grid-bg" />
        <div className="tb-result">
          <div className="tb-result-rank">{rank}</div>
          <p className="tb-result-label">TOTAL XP</p>
          <h2><CountUp target={score} /></h2>
          <div className="tb-result-stats">
            <span><CheckCircle size={14} /> {correct}/{TOTAL_ROUNDS}</span>
            <span><Swords size={14} /> {ops} ops</span>
            <span><Zap size={14} /> {accuracy}%</span>
          </div>
          {badges.length > 0 && (
            <div className="tb-badges">
              {badges.map(b => <span key={b}>{b}</span>)}
            </div>
          )}
          {ranked.length > 0 && (
            <div className="tb-race-results">
              {ranked.map((p, i) => (
                <div key={p.name} className={p.isMe ? 'me' : ''}>
                  <b>#{i + 1}</b><span>{p.name}</span><em>{p.ops} ops</em>
                </div>
              ))}
            </div>
          )}
          <div className="tb-result-actions">
            <button onClick={() => setPhase('lobby')}><RotateCcw size={15} /> Play Again</button>
            <button className="primary" onClick={() => navigate('/student/games')}>Games Lobby</button>
          </div>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PLAYING
  ════════════════════════════════════════════════════════════════════════ */

  const isMC      = challenge && ['scenario_insert', 'identify_traversal', 'predict_search', 'spot_violation', 'height_balance', 'avl_rotation'].includes(challenge.type)
  const isBuild   = challenge?.type === 'build_bst'
  const isClickTraversal = challenge?.type === 'traversal_trace'

  return (
    <div className={`tb-page tb-page--playing ${shake ? 'tb-shake' : ''}`}>
      <div className="tb-grid-bg" />

      {/* HUD */}
      <div className="tb-hud">
        <button className="tb-back-btn" onClick={() => { gameMusic.stop(); setPhase('lobby') }}><ArrowLeft size={14} /></button>
        <div className="tb-score"><Zap size={14} /> {score.toLocaleString()}</div>
        <div className="tb-rounds">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <span key={i} className={i < round ? 'done' : i === round ? 'active' : ''} />
          ))}
        </div>
        <button className="tb-sfx-toggle" onClick={toggleSfx} title={sfxMuted ? 'Unmute sound' : 'Mute sound'}>
          {sfxMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
        <span className="tb-pill" style={{ color: cfg.color, borderColor: `${cfg.color}55` }}>{cfg.label}</span>
        {combo >= 2 && <span className="tb-pill tb-combo">×{combo}</span>}
        {mode === 'multiplayer' && <span className="tb-pill"><Users size={11} /> Race</span>}
      </div>

      <main className={`tb-arena ${shake ? 'tb-arena--shake' : ''}`}>
        <TimerBar key={`${round}-${challenge?.type}`} seconds={challenge?.timeLimit ?? cfg.time} onExpire={expireRound} />

        {/* Instruction */}
        <div className="tb-instruction">
          <span>{challenge?.title ?? ''}</span>
          <p>{challenge?.scenario ?? ''}</p>
          <button className="tb-hint-btn" onClick={useHint} disabled={hintUsed}>
            <HelpCircle size={13} /> {hintUsed ? 'Hint used' : 'Hint (−35 pts)'}
          </button>
          {hintVisible && <p className="tb-hint">{hintText}</p>}
          {wrongMsg && (
            <p className="tb-expected"><AlertTriangle size={12} /> {wrongMsg}</p>
          )}
        </div>

        {/* Feedback overlay */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              className={`tb-feedback ${feedback}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              {feedback === 'correct' ? <CheckCircle size={22} /> : <Trash2 size={22} />}
              {feedback === 'correct' ? 'Correct!' : 'Wrong'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating scores */}
        <div className="tb-floating-wrap" aria-hidden>
          <AnimatePresence>
            {floatingScores.map(f => (
              <motion.span
                key={f.id}
                className={f.value > 0 ? 'pos' : 'neg'}
                style={{ left: `${f.x}%` }}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -52 }}
                exit={{ opacity: 0 }}
              >
                {f.value > 0 ? `+${f.value}` : f.value}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        {/* ── Multiple-choice layout (shows the tree where one exists) ── */}
        {isMC && (
          <div className="tb-mc-area">
            {challenge!.nodes.length > 0 && (
              <div className="tb-mc-tree">
                <span className="tb-panel-label">TREE</span>
                <TreeCanvas nodes={challenge!.nodes} rootId={challenge!.rootId} />
              </div>
            )}
            <div className="tb-mc-question">
              <span className="tb-panel-label">YOUR ANSWER</span>
              <MCGrid
                options={challenge!.mcOptions!}
                onPick={handleMC}
                locked={mcLocked}
              />
            </div>
          </div>
        )}

        {/* ── build_bst layout ── */}
        {isBuild && (
          <div className="tb-build-area">
            <section className="tb-panel">
              <span className="tb-panel-label">ARRIVALS</span>
              <div className="tb-reveal">
                <span className="tb-panel-label">CURRENT VALUE</span>
                <AnimatePresence mode="wait">
                  {activeValue !== undefined ? (
                    <motion.div
                      key={streamIndex}
                      className="tb-reveal-token"
                      initial={{ x: 24, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -24, opacity: 0 }}
                      draggable
                      onDragStart={((e: React.DragEvent<HTMLDivElement>) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(activeValue)); sfx.pick(); setDragValue(activeValue) }) as any}
                    >
                      {activeValue}
                    </motion.div>
                  ) : (
                    <motion.div key="done" className="tb-reveal-token done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      ✓ all placed
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="tb-stream">
                  {(challenge!.stream ?? []).map((v, i) => (
                    <span key={`${v}-${i}`} className={i < streamIndex ? 'done' : i === streamIndex ? 'active' : ''}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <div className="tb-tree-col">
              {liveNodes.length === 0 ? (
                <div
                  className="tb-root-drop"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleRootDrop() }}
                >
                  Drop here to set ROOT
                </div>
              ) : (
                <TreeCanvas
                  nodes={liveNodes}
                  rootId={liveRootId}
                  dropTargets={getDropTargets()}
                  onDropAt={handleBuildDrop}
                />
              )}
            </div>
          </div>
        )}

        {/* ── traversal_trace layout ── */}
        {isClickTraversal && (
          <div className="tb-trace-area">
            <span className="tb-panel-label">CLICK NODES IN {challenge!.traversalKind?.toUpperCase()} ORDER</span>
            <TreeCanvas
              nodes={liveNodes}
              rootId={liveRootId}
              clickedIds={clickedIds}
              wrongId={wrongId}
              onNodeClick={handleTraversalClick}
            />
            <div className="tb-output">
              {clickedIds.map(id => findNode(liveNodes, id)?.value).join(' → ') || '...'}
            </div>
          </div>
        )}

        {/* Multiplayer race */}
        {mode === 'multiplayer' && (
          <div className="tb-mp">
            <span><Swords size={12} /> Live ops race</span>
            {[{ name: 'You', ops }, ...opponents].map(p => (
              <div key={p.name}><b>{p.name}</b><em>{p.ops} ops</em></div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
