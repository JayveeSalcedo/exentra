import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Zap, Timer, Star, CheckCircle,
  User, Users, HelpCircle, RotateCcw, ChevronRight, Swords, Link, Volume2, VolumeX,
} from 'lucide-react'
import { useAuth } from '../../../store/AuthContext'
import { sfx, gameMusic, useSfxToggle } from '../../../lib/sfx'
import { saveGameSession } from '../../../lib/gameSessions'
import { useMultiplayerRoom } from '../../../lib/multiplayer'
import { SeededRandom } from '../../../lib/seededRandom'
import './NodeConnect.css'

// ─── Types ───────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type Mode = 'solo' | 'multiplayer'
type Phase = 'lobby' | 'playing' | 'result'
type ListType = 'singly' | 'doubly'
type PowerupId = 'time_cache' | 'score_surge' | 'free_hint'
type ChallengeKind = 'fix' | 'reverse' | 'splice' | 'delete'
type PointerField = 'next' | 'prev'

const NULL_ID = 'NULL' // sentinel pseudo-node id representing "points to nothing"

interface LLNode { id: string; value: string | number; next: string; prev: string }

interface PointerTask {
  id: string           // `${nodeId}:${field}`
  nodeId: string
  field: PointerField
  correctTargetId: string  // node id, or NULL_ID
}

interface Challenge {
  kind: ChallengeKind
  listType: ListType
  nodes: LLNode[]
  tasks: PointerTask[]
  floatingNodeId?: string
  deleteTargetId?: string
  instruction: string
  timeLimit: number
}

