import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, CheckCircle, Flame, HelpCircle, RotateCcw, Swords,
  Timer, Trash2, Users, Zap, AlertTriangle, Volume2, VolumeX,
} from 'lucide-react'
import { sfx, gameMusic, useSfxToggle } from '../../../lib/sfx'
import './QueueRush.css'

/* ── Types ─────────────────────────────────────────────────────────────── */

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type Mode       = 'solo' | 'multiplayer'
type Phase      = 'lobby' | 'playing' | 'result'

type ChallengeType =
  | 'scenario_enqueue'   // Who/what ends up at front or rear? (scenario, no recipe)
  | 'scenario_dequeue'   // After N dequeues, what's at front? (mental model only)
  | 'predict_output'     // Show pseudocode ops — pick the resulting front (MC)
  | 'build_target'       // Match a ghost queue using unlabeled enqueue/dequeue zones
  | 'circular_capacity'  // Fixed-capacity wraparound scenario (MC)
  | 'spot_violation'     // What's wrong with this queue state? (MC)
  | 'ticket_drain'       // Stream pushed in, then drained — unlabeled zones, FIFO order
  | 'bfs_trace'          // Tokens revealed one-by-one; unlabeled enqueue/visit zones

interface MCOption { label: string; correct: boolean }

interface Challenge {
  type: ChallengeType
  title: string
  scenario: string          // Narrative, never a step-by-step recipe
  timeLimit: number
  maxSize: number
  initialQueue: string[]
  source?: string[]         // original ordered source
  shuffledSource?: string[] // display order (shuffled) — for build_target
  target?: string[]
  stream?: string[]
  answer?: string           // For string/value-answer challenges
  mcOptions?: MCOption[]    // For multiple-choice challenges
  violationKind?: string    // For spot_violation, which rule was broken
  ops?: string              // For predict_output, pseudocode shown in the OPERATIONS box
}

interface FloatingScore { id: string; value: number; x: number }

/* ── Constants ─────────────────────────────────────────────────────────── */

const ACCENT       = '#FF6B8A'
const TOTAL_ROUNDS  = 5
const POINT_BASE    = 100
const POINT_SPEED   = 50
const POINT_WRONG   = -25
const POINT_HINT    = -35

const DIFFICULTY_CONFIG: Record<Difficulty, {
  label: string; desc: string; time: number; maxSize: number; color: string
}> = {
  easy:   { label: 'Easy',   desc: 'Mental enqueue/dequeue — no hand-holding', time: 40,  maxSize: 5, color: '#00D4AA' },
  medium: { label: 'Medium', desc: 'Predict & build target queues',           time: 50,  maxSize: 6, color: '#9B7ED4' },
  hard:   { label: 'Hard',   desc: 'Circular capacity & ticket draining',     time: 65,  maxSize: 7, color: '#FFB830' },
  expert: { label: 'Expert', desc: 'BFS traversal, violation detection',      time: 85,  maxSize: 8, color: ACCENT    },
}

const TYPES_BY_DIFF: Record<Difficulty, ChallengeType[]> = {
  easy:   ['scenario_enqueue', 'scenario_dequeue', 'predict_output'],
  medium: ['predict_output', 'build_target', 'spot_violation'],
  hard:   ['circular_capacity', 'ticket_drain', 'build_target'],
  expert: ['bfs_trace', 'spot_violation', 'circular_capacity'],
}

const VALUES = ['A', 'B', 'C', 'D', 'E', 'F', '7', '13', '21', '42']

const FAKE_OPPONENTS = [
  { name: 'Kai [AI]',  ops: 0 },
  { name: 'Mira [AI]', ops: 0 },
  { name: 'Theo [AI]', ops: 0 },
]

/* ── Utilities ─────────────────────────────────────────────────────────── */