interface FloatingScore { id: string; value: number; x: number }
interface NodeRect { id: string; x: number; y: number; w: number; h: number }
interface RunMission { id: string; label: string; target: number; reward: number }
interface Powerup { id: PowerupId; label: string; desc: string }
interface Point { x: number; y: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFF_CONFIG: Record<Difficulty, { size: [number, number]; time: number; label: string; color: string; icon: string; desc: string }> = {
  easy:   { size: [3, 5], time: 35, label: 'Easy',   color: '#00D4AA', icon: '🟢', desc: 'Fix one broken pointer' },
  medium: { size: [4, 6], time: 50, label: 'Medium', color: '#9B7ED4', icon: '🟣', desc: 'Splice nodes, 2 breaks' },
  hard:   { size: [5, 7], time: 65, label: 'Hard',   color: '#FFB830', icon: '🟡', desc: 'Delete nodes, reverse chains' },
  expert: { size: [6, 8], time: 90, label: 'Expert', color: '#FF6B8A', icon: '🔴', desc: 'Doubly-linked, multi-break' },
}
const KIND_BY_DIFF: Record<Difficulty, ChallengeKind[]> = {
  easy:   ['fix'],
  medium: ['fix', 'splice'],
  hard:   ['delete', 'reverse', 'splice'],
  expert: ['delete', 'reverse', 'fix', 'splice'],
}
const POINT_WRONG = -25, POINT_HINT = -30, POINT_SPEED = 50, POINT_TASK = 100, TOTAL_ROUNDS = 5, BOSS_BONUS = 150
const RUN_MISSIONS: RunMission[] = [
  { id: 'streak-3', label: 'Land a 3-round streak',   target: 3, reward: 250 },
  { id: 'no-hints', label: 'Finish with no hints',    target: 0, reward: 200 },
  { id: 'perfect-4', label: 'Solve 4 rounds',         target: 4, reward: 300 },
]
const POWERUPS: Powerup[] = [
  { id: 'time_cache',  label: 'Time Cache',  desc: '+10 seconds on this round' },
  { id: 'score_surge', label: 'Score Surge', desc: 'Double your next round score' },
  { id: 'free_hint',   label: 'Free Hint',   desc: 'Reveal the next pointer, no XP cost' },
]
const FAKE_OPPONENTS = [
  { id: 'bot1', name: 'Alex [AI]', color: '#9B7ED4' },
  { id: 'bot2', name: 'Sam [AI]',  color: '#FFB830' },
  { id: 'bot3', name: 'Rea [AI]',  color: '#FF6B8A' },
]
const WORDS = ['ant','bee','cat','dew','elk','fog','gnu','hex','ivy','jar','koi','log','mop','nib','orb','paw','rye','sap','tin','urn','vex','wax','yew','zen']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rnd(min: number, max: number, rng?: SeededRandom) { return rng ? rng.int(min, max) : Math.floor(Math.random() * (max - min + 1)) + min }
function uid() { return Math.random().toString(36).slice(2, 7) }
function rndVal(rng?: SeededRandom): string | number {
  const isNum = rng ? rng.bool(0.55) : Math.random() > 0.45
  return isNum ? rnd(1, 99, rng) : WORDS[rnd(0, WORDS.length - 1, rng)]
}
function shuffleArr<T>(arr: T[], rng?: SeededRandom): T[] {
  if (rng) return rng.shuffle(arr)
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

function makeChain(size: number, listType: ListType, rng?: SeededRandom): LLNode[] {
  const nodes: LLNode[] = Array.from({ length: size }, () => ({ id: uid(), value: rndVal(rng), next: NULL_ID, prev: NULL_ID }))
  for (let i = 0; i < nodes.length - 1; i++) {
    nodes[i].next = nodes[i + 1].id
    if (listType === 'doubly') nodes[i + 1].prev = nodes[i].id
  }
  return nodes
}

function mirrorPrevTasks(tasks: PointerTask[]): PointerTask[] {
  const extra: PointerTask[] = []
  tasks.forEach(t => {
    if (t.field === 'next' && t.correctTargetId !== NULL_ID) {
      extra.push({ id: `${t.correctTargetId}:prev`, nodeId: t.correctTargetId, field: 'prev', correctTargetId: t.nodeId })
    }
  })
  return [...tasks, ...extra]
}

function pickKind(difficulty: Difficulty, bossRound: boolean, rng?: SeededRandom): ChallengeKind {
  if (bossRound) return 'fix'
  const pool = KIND_BY_DIFF[difficulty]
  return pool[rnd(0, pool.length - 1, rng)]
}
function pickListType(kind: ChallengeKind, difficulty: Difficulty, bossRound: boolean): ListType {
  if (kind === 'reverse') return 'singly'
  if (bossRound) return 'doubly'
  return (difficulty === 'hard' || difficulty === 'expert') ? 'doubly' : 'singly'
}
function breakCountFor(difficulty: Difficulty, bossRound: boolean): number {
  if (bossRound) return 3
  if (difficulty === 'expert' || difficulty === 'medium') return 2
  return 1
}

function generateChallenge(difficulty: Difficulty, bossRound = false, rng?: SeededRandom): Challenge {
  const cfg = DIFF_CONFIG[difficulty]
  const size = rnd(cfg.size[0], cfg.size[1], rng)
  const kind = pickKind(difficulty, bossRound, rng)
  const listType = pickListType(kind, difficulty, bossRound)
  let nodes = makeChain(size, listType, rng)
  const prefix = bossRound ? 'FINAL BOSS: ' : ''
  let tasks: PointerTask[] = []
  let floatingNodeId: string | undefined
  let deleteTargetId: string | undefined
  let instruction = ''

  if (kind === 'fix') {
    const breakCount = Math.min(breakCountFor(difficulty, bossRound), size - 1)
    const brokenIdxs = shuffleArr(Array.from({ length: size - 1 }, (_, i) => i), rng).slice(0, breakCount)
    nodes = nodes.map((n, i) => {
      if (!brokenIdxs.includes(i)) return n
      let wrongIdx: number
      do { wrongIdx = rnd(0, size - 1, rng) } while (wrongIdx === i + 1 || wrongIdx === i)
      return { ...n, next: nodes[wrongIdx].id }
    })
    tasks = brokenIdxs.map(i => ({ id: `${nodes[i].id}:next`, nodeId: nodes[i].id, field: 'next' as const, correctTargetId: nodes[i + 1].id }))
    if (listType === 'doubly') tasks = mirrorPrevTasks(tasks)
    instruction = brokenIdxs.length > 1
      ? `${prefix}${brokenIdxs.length} pointers are corrupted — drag each to its correct target before the chain breaks`
      : `${prefix}Drag the broken pointer from "${nodes[brokenIdxs[0]].value}" to its correct next node`
  }

  if (kind === 'reverse') {
    for (let i = size - 1; i >= 0; i--) {
      const correctTarget = i === 0 ? NULL_ID : nodes[i - 1].id
      tasks.push({ id: `${nodes[i].id}:next`, nodeId: nodes[i].id, field: 'next', correctTargetId: correctTarget })
    }
    instruction = `${prefix}Reverse the list: drag every pointer to face backward, tail → head`
  }

  if (kind === 'splice') {
    const idx = rnd(1, size - 1, rng)
    const floating: LLNode = { id: uid(), value: rndVal(rng), next: NULL_ID, prev: NULL_ID }
    floatingNodeId = floating.id
    tasks = [
      { id: `${nodes[idx - 1].id}:next`, nodeId: nodes[idx - 1].id, field: 'next', correctTargetId: floating.id },
      { id: `${floating.id}:next`, nodeId: floating.id, field: 'next', correctTargetId: nodes[idx].id },
    ]
    if (listType === 'doubly') {
      tasks.push({ id: `${floating.id}:prev`, nodeId: floating.id, field: 'prev', correctTargetId: nodes[idx - 1].id })
      tasks.push({ id: `${nodes[idx].id}:prev`, nodeId: nodes[idx].id, field: 'prev', correctTargetId: floating.id })
    }
    const insertAfterVal = nodes[idx - 1].value, insertBeforeVal = nodes[idx].value
    nodes = [...nodes, floating]
    instruction = `${prefix}Splice "${floating.value}" between "${insertAfterVal}" and "${insertBeforeVal}" — drag its pointer(s) into place`
  }

  if (kind === 'delete') {
    const idx = rnd(1, size - 2, rng)
    deleteTargetId = nodes[idx].id
    const afterId = idx + 1 < size ? nodes[idx + 1].id : NULL_ID
    tasks = [{ id: `${nodes[idx - 1].id}:next`, nodeId: nodes[idx - 1].id, field: 'next', correctTargetId: afterId }]
    if (listType === 'doubly' && afterId !== NULL_ID) {
      tasks.push({ id: `${afterId}:prev`, nodeId: afterId, field: 'prev', correctTargetId: nodes[idx - 1].id })
    }
    instruction = `${prefix}Delete "${nodes[idx].value}" — drag "${nodes[idx - 1].value}"'s pointer to skip over it`
  }

  return { kind, listType, nodes, tasks, floatingNodeId, deleteTargetId, instruction, timeLimit: cfg.time }
}

// ─── SVG Arrow Layer ──────────────────────────────────────────────────────────

function ArrowHead({ x2, y2, mx, my, color }: { x2: number; y2: number; mx: number; my: number; color: string }) {
  const dx = x2 - mx, dy = y2 - my, len = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = dx / len, ny = dy / len, size = 7, px = -ny, py = nx
  const tip = { x: x2, y: y2 }
  const left = { x: x2 - nx * size + px * (size / 2), y: y2 - ny * size + py * (size / 2) }
  const right = { x: x2 - nx * size - px * (size / 2), y: y2 - ny * size - py * (size / 2) }
  return <polygon points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`} fill={color} style={{ transition: 'fill 0.3s' }} />
}

function ArrowLayer({
  nodes, rects, listType, pointerState, completedTaskIds, wrongPulse, dragArrowFrom, dragArrowTo, hintTask, ready,
}: {
  nodes: LLNode[]; rects: NodeRect[]; listType: ListType
  pointerState: Record<string, { next: string; prev: string }>
  completedTaskIds: Set<string>
  wrongPulse: { from: Point; to: Point } | null
  dragArrowFrom: Point | null; dragArrowTo: Point | null
  hintTask: PointerTask | null
  ready: boolean
}) {
  const getRect = (id: string) => rects.find(r => r.id === id)
  if (!ready) return null

  function drawArrow(fromId: string, toId: string, field: PointerField, curveDir: 1 | -1) {
    const from = getRect(fromId); const to = getRect(toId)
    if (!from || !to) return null
    const isDone = completedTaskIds.has(`${fromId}:${field}`)
    const isHint = hintTask?.nodeId === fromId && hintTask.field === field
    const x1 = field === 'next' ? from.x + from.w : from.x
    const y1 = from.y + from.h / 2
    const x2 = field === 'next' ? to.x : to.x + to.w
    const y2 = to.y + to.h / 2
    const mx = (x1 + x2) / 2
    const my = (Math.min(y1, y2)) + curveDir * -28
    const color = isDone ? (field === 'next' ? '#00D4AA' : '#9B7ED4') : isHint ? '#FFB830' : 'rgba(255,255,255,0.18)'
    const d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`
    return (
      <g key={`${fromId}-${field}`}>
        <path d={d} stroke={color} strokeWidth={isDone ? 2 : 1.5} fill="none" style={{ transition: 'stroke 0.3s' }} />
        <ArrowHead x2={x2} y2={y2} mx={mx} my={my} color={color} />
      </g>
    )
  }

  return (
    <svg className="nc-svg-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 2 }}>
      {nodes.map(node => {
        const state = pointerState[node.id]
        if (!state || state.next === NULL_ID) return null
        return drawArrow(node.id, state.next, 'next', 1)
      })}
      {listType === 'doubly' && nodes.map(node => {
        const state = pointerState[node.id]
        if (!state || state.prev === NULL_ID) return null
        return drawArrow(node.id, state.prev, 'prev', -1)
      })}

      {wrongPulse && (
        <g style={{ opacity: 0.85 }}>
          <path d={`M ${wrongPulse.from.x} ${wrongPulse.from.y} L ${wrongPulse.to.x} ${wrongPulse.to.y}`}
            stroke="#FF6B8A" strokeWidth={2} strokeDasharray="4 3" fill="none"
            style={{ filter: 'drop-shadow(0 0 6px #FF6B8A)' }} />
          <circle cx={wrongPulse.to.x} cy={wrongPulse.to.y} r={4} fill="#FF6B8A" />
        </g>
      )}

      {dragArrowFrom && dragArrowTo && (
        <g>
          <path
            d={`M ${dragArrowFrom.x} ${dragArrowFrom.y} Q ${(dragArrowFrom.x + dragArrowTo.x) / 2} ${Math.min(dragArrowFrom.y, dragArrowTo.y) - 40} ${dragArrowTo.x} ${dragArrowTo.y}`}
            stroke="#c4a8ff" strokeWidth={2.5} fill="none" strokeDasharray="6 3"
            style={{ filter: 'drop-shadow(0 0 6px #9B7ED4)' }} />
          <circle cx={dragArrowTo.x} cy={dragArrowTo.y} r={5} fill="#c4a8ff" style={{ filter: 'drop-shadow(0 0 6px #9B7ED4)' }} />
        </g>
      )}
    </svg>
  )
}

// ─── PointerHandle ────────────────────────────────────────────────────────────
// The one interaction the whole game runs on: grab a node's pointer and drag it
// to where it should actually point. Wrong drops don't stick — the pointer just
// snaps back, shown briefly as a dangling red line, not a quiz "WRONG" stamp.

function PointerHandle({
  task, rect, isHint, onResolve, onDragMove,
}: {
  task: PointerTask
  rect: NodeRect | undefined
  isHint: boolean
  onResolve: (task: PointerTask, droppedId: string | undefined, origin: Point, point: Point) => void
  onDragMove: (from: Point | null, to: Point | null) => void
}) {
  const [dragging, setDragging] = useState(false)
  if (!rect) return null

  const handleX = task.field === 'next' ? rect.x + rect.w - 18 : rect.x + 18
  const handleY = rect.y + rect.h / 2
  const origin = { x: handleX, y: handleY }

  return (
    <motion.div
      className={`nc-fix-handle ${isHint ? 'nc-fix-handle--hint' : ''}`}
      style={{ position: 'absolute', left: handleX - 24, top: handleY - 18, zIndex: 20, touchAction: 'none' }}
      drag dragSnapToOrigin dragElastic={0.1}
      onDragStart={() => { sfx.pick(); setDragging(true) }}
      onDrag={(_, info) => {
        const arena = document.querySelector('.nc-arena')
        if (!arena) return
        const ar = arena.getBoundingClientRect()
        onDragMove(origin, { x: info.point.x - ar.left, y: info.point.y - ar.top })
      }}
      onDragEnd={(_, info) => {
        setDragging(false)
        onDragMove(null, null)
        const targets = document.querySelectorAll('[data-node-id],[data-null-zone]')
        let hitId: string | undefined
        targets.forEach(el => {
          const r = el.getBoundingClientRect()
          const pad = 28
          if (info.point.x >= r.left - pad && info.point.x <= r.right + pad && info.point.y >= r.top - pad && info.point.y <= r.bottom + pad) {
            hitId = (el as HTMLElement).dataset.nodeId ?? NULL_ID
          }
        })
        const arena = document.querySelector('.nc-arena')
        const ar = arena?.getBoundingClientRect()
        const point = ar ? { x: info.point.x - ar.left, y: info.point.y - ar.top } : { x: 0, y: 0 }
        onResolve(task, hitId, origin, point)
      }}
      whileHover={{ scale: 1.06 }}
    >
      <div className={`nc-fix-dot ${dragging ? 'dragging' : ''} ${isHint ? 'nc-fix-dot--hint' : ''}`}>
        <span>{task.field === 'next' ? '→' : '←'}</span>
      </div>
      {!dragging && <div className="nc-fix-hint">drag</div>}
    </motion.div>
  )
}

// ─── LLNodeBox ────────────────────────────────────────────────────────────────

function LLNodeBox({
  node, listType, isHead, isTail, isFloating, isOrphaned, onRef,
}: {
  node: LLNode; listType: ListType
  isHead: boolean; isTail: boolean; isFloating?: boolean; isOrphaned?: boolean
  onRef: (id: string, el: HTMLDivElement | null) => void
}) {
  return (
    <motion.div className="nc-node-wrap"
      initial={isFloating ? { opacity: 0, y: -10 } : false}
      animate={isOrphaned ? { opacity: 0, y: 16, scale: 0.85 } : { opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: isOrphaned ? 0.5 : 0.3 }}
    >
      {isHead && !isFloating && <div className="nc-head-label nc-head-label--inline">HEAD</div>}
      {isTail && !isFloating && <div className="nc-tail-label nc-tail-label--inline">TAIL</div>}
      {isFloating && <div className="nc-head-label nc-head-label--inline nc-floating-badge">NEW</div>}
      <motion.div
        ref={el => onRef(node.id, el)}
        data-node-id={node.id}
        className={`nc-node nc-node--idle ${isFloating ? 'nc-node--floating' : ''} ${isOrphaned ? 'nc-node--orphaned' : ''}`}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      >
        {listType === 'doubly' && <div className="nc-node-prev">←</div>}
        <div className="nc-node-value">{String(node.value)}</div>
        <div className="nc-node-next">→</div>
      </motion.div>
    </motion.div>
  )
}

// ─── TimerBar ─────────────────────────────────────────────────────────────────
// Solve-fast bonus window only — never force-ends the round. See ArrayBlitz for
// the same house rule; forcing a round to end mid-drag punishes thinking, not skill.

function TimerBar({ timeLimit, onWindowClosed }: { timeLimit: number; onWindowClosed?: () => void }) {
  const [remaining, setRemaining] = useState(timeLimit)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  const urgent = remaining > 0 && remaining <= 5
  const expired = remaining <= 0
  useEffect(() => {
    setRemaining(timeLimit)
    ref.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(ref.current!); onWindowClosed?.(); return 0 }
        if (prev - 1 <= 5) sfx.tick()
        return prev - 1
      })
    }, 1000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [timeLimit])
  const pct = (remaining / timeLimit) * 100
  const color = expired ? 'rgba(255,255,255,0.25)' : pct > 50 ? '#9B7ED4' : pct > 25 ? '#FFB830' : '#FF6B8A'
  return (
    <div className={`nc-timer-wrap ${urgent ? 'nc-timer--urgent' : ''}`}>
      <Timer size={14} color={color} />
      <div className="nc-timer-track">
        <motion.div className="nc-timer-fill" style={{ background: color }}
          animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'linear' }} />
      </div>
      <motion.span className="nc-timer-num" style={{ color }}
        animate={urgent ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={urgent ? { repeat: Infinity, duration: 0.5 } : {}}>
        {expired ? 'bonus closed' : `${remaining}s`}
      </motion.span>
    </div>
  )
}

function CountUp({ target }: { target: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let v = 0; const inc = target / 40
    const t = setInterval(() => {
      v += inc
      if (v >= target) { setDisplay(target); clearInterval(t) }
      else setDisplay(Math.floor(v))
    }, 30)
    return () => clearInterval(t)
  }, [target])
  return <>{display.toLocaleString()}</>
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function NodeConnect() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Player'
  const avatarColor = '#9B7ED4'
  const mp = useMultiplayerRoom('node_connect', user?.id, displayName, avatarColor)
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const seededRngRef = useRef<SeededRandom | null>(null)

  const [phase, setPhase] = useState<Phase>('lobby')
  const [mode, setMode] = useState<Mode>('solo')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')

  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [pointerState, setPointerState] = useState<Record<string, { next: string; prev: string }>>({})
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set())
  const [orphanedId, setOrphanedId] = useState<string | null>(null)

  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [totalQ, setTotalQ] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | null>(null)
  const [hintUsed, setHintUsed] = useState(false)
  const [hintTaskId, setHintTaskId] = useState<string | null>(null)
  const [roundStart, setRoundStart] = useState(Date.now())
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([])
  const [mission, setMission] = useState<RunMission>(RUN_MISSIONS[0])
  const [missionPaid, setMissionPaid] = useState(false)
  const [bestStreak, setBestStreak] = useState(0)
  const [hintsUsedCount, setHintsUsedCount] = useState(0)
  const [powerupChoices, setPowerupChoices] = useState<Powerup[]>([])
  const [doubleNext, setDoubleNext] = useState(false)
  const [bonusClosed, setBonusClosed] = useState(false)

  const [dragArrowFrom, setDragArrowFrom] = useState<Point | null>(null)
  const [dragArrowTo, setDragArrowTo] = useState<Point | null>(null)
  const [wrongPulse, setWrongPulse] = useState<{ from: Point; to: Point } | null>(null)

  const [nodeRects, setNodeRects] = useState<NodeRect[]>([])
  const nodeEls = useRef<Record<string, HTMLDivElement | null>>({})
  const arenaRef = useRef<HTMLDivElement>(null)

  const [opponentScores, setOpponentScores] = useState<Record<string, number>>({})
  const opTimers = useRef<ReturnType<typeof setInterval>[]>([])
  const sessionSaved = useRef(false)

  const { muted: sfxMuted, toggle: toggleSfx } = useSfxToggle()

  const isRealMultiplayer = mode === 'multiplayer' && mp.available

  useEffect(() => {
    if (mp.roomDifficulty) setDifficulty(mp.roomDifficulty as Difficulty)
  }, [mp.roomDifficulty])

  useEffect(() => {
    if (isRealMultiplayer && mp.status === 'playing' && mp.start && phase === 'lobby') {
      startGame(mp.start.seed)
    }
  }, [mp.status])

  useEffect(() => {
    return () => { if (mp.roomCode) mp.leaveRoom() }
  }, [])

  function selectMode(next: Mode) {
    if (next !== mode && mp.roomCode) mp.leaveRoom()
    setMode(next)
  }

  useEffect(() => {
    if (phase === 'result') {
      gameMusic.stop()
      const acc = totalQ > 0 ? correctCount / totalQ : 0
      if (acc >= 0.6) sfx.success()
      else sfx.needsWork()

      if (!sessionSaved.current && user?.id) {
        sessionSaved.current = true
        const rank = acc >= 0.9 ? 'S' : acc >= 0.75 ? 'A' : acc >= 0.6 ? 'B' : acc >= 0.4 ? 'C' : 'D'
        const sessionInput = {
          gameId: 'node_connect' as const,
          mode,
          difficulty,
          score,
          correct: correctCount,
          totalRounds: totalQ,
          bestCombo: bestStreak,
          rankLetter: rank,
          meta: {
            accuracy: acc,
            opponentScores: mode === 'multiplayer' && !isRealMultiplayer ? opponentScores : undefined,
          },
        }
        saveGameSession(user.id, sessionInput)
        if (isRealMultiplayer) mp.sendFinish(sessionInput)
      }
    }
  }, [phase])

  useEffect(() => () => { gameMusic.stop() }, [])

  const missionProgress = mission.id === 'streak-3'
    ? Math.min(bestStreak, mission.target)
    : mission.id === 'no-hints'
      ? hintsUsedCount
      : Math.min(correctCount, mission.target)

  useLayoutEffect(() => {
    if (phase !== 'playing') return
    function measure() {
      if (!arenaRef.current) return
      const ar = arenaRef.current.getBoundingClientRect()
      const rects: NodeRect[] = []
      Object.entries(nodeEls.current).forEach(([id, el]) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        rects.push({ id, x: r.left - ar.left, y: r.top - ar.top, w: r.width, h: r.height })
      })
      setNodeRects(rects)
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    const listEl = arenaRef.current?.querySelector('.nc-list-container')
    listEl?.addEventListener('scroll', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      listEl?.removeEventListener('scroll', measure)
    }
  }, [challenge, phase, orphanedId])

  function spawnFloating(value: number) {
    const id = uid()
    setFloatingScores(prev => [...prev, { id, value, x: rnd(25, 65) }])
    setTimeout(() => setFloatingScores(prev => prev.filter(f => f.id !== id)), 1000)
  }

  function startGame(seed?: string) {
    sfx.submit()
    gameMusic.play()
    sessionSaved.current = false
    seededRngRef.current = seed ? new SeededRandom(seed) : null
    setScore(0); setCombo(0); setTotalQ(0); setCorrectCount(0)
    setMission(RUN_MISSIONS[rnd(0, RUN_MISSIONS.length - 1)])
    setMissionPaid(false); setBestStreak(0); setHintsUsedCount(0)
    setPowerupChoices([]); setDoubleNext(false)
    if (mode === 'multiplayer' && !seed) {
      const init: Record<string, number> = {}
      FAKE_OPPONENTS.forEach(o => { init[o.id] = 0 })
      setOpponentScores(init)
    }
    loadNext(0); setPhase('playing')
  }

  const loadNext = useCallback((roundIndex = 0) => {
    const ch = generateChallenge(difficulty, roundIndex === TOTAL_ROUNDS - 1, seededRngRef.current ?? undefined)
    const initState: Record<string, { next: string; prev: string }> = {}
    ch.nodes.forEach(n => { initState[n.id] = { next: n.next, prev: n.prev } })
    setChallenge(ch)
    setPointerState(initState)
    setCompletedTaskIds(new Set())
    setOrphanedId(null)
    setHintUsed(false); setHintTaskId(null); setFeedback(null)
    setDragArrowFrom(null); setDragArrowTo(null); setWrongPulse(null); setBonusClosed(false)
    setRoundStart(Date.now()); nodeEls.current = {}
    const botPractice = mode === 'multiplayer' && !seededRngRef.current
    if (botPractice) {
      opTimers.current.forEach(clearInterval)
      opTimers.current = FAKE_OPPONENTS.map(op =>
        setInterval(() => {
          setOpponentScores(prev => ({ ...prev, [op.id]: prev[op.id] + rnd(8, 35) }))
        }, rnd(1800, 5000))
      )
    }
  }, [difficulty, mode])

  function offerPowerups(nextRound: number) {
    if (nextRound !== 2 || powerupChoices.length > 0) return
    setPowerupChoices([...POWERUPS].sort(() => Math.random() - 0.5).slice(0, 2))
  }

  function awardMissionIfComplete(nextRound: number, nextCorrect: number, nextBestStreak: number, nextHintsUsed: number) {
    if (missionPaid) return
    const complete =
      mission.id === 'streak-3' ? nextBestStreak >= mission.target :
      mission.id === 'no-hints' ? nextRound >= TOTAL_ROUNDS && nextHintsUsed === 0 :
      nextCorrect >= mission.target
    if (!complete) return
    setMissionPaid(true)
    setScore(s => s + mission.reward)
    spawnFloating(mission.reward)
  }

  function activatePowerup(powerup: Powerup) {
    sfx.powerup()
    if (powerup.id === 'time_cache' && challenge) setChallenge({ ...challenge, timeLimit: challenge.timeLimit + 10 })
    if (powerup.id === 'score_surge') setDoubleNext(true)
    if (powerup.id === 'free_hint') doHint(true)
    setPowerupChoices([])
  }

  function scoreCorrect() {
    if (!challenge) return
    const elapsed = (Date.now() - roundStart) / 1000
    const newCombo = combo + 1
    const mult = newCombo >= 3 ? 3 : newCombo >= 2 ? 2 : 1
    const speed = elapsed < challenge.timeLimit * 0.5 ? POINT_SPEED : 0
    const bossBonus = totalQ === TOTAL_ROUNDS - 1 ? BOSS_BONUS : 0
    const base = POINT_TASK * Math.max(1, challenge.tasks.length * 0.6) // multi-task rounds worth a bit more
    const gained = Math.round(((base + speed + bossBonus) * mult) * (doubleNext ? 2 : 1))
    const nextRound = totalQ + 1
    const nextCorrect = correctCount + 1
    const nextBestStreak = Math.max(bestStreak, newCombo)
    setScore(s => s + gained); setCombo(newCombo); setCorrectCount(c => c + 1)
    setDoubleNext(false); setBestStreak(nextBestStreak)
    setFeedback('correct'); setTotalQ(q => q + 1); spawnFloating(gained)
    sfx.success()
    if (isRealMultiplayer) mp.sendRoundDone(nextRound - 1, score + gained, true)
    offerPowerups(nextRound)
    awardMissionIfComplete(nextRound, nextCorrect, nextBestStreak, hintsUsedCount)
    opTimers.current.forEach(clearInterval)
    setTimeout(() => {
      if (nextRound >= TOTAL_ROUNDS) setPhase('result')
      else loadNext(nextRound)
    }, 1300)
  }

  function scoreWrong() {
    sfx.error()
    setScore(s => Math.max(0, s + POINT_WRONG)); setCombo(0)
    spawnFloating(POINT_WRONG)
  }

  function doHint(free = false) {
    if (hintUsed || !challenge) return
    const remaining = challenge.tasks.find(t => !completedTaskIds.has(t.id))
    if (!remaining) return
    setHintTaskId(remaining.id)
    setHintUsed(true); setHintsUsedCount(c => c + 1)
    sfx.hint()
    if (!free) { setScore(s => Math.max(0, s + POINT_HINT)); spawnFloating(POINT_HINT) }
  }

  // The one handler the whole game runs through: a pointer got dragged somewhere.
  function handleTaskResolve(task: PointerTask, droppedId: string | undefined, origin: Point, point: Point) {
    if (!challenge || feedback === 'correct') return

    if (droppedId !== undefined && droppedId === task.correctTargetId) {
      sfx.place()
      setPointerState(prev => ({ ...prev, [task.nodeId]: { ...prev[task.nodeId], [task.field]: droppedId } }))
      const next = new Set(completedTaskIds); next.add(task.id)
      setCompletedTaskIds(next)
      if (hintTaskId === task.id) setHintTaskId(null)

      if (challenge.kind === 'delete' && challenge.deleteTargetId && task.correctTargetId !== challenge.deleteTargetId) {
        // the deleted node is now unreferenced — let it drift away
        setTimeout(() => setOrphanedId(challenge.deleteTargetId!), 150)
      }
      if (next.size === challenge.tasks.length) {
        setTimeout(() => scoreCorrect(), challenge.kind === 'delete' ? 650 : 250)
      }
      return
    }

    // wrong drop — show it as a dangling/misconnected line for a beat, then let it go
    setWrongPulse({ from: origin, to: point })
    setTimeout(() => setWrongPulse(null), 550)
    scoreWrong()
  }

  // ─── LOBBY ──────────────────────────────────────────────────────────────

  if (phase === 'lobby') {
    return (
      <div className="nc-page">
        <div className="nc-grid-bg" />
        <div className="nc-lobby-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button className="nc-back-btn" style={{ marginBottom: 0 }} onClick={() => navigate('/student/games')}>
            <ArrowLeft size={15} /> Back
          </button>
          <button className="nc-sfx-toggle" onClick={toggleSfx} title={sfxMuted ? 'Unmute sound' : 'Mute sound'}>
            {sfxMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
        <div className="nc-lobby">
          <div className="nc-lobby-hero">
            <div className="nc-lobby-glow" />
            <motion.div className="nc-lobby-icon"
              animate={{ rotate: [0, 8, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}>
              🔗
            </motion.div>
            <h1 className="nc-lobby-title">NODE CONNECT</h1>
            <p className="nc-lobby-sub">MODULE 02 · LISTS & LINKED LISTS</p>
            <p className="nc-lobby-desc">
              Every round is a broken, reversed, or incomplete chain. Grab a pointer and drag it to
              where it actually belongs. Nothing here is a quiz — the pointer is the answer.
            </p>
          </div>

          <div className="nc-lobby-section">
            <p className="nc-section-label">// GAME MODE</p>
            <div className="nc-mode-row">
              <button className={`nc-mode-card ${mode === 'solo' ? 'active' : ''}`} onClick={() => selectMode('solo')}>
                <User size={22} /><span className="nc-mode-title">SOLO</span>
                <span className="nc-mode-sub">Practice at your own pace</span>
              </button>
              <button className={`nc-mode-card ${mode === 'multiplayer' ? 'active multi' : ''}`} onClick={() => selectMode('multiplayer')}>
                <Users size={22} /><span className="nc-mode-title">MULTIPLAYER</span>
                <span className="nc-mode-sub">{mp.available ? 'Race a real classmate' : 'Race against 3 AI bots'}</span>
                <span className="nc-mode-badge-bot">{mp.available ? 'Live rooms · no bots' : 'AI Bots · Live multiplayer server offline'}</span>
              </button>
            </div>
          </div>

          {(!isRealMultiplayer || mp.status === 'idle' || mp.status === 'error') && (
            <div className="nc-lobby-section">
              <p className="nc-section-label">// DIFFICULTY</p>
              <div className="nc-diff-row">
                {(Object.entries(DIFF_CONFIG) as [Difficulty, typeof DIFF_CONFIG['easy']][]).map(([d, cfg]) => (
                  <button key={d}
                    className={`nc-diff-card ${difficulty === d ? 'active' : ''}`}
                    style={difficulty === d ? { borderColor: cfg.color, boxShadow: `0 0 20px ${cfg.color}30` } : {}}
                    onClick={() => setDifficulty(d)}>
                    <span className="nc-diff-icon">{cfg.icon}</span>
                    <span className="nc-diff-name" style={difficulty === d ? { color: cfg.color } : {}}>{cfg.label}</span>
                    <span className="nc-diff-desc">{cfg.desc}</span>
                    <div className="nc-diff-meta">
                      <span>{cfg.size[0]}–{cfg.size[1]} nodes</span>
                      <span style={{ color: cfg.color }}>{cfg.time}s</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isRealMultiplayer && (
            <motion.button className="nc-start-btn" onClick={() => startGame()}
              whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(155,126,212,0.5)' }}
              whileTap={{ scale: 0.97 }}>
              <Link size={18} /> START GAME
              <span className="nc-start-rounds">{TOTAL_ROUNDS} ROUNDS</span>
            </motion.button>
          )}

          {isRealMultiplayer && mp.status === 'idle' && (
            <div className="nc-lobby-section">
              <p className="nc-section-label">// MULTIPLAYER ROOM</p>
              <div className="nc-mp-room-actions">
                <motion.button className="nc-start-btn" onClick={() => { sfx.submit(); mp.createRoom(difficulty) }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Users size={18} /> CREATE ROOM
                </motion.button>
                <div className="nc-mp-join-row">
                  <input className="nc-mp-code-input" placeholder="ROOM CODE" maxLength={5}
                    value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} />
                  <button className="nc-result-btn secondary" disabled={roomCodeInput.length < 5}
                    onClick={() => { sfx.submit(); mp.joinRoom(roomCodeInput) }}>
                    Join Room
                  </button>
                </div>
              </div>
            </div>
          )}

          {isRealMultiplayer && mp.status === 'error' && (
            <div className="nc-lobby-section">
              <p className="nc-run-reward" style={{ color: '#FF6B8A' }}>{mp.errorMessage}</p>
              <div className="nc-mp-join-row">
                <input className="nc-mp-code-input" placeholder="ROOM CODE" maxLength={5}
                  value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} />
                <button className="nc-result-btn secondary" disabled={roomCodeInput.length < 5}
                  onClick={() => mp.joinRoom(roomCodeInput)}>Try Again</button>
              </div>
            </div>
          )}

          {isRealMultiplayer && mp.status === 'lobby' && (
            <div className="nc-lobby-section">
              <p className="nc-section-label">// ROOM {mp.roomCode}</p>
              <p className="nc-lobby-desc">
                Share this code with a classmate. Waiting for {Math.max(0, mp.minPlayers - mp.players.length)} more player(s) — no bots, real race only.
              </p>
              <div className="nc-mp-room-players">
                {mp.players.map(p => (
                  <div key={p.userId} className="nc-mp-row">
                    <div className="nc-mp-avatar" style={{ background: `${p.avatarColor}20`, borderColor: p.avatarColor }}>
                      {p.name.charAt(0)}
                    </div>
                    <span className="nc-mp-name">{p.name}{p.userId === user?.id ? ' (You)' : ''}</span>
                    <span className="nc-diff-pill" style={p.ready ? { color: '#00D4AA', borderColor: '#00D4AA50', background: '#00D4AA10' } : {}}>
                      {p.ready ? 'READY' : 'NOT READY'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="nc-mp-room-actions">
                <motion.button className="nc-start-btn" disabled={!!mp.players.find(p => p.userId === user?.id)?.ready}
                  onClick={() => { sfx.submit(); mp.setReady() }}>
                  <CheckCircle size={18} /> {mp.players.find(p => p.userId === user?.id)?.ready ? 'WAITING FOR OTHERS' : 'READY UP'}
                </motion.button>
                <button className="nc-result-btn secondary" onClick={() => mp.leaveRoom()}>Leave Room</button>
              </div>
            </div>
          )}

          {isRealMultiplayer && mp.status === 'starting' && (
            <div className="nc-lobby-section">
              <p className="nc-lobby-title" style={{ fontSize: '1.4rem' }}>STARTING…</p>
              <p className="nc-lobby-desc">Everyone's ready. Get set!</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── RESULT ─────────────────────────────────────────────────────────────

  if (phase === 'result') {
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0
    const rank = accuracy >= 90 ? 'S' : accuracy >= 75 ? 'A' : accuracy >= 60 ? 'B' : accuracy >= 40 ? 'C' : 'D'
    const rankColor = { S: '#FFB830', A: '#00D4AA', B: '#9B7ED4', C: '#63B3ED', D: '#FF6B8A' }[rank]
    const allScores = mode === 'multiplayer'
      ? (isRealMultiplayer
          ? (mp.results ? mp.results.map(r => ({ name: r.name, score: r.score, isMe: r.userId === user?.id, color: r.userId === user?.id ? '#9B7ED4' : '#63B3ED' })) : null)
          : [
              { name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'You', score, isMe: true, color: '#9B7ED4' },
              ...FAKE_OPPONENTS.map(o => ({ name: o.name, score: opponentScores[o.id] ?? 0, isMe: false, color: o.color })),
            ].sort((a, b) => b.score - a.score))
      : null
    const waitingForOpponents = isRealMultiplayer && !mp.results
    const myRank = allScores?.findIndex(s => s.isMe) ?? -1

    return (
      <div className="nc-page nc-page--result">
        <div className="nc-grid-bg" />
        <div className="nc-result-burst">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="nc-burst-ring"
              initial={{ scale: 0, opacity: 0.5 }} animate={{ scale: 3 + i, opacity: 0 }}
              transition={{ duration: 1.6, delay: i * 0.3, ease: 'easeOut' }} />
          ))}
        </div>
        <div className="nc-result">
          <motion.div className="nc-rank-badge"
            style={{ borderColor: rankColor, boxShadow: `0 0 40px ${rankColor}50` }}
            initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}>
            <span className="nc-rank-letter" style={{ color: rankColor }}>{rank}</span>
            <span className="nc-rank-sub">RANK</span>
          </motion.div>
          <motion.div className="nc-result-hero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <p className="nc-result-label">TOTAL SCORE</p>
            <div className="nc-result-score" style={{ color: rankColor }}><CountUp target={score} /></div>
          </motion.div>
          <motion.div className="nc-result-stats" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <div className="nc-result-stat"><CheckCircle size={15} color="#00D4AA" /><span>{correctCount}/{totalQ}</span><span className="nc-stat-label">SOLVED</span></div>
            <div className="nc-result-stat"><Star size={15} color="#FFB830" /><span>{accuracy}%</span><span className="nc-stat-label">ACCURACY</span></div>
            <div className="nc-result-stat"><Zap size={15} color="#9B7ED4" /><span>×{bestStreak >= 3 ? 3 : bestStreak >= 2 ? 2 : 1}</span><span className="nc-stat-label">BEST COMBO</span></div>
          </motion.div>
          {waitingForOpponents && (
            <motion.div className="nc-result-leaderboard" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <p className="nc-section-label">// MATCH RESULTS</p>
              <p className="nc-lobby-desc">Waiting for the other player to finish…</p>
            </motion.div>
          )}
          {allScores && (
            <motion.div className="nc-result-leaderboard" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <p className="nc-section-label">// MATCH RESULTS</p>
              {allScores.map((s, i) => (
                <div key={s.name} className={`nc-lb-row ${s.isMe ? 'me' : ''}`}>
                  <span className="nc-lb-medal">{['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`}</span>
                  <span className="nc-lb-name">{s.name}{s.isMe ? ' (You)' : ''}</span>
                  <div className="nc-lb-bar-wrap">
                    <motion.div className="nc-lb-bar" style={{ background: s.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((s.score / (allScores[0].score || 1)) * 100, 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.8 + i * 0.1 }} />
                  </div>
                  <span className="nc-lb-score">{s.score.toLocaleString()}</span>
                </div>
              ))}
              {myRank === 0 && <p className="nc-result-win-msg">🏆 {isRealMultiplayer ? 'You won the race!' : 'You beat the AI bots!'}</p>}
            </motion.div>
          )}
          <motion.div className="nc-result-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
            <button className="nc-result-btn secondary" onClick={() => { if (mp.roomCode) mp.leaveRoom(); setPhase('lobby') }}><RotateCcw size={15} /> Play Again</button>
            <button className="nc-result-btn primary" onClick={() => navigate('/student/games')}>Games Lobby <ChevronRight size={15} /></button>
          </motion.div>
        </div>
      </div>
    )
  }

  // ─── PLAYING ─────────────────────────────────────────────────────────────

  const diffCfg = DIFF_CONFIG[difficulty]
  const hintTask = challenge?.tasks.find(t => t.id === hintTaskId) ?? null
  const mainNodes = challenge?.nodes.filter(n => n.id !== challenge.floatingNodeId) ?? []
  const floatingNode = challenge?.floatingNodeId ? challenge.nodes.find(n => n.id === challenge.floatingNodeId) : undefined
  const solvedLabel = { fix: 'CHAIN FIXED', reverse: 'LIST REVERSED', splice: 'NODE SPLICED', delete: 'NODE DELETED' }[challenge?.kind ?? 'fix']

  return (
    <div className="nc-page">
      <div className="nc-grid-bg" />

      <div className="nc-hud">
        <button className="nc-back-btn small" onClick={() => { gameMusic.stop(); if (mp.roomCode) mp.leaveRoom(); setPhase('lobby') }}><ArrowLeft size={14} /></button>
        <div className="nc-hud-score-wrap">
          <div className="nc-hud-score"><Zap size={14} color="#FFB830" /><span className="nc-hud-score-num">{score.toLocaleString()}</span></div>
          <AnimatePresence>
            {combo >= 2 && (
              <motion.div className="nc-combo-badge" key={combo}
                initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500 }}>
                ×{combo >= 3 ? 3 : 2} COMBO{combo >= 3 ? '!!!' : '!'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="nc-hud-rounds">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div key={i} className={`nc-round-pip ${i < totalQ ? 'done' : ''} ${i === totalQ ? 'current' : ''}`} />
          ))}
        </div>
        <div className="nc-hud-right">
          <button className="nc-sfx-toggle" onClick={toggleSfx} title={sfxMuted ? 'Unmute sound' : 'Mute sound'}>
            {sfxMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          <span className="nc-list-type-pill">{challenge?.listType === 'doubly' ? '⟷ DOUBLY' : '→ SINGLY'}</span>
          <span className="nc-diff-pill" style={{ color: diffCfg.color, borderColor: `${diffCfg.color}50`, background: `${diffCfg.color}10` }}>{diffCfg.label}</span>
        </div>
      </div>

      <div className="nc-run-panel">
        <div>
          <span className="nc-run-label">MISSION</span>
          <strong>{mission.label}</strong>
        </div>
        <span className={`nc-run-reward ${missionPaid ? 'complete' : ''}`}>{missionPaid ? 'CLAIMED' : `+${mission.reward} XP`}</span>
        <div className="nc-run-progress">
          <span style={{ width: `${mission.id === 'no-hints' ? (hintsUsedCount === 0 ? 100 : 0) : (missionProgress / mission.target) * 100}%` }} />
        </div>
      </div>

      <motion.div ref={arenaRef} className="nc-arena" style={{ position: 'relative' }}>
        <div className="nc-corner nc-corner--tl" />
        <div className="nc-corner nc-corner--tr" />
        <div className="nc-corner nc-corner--bl" />
        <div className="nc-corner nc-corner--br" />

        <ArrowLayer
          nodes={challenge?.nodes ?? []} rects={nodeRects}
          listType={challenge?.listType ?? 'singly'}
          pointerState={pointerState} completedTaskIds={completedTaskIds}
          wrongPulse={wrongPulse} dragArrowFrom={dragArrowFrom} dragArrowTo={dragArrowTo}
          hintTask={hintTask}
          ready={nodeRects.length >= (challenge?.nodes.length ?? 0) + 1} />

        {challenge?.tasks.filter(t => !completedTaskIds.has(t.id)).map(task => (
          <PointerHandle key={task.id} task={task}
            rect={nodeRects.find(r => r.id === task.nodeId)}
            isHint={hintTaskId === task.id}
            onResolve={handleTaskResolve}
            onDragMove={(from, to) => { setDragArrowFrom(from); setDragArrowTo(to) }} />
        ))}

        <TimerBar key={totalQ} timeLimit={challenge?.timeLimit ?? 40} onWindowClosed={() => setBonusClosed(true)} />

        <div className="nc-instruction-wrap">
          <div className="nc-instruction-badge">CHALLENGE · {completedTaskIds.size}/{challenge?.tasks.length ?? 0} POINTERS FIXED</div>
          <p className="nc-instruction">{challenge?.instruction}</p>
          {bonusClosed && <span className="nc-bonus-closed-label">— speed bonus window closed, take your time</span>}
          <button className="nc-hint-btn" onClick={() => doHint(false)} disabled={hintUsed}>
            <HelpCircle size={13} />
            {hintUsed ? `−${Math.abs(POINT_HINT)} XP used` : `Hint (−${Math.abs(POINT_HINT)} XP)`}
          </button>
        </div>

        {powerupChoices.length > 0 && (
          <motion.div className="nc-powerups" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <div>
              <span className="nc-run-label">POWERUP DROP</span>
              <strong>Pick one boost for the next move</strong>
            </div>
            <div className="nc-powerup-row">
              {powerupChoices.map(powerup => (
                <button key={powerup.id} className="nc-powerup-card" onClick={() => activatePowerup(powerup)}>
                  <span>{powerup.label}</span>
                  <small>{powerup.desc}</small>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="nc-floating-wrap">
          <AnimatePresence>
            {floatingScores.map(f => (
              <motion.div key={f.id} className={`nc-floating ${f.value > 0 ? 'pos' : 'neg'}`}
                style={{ left: `${f.x}%` }}
                initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -60 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }}>
                {f.value > 0 ? `+${f.value}` : f.value}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {feedback === 'correct' && (
            <motion.div className="nc-feedback nc-feedback--correct"
              initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }} transition={{ type: 'spring', stiffness: 400 }}>
              <CheckCircle size={28} /> {solvedLabel}
            </motion.div>
          )}
        </AnimatePresence>

        {floatingNode && (
          <div className="nc-staging-row">
            <LLNodeBox node={floatingNode} listType={challenge!.listType} isHead={false} isTail={false} isFloating
              onRef={(id, el) => { nodeEls.current[id] = el }} />
          </div>
        )}

        <div className="nc-list-container">
          <div className="nc-list-row">
            {mainNodes.map((node, i) => (
              <LLNodeBox key={node.id} node={node} listType={challenge?.listType ?? 'singly'}
                isHead={i === 0} isTail={i === mainNodes.length - 1}
                isOrphaned={orphanedId === node.id}
                onRef={(id, el) => { nodeEls.current[id] = el }} />
            ))}
            <div className="nc-null-zone" data-null-zone="true" ref={el => { nodeEls.current[NULL_ID] = el }}>
              <span>NULL</span>
            </div>
          </div>
        </div>

        {mode === 'multiplayer' && (
          <div className="nc-mp-panel">
            <p className="nc-mp-title"><Swords size={12} /> {isRealMultiplayer ? 'LIVE RACE' : 'LIVE RACE vs AI BOTS'}</p>
            {(isRealMultiplayer
              ? mp.players.map(p => ({
                  name: p.userId === user?.id ? 'You' : p.name,
                  score: p.userId === user?.id ? score : (mp.opponentProgress[p.userId]?.value ?? 0),
                  color: p.userId === user?.id ? '#9B7ED4' : p.avatarColor,
                  isMe: p.userId === user?.id,
                }))
              : [
                  { name: 'You', score, color: '#9B7ED4', isMe: true },
                  ...FAKE_OPPONENTS.map(o => ({ name: o.name, score: opponentScores[o.id] ?? 0, color: o.color, isMe: false })),
                ]
            ).sort((a, b) => b.score - a.score).map((p, i) => (
              <div key={`${p.name}-${i}`} className="nc-mp-row">
                <span className="nc-mp-pos">#{i + 1}</span>
                <div className="nc-mp-avatar" style={{ background: `${p.color}20`, borderColor: p.color }}>{p.name[0]}</div>
                <span className="nc-mp-name" style={{ color: p.isMe ? '#9B7ED4' : 'var(--text-secondary)' }}>{p.name}</span>
                <div className="nc-mp-bar-wrap">
                  <motion.div className="nc-mp-bar" style={{ background: p.color }}
                    animate={{ width: `${Math.min((p.score / 700) * 100, 100)}%` }} transition={{ duration: 0.4 }} />
                </div>
                <span className="nc-mp-score">{p.score}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