function uid()  { return Math.random().toString(36).slice(2, 9) }
function rng(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(arr: T[]) { return arr[rng(0, arr.length - 1)] }
function shuffle<T>(arr: T[]) { return [...arr].sort(() => Math.random() - 0.5) }
function makeVals(n: number) { return Array.from({ length: n }, () => pick(VALUES)) }
function queueEq(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

/* ── Challenge pools ───────────────────────────────────────────────────── */

const SCENARIO_ENQUEUE_POOL = [
  { story: 'A printer queue is empty. Documents arrive in order: Resume.pdf, then Invoice.pdf, then Report.pdf. Which document prints first?', vals: ['Resume.pdf','Invoice.pdf','Report.pdf'], askFront: true },
  { story: 'Three customers line up at a kiosk: Mae, then Jun, then Liz. Who gets served first?', vals: ['Mae','Jun','Liz'], askFront: true },
  { story: 'A ride-share queue fills with requests: R1, then R2, then R3. Which request is at the rear of the line, waiting longest before it\'s served?', vals: ['R1','R2','R3'], askFront: false },
  { story: 'A call center queues incoming calls: Call-A, then Call-B, then Call-C. Which call is answered first?', vals: ['Call-A','Call-B','Call-C'], askFront: true },
  { story: 'A BFS adds neighbors to the frontier in order: X, then Y, then Z. Which node gets visited next?', vals: ['X','Y','Z'], askFront: true },
]

const SCENARIO_DEQUEUE_POOL = [
  { story: 'A queue holds [front→rear]: A, B, C, D. Two customers are served (dequeued). Who is now at the front of the line?', queue: ['A','B','C','D'], pops: 2, answer: 'C' },
  { story: 'A print queue has [front→rear]: Doc1, Doc2, Doc3. One document finishes printing. Which document prints next?', queue: ['Doc1','Doc2','Doc3'], pops: 1, answer: 'Doc2' },
  { story: 'A task queue contains [front→rear]: T1, T2, T3, T4. Three tasks are processed and removed. Which task remains at the front?', queue: ['T1','T2','T3','T4'], pops: 3, answer: 'T4' },
]

const PREDICT_POOL = [
  {
    ops: 'enqueue(5)\nenqueue(3)\ndequeue()\nenqueue(9)',
    finalQueue: ['3','9'],
    front: '3',
    distractors: ['5','9','empty'],
  },
  {
    ops: 'enqueue(A)\nenqueue(B)\nenqueue(C)\ndequeue()\ndequeue()',
    finalQueue: ['C'],
    front: 'C',
    distractors: ['A','B','empty'],
  },
  {
    ops: 'enqueue(1)\nenqueue(2)\ndequeue()\nenqueue(3)\ndequeue()\nenqueue(4)',
    finalQueue: ['3','4'],
    front: '3',
    distractors: ['1','2','4'],
  },
  {
    ops: 'enqueue(X)\ndequeue()\nenqueue(Y)\nenqueue(Z)\ndequeue()',
    finalQueue: ['Z'],
    front: 'Z',
    distractors: ['X','Y','empty'],
  },
]

const CIRCULAR_POOL = [
  {
    scenario: 'A circular queue of capacity 4 holds [front→rear]: A, B, C, D — it\'s full. The front is dequeued, then enqueue(E) is called. Where does E end up?',
    correct: 'At the rear, in the slot the front item vacated',
    distractors: ['It overwrites the new front item B', 'It is rejected — the queue is still full', 'It replaces D at the rear'],
  },
  {
    scenario: 'A circular queue of capacity 3 is full with [front→rear]: X, Y, Z. enqueue(W) is attempted without dequeuing first. What happens?',
    correct: 'Overflow — W is rejected, the queue stays X, Y, Z',
    distractors: ['W silently replaces X', 'W wraps around and replaces Z', 'The queue resizes to fit W'],
  },
  {
    scenario: 'A circular queue of capacity 5 holds 2 items near the end of the buffer. The next enqueue would go past the last physical slot. What should happen in a correctly implemented circular queue?',
    correct: 'The rear pointer wraps back to index 0 if that slot is free',
    distractors: ['The queue throws an overflow error immediately', 'The item is appended past the buffer bounds', 'The queue converts to a linked list'],
  },
]

const VIOLATION_POOL = [
  {
    scenario: 'A dequeue() is called on an empty queue — no items exist. The code crashes. What rule was violated?',
    correct: 'Queue underflow (dequeue on empty queue)',
    distractors: ['Queue overflow (too many enqueues)', 'Peek without items', 'FIFO order broken'],
  },
  {
    scenario: 'A queue with max size 4 already holds 4 items. enqueue(X) is called. The item is silently dropped. What rule was violated?',
    correct: 'Queue overflow (exceeded capacity)',
    distractors: ['Queue underflow', 'Peek on empty queue', 'Items dequeued out of order'],
  },
  {
    scenario: 'Items A, B, C were enqueued in that order (A first). The code dequeues B directly without removing A first. What rule was violated?',
    correct: 'FIFO rule — only the front element can be removed',
    distractors: ['Queue underflow', 'Queue overflow', 'Peek reads the wrong element'],
  },
  {
    scenario: 'peek()/front() is called to inspect the queue, but it removes the front element as a side effect. What rule was violated?',
    correct: 'Peek/front must not modify the queue',
    distractors: ['Queue underflow', 'FIFO order violated', 'Queue overflow'],
  },
  {
    scenario: 'A new item needs to join the line. The code inserts it at the front instead of the rear. What rule was violated?',
    correct: 'Enqueue must always insert at the rear, never the front',
    distractors: ['Dequeue must remove from the rear', 'Queue underflow', 'Queue overflow'],
  },
]

const BFS_POOL = [
  {
    // Simple tree/graph adjacency, BFS order is deterministic from a fixed start + enqueue order
    label: 'Graph: S→A, S→B, A→C, B→D',
    start: 'S',
    stream: ['S', 'A', 'B', 'C', 'D'], // tokens revealed one at a time as "discovered"
    visitOrder: ['S', 'A', 'B', 'C', 'D'],
  },
  {
    label: 'Graph: S→X, S→Y, X→Z',
    start: 'S',
    stream: ['S', 'X', 'Y', 'Z'],
    visitOrder: ['S', 'X', 'Y', 'Z'],
  },
]

function generateChallenge(difficulty: Difficulty, round: number): Challenge {
  const cfg = DIFFICULTY_CONFIG[difficulty]
  const forcedFinal: Partial<Record<Difficulty, ChallengeType>> = {
    hard: 'circular_capacity', expert: 'bfs_trace',
  }
  const type: ChallengeType =
    round === TOTAL_ROUNDS - 1 && forcedFinal[difficulty]
      ? forcedFinal[difficulty]!
      : pick(TYPES_BY_DIFF[difficulty])

  /* ── scenario_enqueue ────────────────────────────────────────────────── */
  if (type === 'scenario_enqueue') {
    const p = pick(SCENARIO_ENQUEUE_POOL)
    const correct = p.askFront ? p.vals[0] : p.vals.at(-1)!
    const distractors = p.vals.filter(v => v !== correct).concat(['empty'])
    const mcOptions = shuffle([
      { label: correct, correct: true },
      ...shuffle(distractors).slice(0, 3).map(l => ({ label: l, correct: false })),
    ])
    return {
      type, title: p.askFront ? 'Who\'s First?' : 'Who\'s Waiting Longest?',
      scenario: p.story,
      timeLimit: cfg.time, maxSize: cfg.maxSize,
      initialQueue: p.vals, answer: correct, mcOptions,
    }
  }

  /* ── scenario_dequeue ────────────────────────────────────────────────── */
  if (type === 'scenario_dequeue') {
    const p = pick(SCENARIO_DEQUEUE_POOL)
    const distractors = p.queue.filter(v => v !== p.answer).concat(['empty'])
    const mcOptions = shuffle([
      { label: p.answer, correct: true },
      ...shuffle(distractors).slice(0, 3).map(l => ({ label: l, correct: false })),
    ])
    return {
      type, title: 'Trace the Dequeues',
      scenario: p.story,
      timeLimit: cfg.time, maxSize: cfg.maxSize,
      initialQueue: p.queue, answer: p.answer, mcOptions,
    }
  }

  /* ── predict_output ──────────────────────────────────────────────────── */
  if (type === 'predict_output') {
    const p = pick(PREDICT_POOL)
    const mcOptions = shuffle([
      { label: p.front, correct: true },
      ...p.distractors.map(l => ({ label: l, correct: false })),
    ])
    return {
      type, title: 'Predict the Front',
      scenario: 'After executing the operations below, what value is at the front of the queue?',
      ops: p.ops,
      timeLimit: cfg.time, maxSize: cfg.maxSize,
      initialQueue: [], answer: p.front, mcOptions,
    }
  }

  /* ── build_target ────────────────────────────────────────────────────── */
  if (type === 'build_target') {
    const source = makeVals(rng(4, 6))
    const dequeueCount = rng(1, Math.min(2, source.length - 2))
    const target = source.slice(dequeueCount, Math.min(source.length, dequeueCount + rng(2, 3)))
    const shuffledSource = shuffle(source)
    return {
      type, title: 'Build the Line',
      scenario: 'Match the ghost queue. Any chip can be dragged to ENQUEUE (joins the rear). Drag the front-most queue slot to DEQUEUE. No indicators — figure it out.',
      timeLimit: cfg.time, maxSize: cfg.maxSize,
      initialQueue: [], source, shuffledSource, target,
    }
  }

  /* ── circular_capacity ───────────────────────────────────────────────── */
  if (type === 'circular_capacity') {
    const v = pick(CIRCULAR_POOL)
    const mcOptions = shuffle([
      { label: v.correct, correct: true },
      ...v.distractors.map(l => ({ label: l, correct: false })),
    ])
    return {
      type, title: 'Circular Capacity',
      scenario: v.scenario,
      timeLimit: cfg.time, maxSize: cfg.maxSize,
      initialQueue: [], mcOptions, answer: v.correct,
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
      type, title: 'Spot the Violation',
      scenario: v.scenario,
      timeLimit: cfg.time, maxSize: cfg.maxSize,
      initialQueue: [], mcOptions, answer: v.correct,
    }
  }

  /* ── ticket_drain ────────────────────────────────────────────────────── */
  if (type === 'ticket_drain') {
    const n = rng(4, 5)
    const tickets = Array.from({ length: n }, (_, i) => `T${i + 1}`)
    return {
      type, title: 'Drain the Tickets',
      scenario: 'Tickets arrive one at a time. Drag each to JOIN (enqueue at rear) or SERVE (dequeue from front) — you decide which, and when. The output zone shows your service order. Tickets must be served in the order they arrived.',
      timeLimit: cfg.time, maxSize: cfg.maxSize,
      initialQueue: [], stream: tickets, answer: tickets.join(''),
    }
  }

  /* ── bfs_trace ───────────────────────────────────────────────────────── */
  const g = pick(BFS_POOL)
  return {
    type: 'bfs_trace', title: 'BFS Frontier',
    scenario: `${g.label}. Nodes are discovered one at a time in the order shown. Drag each to JOIN (enqueue into the frontier) or VISIT (dequeue and mark visited) — figure out which keeps BFS order correct. The visited panel tracks your output.`,
    timeLimit: cfg.time, maxSize: cfg.maxSize,
    initialQueue: [], stream: g.stream, answer: g.visitOrder.join(''),
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
    <div className="qr-timer">
      <Timer size={14} color={color} />
      <div className="qr-timer-track">
        <motion.div className="qr-timer-fill" style={{ background: color }} animate={{ width: `${pct}%` }} />
      </div>
      <span style={{ color }}>{rem}s</span>
    </div>
  )
}

/** Visual queue pipe — front-most slot is draggable for dequeue */
function PipeView({
  queue, maxSize, hot, invalid, onFrontDragStart,
}: {
  queue: string[]; maxSize: number; hot?: boolean; invalid?: boolean
  onFrontDragStart?: () => void
}) {
  return (
    <div className={`qr-pipe-shell ${hot ? 'qr-pipe-shell--hot' : ''} ${invalid ? 'qr-pipe-shell--invalid' : ''}`}>
      <div className="qr-pipe-labels">
        <span className="qr-front-label">FRONT</span>
        <span className="qr-max-label">MAX {maxSize}</span>
        <span className="qr-rear-label">REAR</span>
      </div>
      <div className="qr-pipe">
        {Array.from({ length: maxSize }).map((_, i) => (
          <div key={i} className="qr-slot-guide" style={{ left: 16 + i * 86 }} />
        ))}
        <AnimatePresence>
          {queue.map((item, index) => {
            const isFront = index === 0
            return (
              <motion.div
                key={`${item}-${index}`}
                className={`qr-block ${isFront ? 'qr-block--front' : ''} ${isFront && onFrontDragStart ? 'qr-block--draggable' : ''}`}
                style={{ left: 16 + index * 86 }}
                initial={{ x: 120, opacity: 0, scale: 0.9 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: -90, opacity: 0, scale: 0.85 }}
                draggable={isFront && !!onFrontDragStart}
                onDragStart={(isFront && onFrontDragStart ? (e: React.DragEvent<HTMLDivElement>) => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', 'pop-front')
                  onFrontDragStart()
                } : undefined) as any}
              >
                {item}
                {isFront && onFrontDragStart && <span className="qr-drag-hint">←</span>}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
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
    <div className="qr-mc-grid">
      {options.map(o => {
        let cls = 'qr-mc-btn'
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

/** Drop zone — accepts drag-over and signals when something is released */
function DropZone({
  label, accent, onDrop, onFrontDrop,
}: {
  label: string; accent: string
  onDrop: () => void          // called when a staging chip is dropped
  onFrontDrop?: () => void    // called when the pipe front block is dropped
}) {
  const [over, setOver] = useState(false)
  return (
    <div
      className={`qr-drop-zone ${over ? 'over' : ''}`}
      style={{ '--dz-accent': accent } as React.CSSProperties}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault()
        setOver(false)
        const isFrontDrag = e.dataTransfer.getData('text/plain') === 'pop-front'
        if (isFrontDrag && onFrontDrop) onFrontDrop()
        else onDrop()
      }}
    >
      {label}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function QueueRush() {
  const navigate = useNavigate()

  /* Global state */
  const [phase,      setPhase]      = useState<Phase>('lobby')
  const [mode,       setMode]       = useState<Mode>('solo')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')

  /* Round state */
  const [challenge,    setChallenge]    = useState<Challenge | null>(null)
  const [queue,         setQueue]        = useState<string[]>([])
  const [streamIndex,  setStreamIndex]  = useState(0)
  const [output,       setOutput]       = useState<string[]>([])
  const [mcLocked,     setMcLocked]     = useState(false)
  const [dragToken,    setDragToken]    = useState<string | null>(null)

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
  const activeToken  = challenge?.stream?.[streamIndex]

  /* ── Hint text ── */
  const hintText = useMemo(() => {
    if (!challenge) return ''
    if (challenge.type === 'scenario_enqueue' || challenge.type === 'scenario_dequeue' || challenge.type === 'predict_output' || challenge.type === 'spot_violation')
      return 'Think about which element arrived first. In a queue, the first one in is always the first one out (FIFO).'
    if (challenge.type === 'build_target')
      return `Target queue front→rear: ${(challenge.target ?? []).join(', ')}. Enqueue chips from staging at the rear, dequeue extras from the front.`
    if (challenge.type === 'circular_capacity')
      return 'A circular queue reuses freed slots. Dequeuing the front frees a slot — the rear pointer wraps to use it, it does not overwrite live data.'
    if (challenge.type === 'ticket_drain')
      return 'Join puts a ticket at the rear. Serve removes from the front. To preserve arrival order, serve in the same order tickets joined.'
    if (challenge.type === 'bfs_trace')
      return 'BFS visits nodes in the order they were discovered. Join when a node is first found; visit (dequeue) the oldest discovered node still waiting.'
    return ''
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
    setQueue(c.initialQueue)
    setStreamIndex(0)
    setOutput([])
    setMcLocked(false)
    setDragToken(null)
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
    if (challenge?.type === 'circular_capacity' && nextCombo >= 2) earned.add('Wraparound Whiz')
    if (challenge?.type === 'bfs_trace')                           earned.add('Frontier Master')
    if (challenge?.type === 'spot_violation')                      earned.add('Rule Keeper')
    if (nextCombo >= 3)                                            earned.add('On Fire 🔥')
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
    setTimeout(() => { setFeedback(null); setShake(false) }, 700)
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

  /* ── MC handler (scenario_enqueue / scenario_dequeue / predict_output / spot_violation / circular_capacity) ── */
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

  /* ── build_target: enqueue a specific value (rear), dequeue front ── */
  function handleBuildEnqueue(value: string) {
    if (!challenge) return
    const inSource = (challenge.source ?? []).filter(v => v === value).length
    const inQueue  = queue.filter(v => v === value).length
    if (inQueue >= inSource) { wrong(`"${value}" has already been enqueued the maximum number of times.`); return }
    if (queue.length >= challenge.maxSize) { wrong('Queue overflow — line is full.'); return }
    const next = [...queue, value]
    setQueue(next)
    setOps(prev => prev + 1)
    sfx.place()
    if (challenge.target && queueEq(next, challenge.target)) completeRound()
  }

  function handleBuildDequeue() {
    if (!challenge) return
    if (queue.length === 0) { wrong('Queue underflow — nothing to dequeue.'); return }
    const next = queue.slice(1)
    setQueue(next)
    setOps(prev => prev + 1)
    sfx.place()
    if (challenge.target && queueEq(next, challenge.target)) completeRound()
  }

  /* ── ticket_drain: drag token to join/serve ── */
  function handleTicketJoin() {
    if (!challenge || !activeToken) return
    if (queue.length >= challenge.maxSize) { wrong('Queue overflow.'); return }
    setQueue(prev => [...prev, activeToken])
    setStreamIndex(prev => prev + 1)
    setOps(prev => prev + 1)
    sfx.place()
  }

  function handleTicketServe() {
    if (!challenge) return
    if (queue.length === 0) { wrong('Nothing in line to serve.'); return }
    const val = queue[0]
    const next = queue.slice(1)
    const nextOut = [...output, val]
    setQueue(next)
    setOutput(nextOut)
    setOps(prev => prev + 1)
    sfx.place()
    const allArrived = streamIndex >= (challenge.stream?.length ?? 0)
    if (allArrived && next.length === 0) {
      if (nextOut.join('') === challenge.answer) completeRound()
      else wrong('Served out of arrival order — that breaks FIFO.')
    }
  }

  /* ── bfs_trace: drag token to join (enqueue) / visit (dequeue) ── */
  function handleBfsJoin() {
    if (!challenge || !activeToken) return
    if (queue.length >= challenge.maxSize) { wrong('Frontier overflow.'); return }
    setQueue(prev => [...prev, activeToken])
    setStreamIndex(prev => prev + 1)
    setOps(prev => prev + 1)
    sfx.place()
  }

  function handleBfsVisit() {
    if (!challenge) return
    if (queue.length === 0) { wrong('Frontier is empty — nothing to visit yet.'); return }
    const val = queue[0]
    const next = queue.slice(1)
    const nextOut = [...output, val]
    setQueue(next)
    setOutput(nextOut)
    setOps(prev => prev + 1)
    sfx.place()
    const allArrived = streamIndex >= (challenge.stream?.length ?? 0)
    if (allArrived && next.length === 0) {
      if (nextOut.join('') === challenge.answer) completeRound()
      else wrong('Visited out of discovery order — BFS requires FIFO order.')
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LOBBY
  ════════════════════════════════════════════════════════════════════════ */
  if (phase === 'lobby') {
    return (
      <div className="qr-page">
        <div className="qr-grid-bg" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button className="qr-back-btn" style={{ marginBottom: 0 }} onClick={() => navigate('/student/games')}>
            <ArrowLeft size={15} /> Back
          </button>
          <button className="qr-sfx-toggle" onClick={toggleSfx} title={sfxMuted ? 'Unmute sound' : 'Mute sound'}>
            {sfxMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
        <section className="qr-lobby">
          <motion.div className="qr-logo-pipe" animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>
            <span /><span /><span /><span />
          </motion.div>
          <h1>QUEUE RUSH</h1>
          <p className="qr-lobby-sub">MODULE 04 · QUEUES</p>
          <p className="qr-lobby-desc">
            No step-by-step recipes. Read scenarios, predict outputs, spot violations,
            and drag tokens to the right zone — using your own understanding of FIFO.
          </p>

          <div className="qr-selector">
            <button className={mode === 'solo' ? 'active' : ''} onClick={() => setMode('solo')}>
              <Zap size={18} /> Solo
            </button>
            <button className={mode === 'multiplayer' ? 'active' : ''} onClick={() => setMode('multiplayer')}>
              <Users size={18} /> Multiplayer
            </button>
          </div>

          <div className="qr-diff-grid">
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

          <motion.button className="qr-start-btn" onClick={startGame} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Flame size={20} /> Start Queue Run
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
      <div className="qr-page qr-page--result">
        <div className="qr-grid-bg" />
        <div className="qr-result">
          <div className="qr-result-rank">{rank}</div>
          <p className="qr-result-label">TOTAL XP</p>
          <h2><CountUp target={score} /></h2>
          <div className="qr-result-stats">
            <span><CheckCircle size={14} /> {correct}/{TOTAL_ROUNDS}</span>
            <span><Swords size={14} /> {ops} ops</span>
            <span><Zap size={14} /> {accuracy}%</span>
          </div>
          {badges.length > 0 && (
            <div className="qr-badges">
              {badges.map(b => <span key={b}>{b}</span>)}
            </div>
          )}
          {ranked.length > 0 && (
            <div className="qr-race-results">
              {ranked.map((p, i) => (
                <div key={p.name} className={p.isMe ? 'me' : ''}>
                  <b>#{i + 1}</b><span>{p.name}</span><em>{p.ops} ops</em>
                </div>
              ))}
            </div>
          )}
          <div className="qr-result-actions">
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

  const isMC      = challenge && ['scenario_enqueue','scenario_dequeue','predict_output','spot_violation','circular_capacity'].includes(challenge.type)
  const isDrag    = challenge && ['build_target','ticket_drain','bfs_trace'].includes(challenge.type)
  const showQueue = challenge && ['build_target','ticket_drain','bfs_trace'].includes(challenge.type)

  return (
    <div className={`qr-page qr-page--playing ${shake ? 'qr-shake' : ''}`}>
      <div className="qr-grid-bg" />

      {/* HUD */}
      <div className="qr-hud">
        <button className="qr-back-btn" onClick={() => { gameMusic.stop(); setPhase('lobby') }}><ArrowLeft size={14} /></button>
        <div className="qr-score"><Zap size={14} /> {score.toLocaleString()}</div>
        <div className="qr-rounds">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <span key={i} className={i < round ? 'done' : i === round ? 'active' : ''} />
          ))}
        </div>
        <button className="qr-sfx-toggle" onClick={toggleSfx} title={sfxMuted ? 'Unmute sound' : 'Mute sound'}>
          {sfxMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
        <span className="qr-pill" style={{ color: cfg.color, borderColor: `${cfg.color}55` }}>{cfg.label}</span>
        {combo >= 2 && <span className="qr-pill qr-combo">×{combo}</span>}
        {mode === 'multiplayer' && <span className="qr-pill"><Users size={11} /> Race</span>}
      </div>

      <main className={`qr-arena ${shake ? 'qr-arena--shake' : ''}`}>
        <TimerBar key={`${round}-${challenge?.type}`} seconds={challenge?.timeLimit ?? cfg.time} onExpire={expireRound} />

        {/* Instruction */}
        <div className="qr-instruction">
          <span>{challenge?.title ?? ''}</span>
          <p>{challenge?.scenario ?? ''}</p>
          <button className="qr-hint-btn" onClick={useHint} disabled={hintUsed}>
            <HelpCircle size={13} /> {hintUsed ? 'Hint used' : 'Hint (−35 pts)'}
          </button>
          {hintVisible && <p className="qr-hint">{hintText}</p>}
          {wrongMsg && (
            <p className="qr-expected"><AlertTriangle size={12} /> {wrongMsg}</p>
          )}
        </div>

        {/* Feedback overlay */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              className={`qr-feedback ${feedback}`}
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
        <div className="qr-floating-wrap" aria-hidden>
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

        {/* ── Multiple-choice layout ── */}
        {isMC && (
          <div className="qr-mc-area">
            {/* For scenario_enqueue / scenario_dequeue: show the queue visually */}
            {(challenge!.type === 'scenario_enqueue' || challenge!.type === 'scenario_dequeue') && (
              <div className="qr-mc-queue-preview">
                <span className="qr-panel-label">QUEUE (front → rear)</span>
                <div className="qr-mc-queue-row">
                  {challenge!.initialQueue.map((v, i) => (
                    <div key={i} className={`qr-mc-queue-item ${i === 0 ? 'front' : ''}`}>
                      {i === 0 && <span className="qr-front-tag">front →</span>}
                      {v}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* For predict_output: show the pseudocode */}
            {challenge!.type === 'predict_output' && (
              <div className="qr-pseudocode">
                <span className="qr-panel-label">OPERATIONS</span>
                <pre>{challenge!.ops}</pre>
              </div>
            )}

            <div className="qr-mc-question">
              <span className="qr-panel-label">YOUR ANSWER</span>
              <MCGrid
                key={round}
                options={challenge!.mcOptions!}
                onPick={handleMC}
                locked={mcLocked}
              />
            </div>
          </div>
        )}

        {/* ── Drag-based layout ── */}
        {isDrag && (
          <div className="qr-drag-area">
            {/* Left: staging / token stream */}
            <section className="qr-panel">
              <span className="qr-panel-label">
                {challenge!.type === 'build_target' ? 'STAGING' : 'ARRIVALS'}
              </span>

              {/* build_target: all chips shuffled, all draggable */}
              {challenge!.type === 'build_target' && (
                <div className="qr-chip-row">
                  {(challenge!.shuffledSource ?? challenge!.source ?? []).map((v, i) => (
                    <div
                      key={`${v}-${i}`}
                      className="qr-token-chip"
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', v)
                        sfx.pick()
                        setDragToken(v)
                      }}
                    >
                      {v}
                    </div>
                  ))}
                </div>
              )}

              {/* ticket_drain / bfs_trace: reveal one token at a time */}
              {(challenge!.type === 'ticket_drain' || challenge!.type === 'bfs_trace') && (
                <div className="qr-reveal">
                  <span className="qr-panel-label">CURRENT ARRIVAL</span>
                  <AnimatePresence mode="wait">
                    {activeToken ? (
                      <motion.div
                        key={streamIndex}
                        className="qr-reveal-token"
                        initial={{ x: 24, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -24, opacity: 0 }}
                        draggable
                        onDragStart={((e: React.DragEvent<HTMLDivElement>) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', activeToken ?? ''); sfx.pick(); setDragToken(activeToken) }) as any}
                      >
                        {activeToken}
                      </motion.div>
                    ) : (
                      <motion.div key="done" className="qr-reveal-token done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        ✓ all arrived
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="qr-stream qr-stream--mini">
                    {(challenge!.stream ?? []).map((t, i) => (
                      <span key={`${t}-${i}`} className={i < streamIndex ? 'done' : i === streamIndex ? 'active' : ''}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Middle: pipe */}
            {showQueue && (
              <div className="qr-pipe-col">
                <PipeView
                  queue={queue}
                  maxSize={challenge!.maxSize}
                  hot={combo >= 3}
                  invalid={shake}
                  onFrontDragStart={queue.length > 0 ? () => {
                    sfx.pick()
                    setDragToken('__deq__')
                  } : undefined}
                />
                {/* Drop zones below the pipe */}
                <div className="qr-dz-row">
                  <DropZone
                    label={challenge!.type === 'build_target' ? 'ENQUEUE →' : challenge!.type === 'bfs_trace' ? 'JOIN FRONTIER' : 'JOIN LINE'}
                    accent="#FF6B8A"
                    onDrop={() => {
                      if (!challenge) return
                      if (challenge.type === 'build_target') handleBuildEnqueue(dragToken ?? '')
                      if (challenge.type === 'ticket_drain')  handleTicketJoin()
                      if (challenge.type === 'bfs_trace')     handleBfsJoin()
                      setDragToken(null)
                    }}
                    onFrontDrop={() => { /* enqueuing the pipe front makes no sense */ }}
                  />
                  <DropZone
                    label={challenge!.type === 'build_target' ? '← DEQUEUE' : challenge!.type === 'bfs_trace' ? 'VISIT' : 'SERVE'}
                    accent="#00D4AA"
                    onDrop={() => {
                      if (!challenge) return
                      if (challenge.type === 'ticket_drain') handleTicketServe()
                      if (challenge.type === 'bfs_trace')    handleBfsVisit()
                      setDragToken(null)
                    }}
                    onFrontDrop={() => {
                      if (!challenge) return
                      if (challenge.type === 'build_target')  handleBuildDequeue()
                      if (challenge.type === 'ticket_drain')  handleTicketServe()
                      if (challenge.type === 'bfs_trace')     handleBfsVisit()
                      setDragToken(null)
                    }}
                  />
                </div>
              </div>
            )}

            {/* Right: target or output */}
            <section className="qr-panel qr-target-panel">
              {challenge!.type === 'build_target' && (
                <>
                  <span className="qr-panel-label">TARGET (front → rear)</span>
                  <div className="qr-ghost-queue">
                    {(challenge!.target ?? []).map((v, i) => (
                      <span key={`${v}-${i}`}>{v}</span>
                    ))}
                  </div>
                </>
              )}
              {challenge!.type === 'ticket_drain' && (
                <>
                  <span className="qr-panel-label">SERVICE ORDER</span>
                  <div className="qr-output">{output.join(' → ') || '...'}</div>
                </>
              )}
              {challenge!.type === 'bfs_trace' && (
                <>
                  <span className="qr-panel-label">VISITED ORDER</span>
                  <div className="qr-output" style={{ fontSize: 16 }}>{output.join(' → ') || '...'}</div>
                  <span className="qr-panel-label" style={{ marginTop: 12 }}>FRONTIER (queue)</span>
                  <div className="qr-output" style={{ fontSize: 14 }}>{queue.join(', ') || '—'}</div>
                </>
              )}
            </section>
          </div>
        )}

        {/* Multiplayer race */}
        {mode === 'multiplayer' && (
          <div className="qr-mp">
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
