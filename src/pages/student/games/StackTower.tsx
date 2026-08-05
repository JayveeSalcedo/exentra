import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, CheckCircle, Flame, HelpCircle, RotateCcw, Swords,
  Timer, Trash2, Undo2, Users, Zap, AlertTriangle, Volume2, VolumeX,
} from 'lucide-react'
import { useAuth } from '../../../store/AuthContext'
import { sfx, gameMusic, useSfxToggle } from '../../../lib/sfx'
import { saveGameSession } from '../../../lib/gameSessions'
import { useMultiplayerRoom } from '../../../lib/multiplayer'
import { SeededRandom } from '../../../lib/seededRandom'
import './StackTower.css'

/* ── Types ─────────────────────────────────────────────────────────────── */

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type Mode       = 'solo' | 'multiplayer'
type Phase      = 'lobby' | 'playing' | 'result'

type ChallengeType =
  | 'build_target'      // Match a ghost stack using unlabeled push/pop zones.
                         // When `constrained` is set, disks carry a size and a bigger
                         // disk can never be pushed onto a smaller one — real Hanoi rule.
  | 'bracket_matcher'   // Push/pop openers + drag verdict to ✓ or ✗
  | 'reverse_string'    // No labeled buttons — two drop zones
  | 'postfix'           // Tokens revealed one-by-one; unlabeled push/discard zones

interface Challenge {
  type: ChallengeType
  title: string
  scenario: string          // Narrative, never a step-by-step recipe
  timeLimit: number
  maxSize: number
  initialStack: string[]
  source?: string[]         // original ordered source
  shuffledSource?: string[] // display order (shuffled)
  target?: string[]
  stream?: string[]
  answer?: string           // For string-answer challenges
  constrained?: boolean     // build_target only: disks are sized, bigger-on-smaller is illegal
  displayOrder?: number[]   // bracket_matcher/reverse_string: shuffled render order (processing order is still the original `stream` index order)
}

interface FloatingScore { id: string; value: number; x: number }

/* ── Constants ─────────────────────────────────────────────────────────── */

const ACCENT      = '#FFB830'
const TOTAL_ROUNDS = 5
const POINT_BASE   = 100
const POINT_SPEED  = 50
const POINT_WRONG  = -25
const POINT_HINT   = -35

const DIFFICULTY_CONFIG: Record<Difficulty, {
  label: string; desc: string; time: number; maxSize: number; color: string
}> = {
  easy:   { label: 'Easy',   desc: 'Build target stacks — no constraints',    time: 40,  maxSize: 5, color: '#00D4AA' },
  medium: { label: 'Medium', desc: 'Target stacks, sometimes size-locked',    time: 50,  maxSize: 6, color: '#9B7ED4' },
  hard:   { label: 'Hard',   desc: 'Size-locked stacks, brackets & reversal', time: 65,  maxSize: 7, color: ACCENT    },
  expert: { label: 'Expert', desc: 'Size-locked stacks, postfix & brackets',  time: 85,  maxSize: 8, color: '#FF6B8A' },
}

const TYPES_BY_DIFF: Record<Difficulty, ChallengeType[]> = {
  easy:   ['build_target'],
  medium: ['build_target', 'bracket_matcher'],
  hard:   ['build_target', 'bracket_matcher', 'reverse_string'],
  expert: ['build_target', 'postfix', 'bracket_matcher'],
}

// Chance a build_target round adds the Hanoi size-constraint (bigger disk can
// never sit on a smaller one). Ramps up with difficulty instead of all-or-nothing.
const CONSTRAINT_CHANCE: Record<Difficulty, number> = {
  easy: 0, medium: 0.45, hard: 0.75, expert: 1,
}

const VALUES   = ['A', 'B', 'C', 'D', 'E', 'F', '7', '13', '21', '42']
const OPENERS  = ['(', '[', '{']
const CLOSERS: Record<string,string> = { '(': ')', '[': ']', '{': '}' }
const PAIRS:   Record<string,string> = { ')': '(', ']': '[', '}': '{' }

const FAKE_OPPONENTS = [
  { name: 'Kai',  ops: 0 },
  { name: 'Mira', ops: 0 },
  { name: 'Theo', ops: 0 },
]

/* ── Utilities ─────────────────────────────────────────────────────────── */

function uid()  { return Math.random().toString(36).slice(2, 9) }
// `seededRng` is only passed in real multiplayer runs (seeded from the room's
// shared seed) so every player generates identical rounds. Named separately
// from this file's own `rng(min,max)` int-helper to avoid a naming collision.
function rng(min: number, max: number, seededRng?: SeededRandom) { return seededRng ? seededRng.int(min, max) : Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(arr: T[], seededRng?: SeededRandom) { return arr[rng(0, arr.length - 1, seededRng)] }
function shuffle<T>(arr: T[], seededRng?: SeededRandom) { return seededRng ? seededRng.shuffle(arr) : [...arr].sort(() => Math.random() - 0.5) }
function makeVals(n: number, seededRng?: SeededRandom) { return Array.from({ length: n }, () => pick(VALUES, seededRng)) }
function stackEq(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}
function evalPostfix(a: number, b: number, op: string) {
  if (op === '+') return a + b
  if (op === '-') return a - b
  if (op === '*') return a * b
  return Math.trunc(a / b)
}

/* ── Challenge generator ───────────────────────────────────────────────── */

function buildBracketStream(seededRng?: SeededRandom): { stream: string[]; valid: boolean } {
  const valid = pick([
    '{[()]}', '([{}])', '(([]))', '{[()]}()', '[({})]',
  ], seededRng)
  const invalid = pick([
    '{[(])}', '([)]', '{[}]', '({)}', '[{(]',
  ], seededRng)
  const useValid = seededRng ? seededRng.bool(0.5) : Math.random() > 0.5
  return { stream: (useValid ? valid : invalid).split(''), valid: useValid }
}

const POSTFIX_POOL = [
  { stream: ['3','4','+','2','*'], answer: '14' },
  { stream: ['8','2','/','5','+'], answer: '9'  },
  { stream: ['6','2','3','+','*'], answer: '30' },
  { stream: ['9','5','-','7','+'], answer: '11' },
  { stream: ['2','3','*','4','+'], answer: '10' },
]

function generateChallenge(difficulty: Difficulty, round: number, seededRng?: SeededRandom, forcedType?: ChallengeType): Challenge {
  const cfg = DIFFICULTY_CONFIG[difficulty]
  // Force a specific type in the final round to end with substance — but a
  // room-wide forced type (real multiplayer, so every round + every player
  // matches) always wins over that.
  const forcedFinal: Partial<Record<Difficulty, ChallengeType>> = {
    hard: 'bracket_matcher', expert: 'postfix',
  }
  const type: ChallengeType =
    forcedType ??
    (round === TOTAL_ROUNDS - 1 && forcedFinal[difficulty]
      ? forcedFinal[difficulty]!
      : pick(TYPES_BY_DIFF[difficulty], seededRng))

  /* ── build_target ────────────────────────────────────────────────────── */
  if (type === 'build_target') {
    const constrained = (seededRng ? seededRng.next() : Math.random()) < CONSTRAINT_CHANCE[difficulty]

    if (constrained) {
      // Disks are unique sizes. A valid tower is always biggest-at-bottom,
      // smallest-at-top — the target is a descending subset, but the player
      // has to discover that order themselves; the game never states it.
      const poolSize = Math.min(8, rng(5, 7, seededRng))
      const sizes = Array.from({ length: poolSize }, (_, i) => String(i + 1))
      const targetCount = rng(3, Math.min(poolSize - 1, cfg.maxSize), seededRng)
      const target = shuffle(sizes, seededRng).slice(0, targetCount).sort((a, b) => Number(b) - Number(a))
      const shuffledSource = shuffle(sizes, seededRng)
      return {
        type, title: 'Stack the Disks', constrained,
        scenario: 'Match the ghost stack. A bigger disk can never rest on a smaller one — the tower itself will tell you when a move is illegal. No other hints.',
        timeLimit: cfg.time, maxSize: cfg.maxSize,
        initialStack: [], source: sizes, shuffledSource, target,
      }
    }

    const source = makeVals(rng(4, 6, seededRng), seededRng)
    const target = source.slice(0, rng(2, Math.min(source.length - 1, cfg.maxSize), seededRng))
    const shuffledSource = shuffle(source, seededRng)
    return {
      type, title: 'Build the Tower', constrained: false,
      scenario: 'Match the ghost stack. Any chip can be dragged to PUSH. Drag the top tower block to POP. No indicators — figure it out.',
      timeLimit: cfg.time, maxSize: cfg.maxSize,
      initialStack: [], source, shuffledSource, target,
    }
  }

  /* ── bracket_matcher ─────────────────────────────────────────────────── */
  if (type === 'bracket_matcher') {
    const { stream, valid } = buildBracketStream(seededRng)
    return {
      type, title: 'Bracket Matcher',
      scenario: 'Every token is shuffled on screen and all of them are draggable at once. Drag the one you think comes first in the string to PUSH (if it opens) or POP (if it closes) — pick the wrong one and it bounces back. When done, drag your verdict to ✓ (valid) or ✗ (invalid).',
      timeLimit: cfg.time, maxSize: cfg.maxSize,
      initialStack: [], stream, answer: valid ? 'valid' : 'invalid',
      displayOrder: shuffle(stream.map((_, i) => i), seededRng),
    }
  }

  /* ── reverse_string ──────────────────────────────────────────────────── */
  if (type === 'reverse_string') {
    const word = pick(['CODE', 'LIFO', 'PUSH', 'HEAP', 'NODE'], seededRng)
    const stream = word.split('')
    return {
      type, title: 'Reverse It',
      scenario: `The word "${word}" needs to be reversed using a stack. Every letter is shuffled on screen and all are draggable — drag whichever you think comes first in the word to PUSH. Pick the wrong one and it bounces back. Push all letters first, then pop them into output.`,
      timeLimit: cfg.time, maxSize: cfg.maxSize,
      initialStack: [], stream, answer: stream.slice().reverse().join(''),
      displayOrder: shuffle(stream.map((_, i) => i), seededRng),
    }
  }

  /* ── postfix ─────────────────────────────────────────────────────────── */
  const expr = pick(POSTFIX_POOL, seededRng)
  return {
    type: 'postfix', title: 'Postfix Evaluation',
    scenario: 'Tokens appear one at a time. Drag each to the STACK zone or the OPERATE zone. You decide which — no labels. When the final result is the only item on the stack, you\'re done.',
    timeLimit: cfg.time, maxSize: cfg.maxSize,
    initialStack: [], stream: expr.stream, answer: expr.answer,
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

// FIX: the old version put `onExpire` (a fresh closure every parent render) in the
// effect's dependency array, so the interval reset to full nearly every time the
// parent re-rendered (which happens constantly during drag interactions) — the
// timer effectively never counted down in practice. Now it's read via a ref so the
// effect only reruns when `seconds` actually changes.
// Also: same house rule as Array Blitz / Node Connect — running out no longer force-
// ends the round, it's a solve-fast bonus window only.
function TimerBar({ seconds, onWindowClosed }: { seconds: number; onWindowClosed?: () => void }) {
  const [rem, setRem] = useState(seconds)
  const closedRef = useRef(onWindowClosed)
  closedRef.current = onWindowClosed
  useEffect(() => {
    setRem(seconds)
    const t = setInterval(() => {
      setRem(prev => {
        if (prev <= 1) { clearInterval(t); closedRef.current?.(); return 0 }
        if (prev - 1 <= 5) sfx.tick()
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [seconds])
  const expired = rem <= 0
  const pct   = (rem / seconds) * 100
  const color = expired ? 'rgba(255,255,255,0.25)' : pct > 45 ? ACCENT : pct > 20 ? '#F97316' : '#FF6B8A'
  return (
    <div className="st-timer">
      <Timer size={14} color={color} />
      <div className="st-timer-track">
        <motion.div className="st-timer-fill" style={{ background: color }} animate={{ width: `${pct}%` }} />
      </div>
      <span style={{ color }}>{expired ? 'bonus closed' : `${rem}s`}</span>
    </div>
  )
}

/** Visual stack tower — top block is draggable for pop */
function TowerView({
  stack, maxSize, hot, invalid, onTopDragStart, constrained,
}: {
  stack: string[]; maxSize: number; hot?: boolean; invalid?: boolean; constrained?: boolean
  onTopDragStart?: () => void
}) {
  return (
    <div className={`st-tower-shell ${hot ? 'st-tower-shell--hot' : ''} ${invalid ? 'st-tower-shell--invalid' : ''}`}>
      <div className="st-max-line">MAX {maxSize}</div>
      <div className="st-tower">
        {Array.from({ length: maxSize }).map((_, i) => (
          <div key={i} className="st-slot-guide" style={{ bottom: 16 + i * 46 }} />
        ))}
        <AnimatePresence>
          {stack.map((item, index) => {
            const isTop = index === stack.length - 1
            const n = Number(item)
            const sized = constrained && !Number.isNaN(n)
            const width = sized ? Math.min(260, 90 + n * 22) : undefined
            return (
              <motion.div
                key={`${item}-${index}`}
                className={`st-block ${isTop ? 'st-block--top' : ''} ${isTop && onTopDragStart ? 'st-block--draggable' : ''}`}
                style={sized
                  ? { bottom: 16 + index * 46, left: `calc(50% - ${width! / 2}px)`, right: 'auto', width }
                  : { bottom: 16 + index * 46 }}
                initial={{ y: -80, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -70, opacity: 0, scale: 0.85 }}
                draggable={isTop && !!onTopDragStart}
                onDragStart={isTop && onTopDragStart ? e => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', 'pop-top')
                  onTopDragStart()
                } : undefined}
              >
                {item}
                {isTop && onTopDragStart && <span className="st-drag-hint">↓</span>}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
      <div className="st-base">BOTTOM</div>
    </div>
  )
}

/** Drop zone — accepts drag-over and signals when something is released */
function DropZone({
  label, accent, onDrop, onPopDrop,
}: {
  label: string; accent: string
  onDrop: () => void        // called when a staging chip is dropped
  onPopDrop?: () => void    // called when the tower top block is dropped
}) {
  const [over, setOver] = useState(false)
  return (
    <div
      className={`st-drop-zone ${over ? 'over' : ''}`}
      style={{ '--dz-accent': accent } as React.CSSProperties}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault()
        setOver(false)
        const isPopDrag = e.dataTransfer.getData('text/plain') === 'pop-top'
        if (isPopDrag && onPopDrop) onPopDrop()
        else onDrop()
      }}
    >
      {label}
    </div>
  )
}

/** Draggable token chip */
function TokenChip({ value, onDragStart }: { value: string; onDragStart: () => void }) {
  return (
    <div
      className="st-token-chip"
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
    >
      {value}
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function StackTower() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Player'
  const avatarColor = '#FFB830'
  const mp = useMultiplayerRoom('stack_tower', user?.id, displayName, avatarColor)
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const seededRngRef = useRef<SeededRandom | null>(null)
  const forcedTypeRef = useRef<ChallengeType | null>(null)

  /* Global state */
  const [phase,      setPhase]      = useState<Phase>('lobby')
  const [mode,       setMode]       = useState<Mode>('solo')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')

  /* Round state */
  const [challenge,    setChallenge]    = useState<Challenge | null>(null)
  const [stack,        setStack]        = useState<string[]>([])
  const [sourceIndex,  setSourceIndex]  = useState(0)
  const [streamIndex,  setStreamIndex]  = useState(0)
  const [output,       setOutput]       = useState<string[]>([])
  const [bonusClosed,  setBonusClosed]  = useState(false)
  const [dragToken,    setDragToken]    = useState<string | null>(null)
  const [bracketDone,  setBracketDone]  = useState(false)

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
  const sessionSaved = useRef(false)

  const { muted: sfxMuted, toggle: toggleSfx } = useSfxToggle()

  const isRealMultiplayer = mode === 'multiplayer' && mp.available

  useEffect(() => {
    if (mp.roomDifficulty) setDifficulty(mp.roomDifficulty as Difficulty)
  }, [mp.roomDifficulty])

  useEffect(() => {
    if (isRealMultiplayer && mp.status === 'playing' && mp.start && phase === 'lobby') {
      startGame(mp.start.seed, mp.start.stackTowerChallengeType)
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
      const acc = correct / TOTAL_ROUNDS
      if (acc >= 0.6) sfx.success()
      else sfx.needsWork()

      if (!sessionSaved.current && user?.id) {
        sessionSaved.current = true
        const rank = acc >= 0.8 ? 'S' : acc >= 0.6 ? 'A' : acc >= 0.4 ? 'B' : 'C'
        const sessionInput = {
          gameId: 'stack_tower' as const,
          mode,
          difficulty,
          score,
          correct,
          totalRounds: TOTAL_ROUNDS,
          bestCombo: combo,
          rankLetter: rank,
          badges,
          meta: {
            ops,
            accuracy: acc,
            opponents: mode === 'multiplayer' && !isRealMultiplayer ? opponents : undefined,
          },
        }
        saveGameSession(user.id, sessionInput)
        if (isRealMultiplayer) mp.sendFinish(sessionInput)
      }
    }
  }, [phase])

  useEffect(() => () => { gameMusic.stop() }, [])

  const cfg       = DIFFICULTY_CONFIG[difficulty]
  const activeToken = challenge?.stream?.[streamIndex]

  /* ── Hint text ── */
  const hintText = useMemo(() => {
    if (!challenge) return ''
    if (challenge.type === 'build_target')
      return challenge.constrained
        ? `Target stack bottom→top: ${(challenge.target ?? []).join(', ')}. Push biggest-first — a disk can only go on top of a larger one.`
        : `Target stack bottom→top: ${(challenge.target ?? []).join(', ')}. Push chips from staging, pop extras off the tower.`
    if (challenge.type === 'bracket_matcher')
      return 'Opening brackets push. A closing bracket must match the bracket currently on top — if it does, pop it. If not, the string is invalid.'
    if (challenge.type === 'reverse_string')
      return 'Push ALL characters first. Then pop them into output. Popping reverses LIFO order.'
    if (challenge.type === 'postfix')
      return 'Numbers go onto the stack. An operator pops two numbers, computes, pushes the result.'
    return ''
  }, [challenge])

  /* ── Helpers ── */
  function spawnFloat(val: number) {
    const id = uid()
    setFloatingScores(prev => [...prev, { id, value: val, x: rng(25, 75) }])
    setTimeout(() => setFloatingScores(prev => prev.filter(f => f.id !== id)), 950)
  }

  function loadChallenge(r: number) {
    const c = generateChallenge(difficulty, r, seededRngRef.current ?? undefined, forcedTypeRef.current ?? undefined)
    setChallenge(c)
    setStack(c.initialStack)
    setSourceIndex(0)
    setStreamIndex(0)
    setOutput([])
    setBonusClosed(false)
    setDragToken(null)
    setBracketDone(false)
    setFeedback(null)
    setHintUsed(false)
    setHintVisible(false)
    setWrongMsg(null)
    runStart.current = Date.now()
  }

  function startGame(seed?: string, forcedType?: ChallengeType) {
    sfx.submit()
    gameMusic.play()
    sessionSaved.current = false
    seededRngRef.current = seed ? new SeededRandom(seed) : null
    forcedTypeRef.current = forcedType ?? null
    setScore(0); setCombo(0); setRound(0); setCorrect(0); setOps(0); setBadges([])
    if (mode === 'multiplayer' && !seed) {
      setOpponents(FAKE_OPPONENTS.map(o => ({ ...o, ops: rng(8, 18) })))
    }
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
    if (challenge?.type === 'bracket_matcher' && nextCombo >= 2)     earned.add('Bracket Boss')
    if (challenge?.type === 'postfix')                                earned.add('Postfix Pro')
    if (challenge?.type === 'build_target' && challenge.constrained)  earned.add('Rule Keeper')
    if (nextCombo >= 3)                                               earned.add('On Fire 🔥')
    setBadges([...earned])
    if (isRealMultiplayer) mp.sendRoundDone(round, ops, true)
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

  /* ── build_target: push a specific value, pop top ── */
  function handleBuildPush(value: string) {
    if (!challenge) return
    // Check the value is still available in source (not yet pushed)
    const inSource = (challenge.source ?? []).filter(v => v === value).length
    const inStack  = stack.filter(v => v === value).length
    if (inStack >= inSource) { wrong(`“${value}” has already been pushed the maximum number of times.`); return }
    if (stack.length >= challenge.maxSize) { wrong('Stack overflow — tower is full.'); return }
    if (challenge.constrained) {
      const top = stack.at(-1)
      if (top !== undefined && Number(value) >= Number(top)) {
        wrong(`Disk ${value} is too big to rest on disk ${top}.`)
        return
      }
    }
    const next = [...stack, value]
    setStack(next)
    setOps(prev => prev + 1)
    sfx.place()
    if (challenge.target && stackEq(next, challenge.target)) completeRound()
  }

  function handleBuildPop() {
    if (!challenge) return
    if (stack.length === 0) { wrong('Stack underflow — nothing to pop.'); return }
    const next = stack.slice(0, -1)
    setStack(next)
    setOps(prev => prev + 1)
    sfx.place()
    if (challenge.target && stackEq(next, challenge.target)) completeRound()
  }

  /* ── bracket_matcher: drag token to push/pop zone ── */
  function handleBracketPush(origIndex: number) {
    if (!challenge?.stream || bracketDone) return
    if (origIndex !== streamIndex) { wrong('Not next yet — that token comes later (or earlier) in the string.'); return }
    const tok = challenge.stream[origIndex]
    if (!OPENERS.includes(tok)) { wrong(`"${tok}" is a closer — it should go to the POP zone.`); return }
    if (stack.length >= challenge.maxSize) { wrong('Stack overflow during bracket matching.'); return }
    setStack(prev => [...prev, tok])
    setStreamIndex(prev => prev + 1)
    setOps(prev => prev + 1)
    sfx.place()
    if (streamIndex + 1 >= challenge.stream.length) setBracketDone(true)
  }

  function handleBracketPop(origIndex: number) {
    if (!challenge?.stream || bracketDone) return
    if (origIndex !== streamIndex) { wrong('Not next yet — that token comes later (or earlier) in the string.'); return }
    const tok = challenge.stream[origIndex]
    if (OPENERS.includes(tok)) { wrong(`"${tok}" is an opener — drag it to the PUSH zone.`); return }
    const expected = PAIRS[tok]
    if (stack.at(-1) !== expected) {
      // A real mismatch IS the invalidity signal, exactly like the actual algorithm —
      // it's not something to retry past. Stop here and let the player submit ✗.
      wrong(`"${tok}" needs "${expected}" on top. Got "${stack.at(-1) ?? 'empty'}" — that's your break. Drag your verdict.`)
      setOps(prev => prev + 1)
      setBracketDone(true)
      return
    }
    setStack(prev => prev.slice(0, -1))
    setStreamIndex(prev => prev + 1)
    setOps(prev => prev + 1)
    sfx.place()
    if (streamIndex + 1 >= challenge.stream.length) setBracketDone(true)
  }

  function handleBracketVerdict(v: 'valid' | 'invalid') {
    if (!challenge) return
    const actuallyValid = stack.length === 0
    if (v === challenge.answer) completeRound()
    else wrong(actuallyValid ? 'The stream is actually valid — stack is empty.' : 'The stream is invalid — unmatched brackets remain.')
  }

  /* ── reverse_string ── */
  function handleReversePush(origIndex: number) {
    if (!challenge?.stream) return
    if (origIndex !== streamIndex) { wrong('Not next yet — that letter comes later (or earlier) in the word.'); return }
    if (stack.length >= challenge.maxSize) { wrong('Stack overflow.'); return }
    setStack(prev => [...prev, challenge.stream![origIndex]])
    setStreamIndex(prev => prev + 1)
    setOps(prev => prev + 1)
    sfx.place()
  }

  function handleReversePop() {
    if (!challenge) return
    if (streamIndex < (challenge.stream?.length ?? 0)) { wrong('Push all characters first before popping.'); return }
    if (stack.length === 0) { wrong('Nothing left to pop.'); return }
    const val = stack.at(-1)!
    const next = stack.slice(0, -1)
    const nextOut = [...output, val]
    setStack(next)
    setOutput(nextOut)
    setOps(prev => prev + 1)
    sfx.place()
    if (nextOut.join('') === challenge.answer) completeRound()
  }

  /* ── postfix ── */
  function handlePostfixStack() {
    if (!challenge || !activeToken) return
    const isNum = !Number.isNaN(Number(activeToken))
    if (!isNum) { wrong(`"${activeToken}" is an operator — drag it to OPERATE.`); return }
    if (stack.length >= challenge.maxSize) { wrong('Operand stack overflow.'); return }
    setStack(prev => [...prev, activeToken])
    setStreamIndex(prev => prev + 1)
    setOps(prev => prev + 1)
    sfx.place()
  }

  function handlePostfixOperate() {
    if (!challenge || !activeToken) return
    const isNum = !Number.isNaN(Number(activeToken))
    if (isNum) { wrong(`"${activeToken}" is a number — drag it to STACK.`); return }
    if (stack.length < 2) { wrong('An operator needs two operands on the stack.'); return }
    const right  = Number(stack.at(-1))
    const left   = Number(stack.at(-2))
    const result = String(evalPostfix(left, right, activeToken))
    const next   = [...stack.slice(0, -2), result]
    setStack(next)
    setStreamIndex(prev => prev + 1)
    setOps(prev => prev + 1)
    sfx.place()
    if (streamIndex + 1 >= (challenge.stream?.length ?? 0) && next[0] === challenge.answer) completeRound()
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LOBBY
  ════════════════════════════════════════════════════════════════════════ */
  if (phase === 'lobby') {
    return (
      <div className="st-page">
        <div className="st-grid-bg" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button className="st-back-btn" style={{ marginBottom: 0 }} onClick={() => navigate('/student/games')}>
            <ArrowLeft size={15} /> Back
          </button>
          <button className="st-sfx-toggle" onClick={toggleSfx} title={sfxMuted ? 'Unmute sound' : 'Mute sound'}>
            {sfxMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
        <section className="st-lobby">
          <motion.div className="st-logo-tower" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>
            <span /><span /><span /><span />
          </motion.div>
          <h1>STACK TOWER</h1>
          <p className="st-lobby-sub">MODULE 03 · STACKS</p>
          <p className="st-lobby-desc">
            No multiple choice. You're shown a target stack and figure out the push/pop
            order yourself. Higher difficulties lock in a real constraint — a bigger disk
            can never rest on a smaller one, so the size of every disk matters.
          </p>

          <div className="st-selector">
            <button className={mode === 'solo' ? 'active' : ''} onClick={() => selectMode('solo')}>
              <Zap size={18} /> Solo
            </button>
            <button className={mode === 'multiplayer' ? 'active' : ''} onClick={() => selectMode('multiplayer')}>
              <Users size={18} /> {mp.available ? 'Multiplayer' : 'Multiplayer (AI bots)'}
            </button>
          </div>

          {(!isRealMultiplayer || mp.status === 'idle' || mp.status === 'error') && (
            <div className="st-diff-grid">
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
          )}

          {!isRealMultiplayer && (
            <motion.button className="st-start-btn" onClick={() => startGame()} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Flame size={20} /> Start Tower Run
            </motion.button>
          )}

          {isRealMultiplayer && mp.status === 'idle' && (
            <div className="st-mp-room-actions">
              <motion.button className="st-start-btn" onClick={() => { sfx.submit(); mp.createRoom(difficulty) }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Users size={18} /> Create Room
              </motion.button>
              <div className="st-mp-join-row">
                <input className="st-mp-code-input" placeholder="ROOM CODE" maxLength={5}
                  value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} />
                <button onClick={() => { sfx.submit(); mp.joinRoom(roomCodeInput) }} disabled={roomCodeInput.length < 5}
                  style={{ padding: '0 20px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Join Room
                </button>
              </div>
            </div>
          )}

          {isRealMultiplayer && mp.status === 'error' && (
            <div className="st-mp-room-actions">
              <p style={{ color: '#FF6B8A', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{mp.errorMessage}</p>
              <div className="st-mp-join-row">
                <input className="st-mp-code-input" placeholder="ROOM CODE" maxLength={5}
                  value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} />
                <button onClick={() => mp.joinRoom(roomCodeInput)} disabled={roomCodeInput.length < 5}
                  style={{ padding: '0 20px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Try Again
                </button>
              </div>
            </div>
          )}

          {isRealMultiplayer && mp.status === 'lobby' && (
            <div className="st-mp-room-actions">
              <p className="st-lobby-sub">ROOM {mp.roomCode}</p>
              <p className="st-lobby-desc">
                Share this code with a classmate. Waiting for {Math.max(0, mp.minPlayers - mp.players.length)} more player(s) — no bots, real race only. Everyone gets the same challenge type this run.
              </p>
              <div className="st-mp-room-players">
                {mp.players.map(p => (
                  <div key={p.userId}>
                    <b>{p.name}{p.userId === user?.id ? ' (You)' : ''}</b>
                    <em style={p.ready ? { color: '#00D4AA' } : {}}>{p.ready ? 'READY' : 'NOT READY'}</em>
                  </div>
                ))}
              </div>
              <motion.button className="st-start-btn" disabled={!!mp.players.find(p => p.userId === user?.id)?.ready}
                onClick={() => { sfx.submit(); mp.setReady() }}>
                <CheckCircle size={18} /> {mp.players.find(p => p.userId === user?.id)?.ready ? 'Waiting for others' : 'Ready Up'}
              </motion.button>
              <button onClick={() => mp.leaveRoom()}
                style={{ padding: '12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', fontFamily: 'Orbitron, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Leave Room
              </button>
            </div>
          )}

          {isRealMultiplayer && mp.status === 'starting' && (
            <p className="st-lobby-desc">Everyone's ready. Starting…</p>
          )}
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
      ? (isRealMultiplayer
          ? (mp.results ? mp.results.map(r => ({ name: r.name, ops: r.score, isMe: r.userId === user?.id })) : [])
          : [{ name: 'You', ops, isMe: true }, ...opponents.map(o => ({ ...o, isMe: false }))].sort((a, b) => a.ops - b.ops))
      : []
    const waitingForOpponents = isRealMultiplayer && !mp.results
    return (
      <div className="st-page st-page--result">
        <div className="st-grid-bg" />
        <div className="st-result">
          <div className="st-result-rank">{rank}</div>
          <p className="st-result-label">TOTAL XP</p>
          <h2><CountUp target={score} /></h2>
          <div className="st-result-stats">
            <span><CheckCircle size={14} /> {correct}/{TOTAL_ROUNDS}</span>
            <span><Swords size={14} /> {ops} ops</span>
            <span><Zap size={14} /> {accuracy}%</span>
          </div>
          {badges.length > 0 && (
            <div className="st-badges">
              {badges.map(b => <span key={b}>{b}</span>)}
            </div>
          )}
          {waitingForOpponents && (
            <p className="st-lobby-desc">Waiting for the other player to finish…</p>
          )}
          {ranked.length > 0 && (
            <div className="st-race-results">
              {ranked.map((p, i) => (
                <div key={p.name} className={p.isMe ? 'me' : ''}>
                  <b>#{i + 1}</b><span>{p.name}</span><em>{p.ops} ops</em>
                </div>
              ))}
            </div>
          )}
          <div className="st-result-actions">
            <button onClick={() => { if (mp.roomCode) mp.leaveRoom(); setPhase('lobby') }}><RotateCcw size={15} /> Play Again</button>
            <button className="primary" onClick={() => navigate('/student/games')}>Games Lobby</button>
          </div>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PLAYING
  ════════════════════════════════════════════════════════════════════════ */

  const isDrag   = challenge && ['build_target','bracket_matcher','reverse_string','postfix'].includes(challenge.type)
  const showStack= challenge && ['build_target','bracket_matcher','reverse_string','postfix'].includes(challenge.type)

  return (
    <div className={`st-page st-page--playing ${shake ? 'st-shake' : ''}`}>
      <div className="st-grid-bg" />

      {/* HUD */}
      <div className="st-hud">
        <button className="st-back-btn" onClick={() => { gameMusic.stop(); if (mp.roomCode) mp.leaveRoom(); setPhase('lobby') }}><ArrowLeft size={14} /></button>
        <div className="st-score"><Zap size={14} /> {score.toLocaleString()}</div>
        <div className="st-rounds">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <span key={i} className={i < round ? 'done' : i === round ? 'active' : ''} />
          ))}
        </div>
        <button className="st-sfx-toggle" onClick={toggleSfx} title={sfxMuted ? 'Unmute sound' : 'Mute sound'}>
          {sfxMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
        <span className="st-pill" style={{ color: cfg.color, borderColor: `${cfg.color}55` }}>{cfg.label}</span>
        {combo >= 2 && <span className="st-pill st-combo">×{combo}</span>}
        {mode === 'multiplayer' && <span className="st-pill"><Users size={11} /> {isRealMultiplayer ? 'Live Race' : 'AI Race'}</span>}
      </div>

      <main className={`st-arena ${shake ? 'st-arena--shake' : ''}`}>
        <TimerBar key={`${round}-${challenge?.type}`} seconds={challenge?.timeLimit ?? cfg.time} onWindowClosed={() => setBonusClosed(true)} />

        {/* Instruction */}
        <div className="st-instruction">
          <span>{challenge?.title ?? ''}</span>
          <p>{challenge?.scenario ?? ''}</p>
          <button className="st-hint-btn" onClick={useHint} disabled={hintUsed}>
            <HelpCircle size={13} /> {hintUsed ? 'Hint used' : 'Hint (−35 pts)'}
          </button>
          {bonusClosed && <span className="st-bonus-closed-label">— speed bonus window closed, take your time</span>}
          {hintVisible && <p className="st-hint">{hintText}</p>}
          {wrongMsg && (
            <p className="st-expected"><AlertTriangle size={12} /> {wrongMsg}</p>
          )}
        </div>

        {/* Feedback overlay */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              className={`st-feedback ${feedback}`}
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
        <div className="st-floating-wrap" aria-hidden>
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

        {/* ── Drag-based layout ── */}
        {isDrag && (
          <div className="st-drag-area">
            {/* Left: staging / token stream */}
            <section className="st-panel">
              <span className="st-panel-label">
                {challenge!.type === 'build_target' ? 'STAGING' : 'TOKEN STREAM'}
              </span>

              {/* build_target: all chips shuffled, all draggable */}
              {challenge!.type === 'build_target' && (
                <div className="st-chip-row">
                  {(challenge!.shuffledSource ?? challenge!.source ?? []).map((v, i) => (
                    <div
                      key={`${v}-${i}`}
                      className="st-token-chip"
                      style={challenge!.constrained && !Number.isNaN(Number(v)) ? { width: Math.min(90, 30 + Number(v) * 8) } : undefined}
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

              {/* bracket_matcher / reverse_string: stream with current token highlighted */}
              {(challenge!.type === 'bracket_matcher' || challenge!.type === 'reverse_string') && (
                <div className="st-stream">
                  {(challenge!.displayOrder ?? (challenge!.stream ?? []).map((_, i) => i)).map(origIndex => {
                    const t = challenge!.stream![origIndex]
                    const done = origIndex < streamIndex
                    return (
                      <span
                        key={origIndex}
                        className={done ? 'done' : 'pending'}
                        draggable={!done}
                        onDragStart={!done ? e => {
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', String(origIndex))
                          sfx.pick()
                          setDragToken(String(origIndex))
                        } : undefined}
                      >
                        {t}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* postfix: reveal one token at a time */}
              {challenge!.type === 'postfix' && (
                <div className="st-postfix-reveal">
                  <span className="st-panel-label">CURRENT TOKEN</span>
                  <AnimatePresence mode="wait">
                    {activeToken ? (
                      <motion.div
                        key={streamIndex}
                        className="st-postfix-token"
                        initial={{ y: -24, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 24, opacity: 0 }}
                        draggable
                        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', activeToken ?? ''); sfx.pick(); setDragToken(activeToken) }}
                      >
                        {activeToken}
                      </motion.div>
                    ) : (
                      <motion.div key="done" className="st-postfix-token done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        ✓ all tokens processed
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="st-stream st-stream--mini">
                    {(challenge!.stream ?? []).map((t, i) => (
                      <span key={`${t}-${i}`} className={i < streamIndex ? 'done' : i === streamIndex ? 'active' : ''}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Middle: tower */}
            {showStack && (
              <div className="st-tower-col">
                <TowerView
                  stack={stack}
                  maxSize={challenge!.maxSize}
                  hot={combo >= 3}
                  invalid={shake}
                  constrained={challenge!.constrained}
                  onTopDragStart={(challenge!.type === 'build_target' || challenge!.type === 'reverse_string') && stack.length > 0 ? () => {
                    // mark that the next drop is a pop
                    sfx.pick()
                    setDragToken('__pop__')
                  } : undefined}
                />
                {/* Drop zones below the tower */}
                <div className="st-dz-row">
                  <DropZone
                    label="PUSH ↑"
                    accent="#FFB830"
                    onDrop={() => {
                      if (!challenge) return
                      if (challenge.type === 'build_target')    handleBuildPush(dragToken ?? '')
                      if (challenge.type === 'bracket_matcher') handleBracketPush(Number(dragToken))
                      if (challenge.type === 'reverse_string')  handleReversePush(Number(dragToken))
                      if (challenge.type === 'postfix')         handlePostfixStack()
                      setDragToken(null)
                    }}
                  />
                  <DropZone
                    label="POP ↓"
                    accent="#FF6B8A"
                    onDrop={() => {
                      if (!challenge) return
                      if (challenge.type === 'bracket_matcher') handleBracketPop(Number(dragToken))
                      if (challenge.type === 'reverse_string')  handleReversePop()
                      if (challenge.type === 'postfix')         handlePostfixOperate()
                      setDragToken(null)
                    }}
                    onPopDrop={challenge?.type === 'build_target' ? () => {
                      // tower top was dragged to pop zone
                      handleBuildPop()
                      setDragToken(null)
                    } : undefined}
                  />
                </div>

                {/* Bracket verdict drag targets */}
                {challenge!.type === 'bracket_matcher' && bracketDone && (
                  <div className="st-verdict-row">
                    <span className="st-panel-label">DRAG YOUR VERDICT</span>
                    <div className="st-verdict-chips">
                      <div
                        className="st-verdict-chip valid"
                        draggable
                        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; sfx.pick(); setDragToken('valid') }}
                      >
                        ✓ Valid
                      </div>
                      <div
                        className="st-verdict-chip invalid"
                        draggable
                        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; sfx.pick(); setDragToken('invalid') }}
                      >
                        ✗ Invalid
                      </div>
                    </div>
                    <div className="st-verdict-dz-row">
                      <DropZone
                        label="Drop verdict here"
                        accent="#9B7ED4"
                        onDrop={() => {
                          if (dragToken === 'valid' || dragToken === 'invalid') {
                            handleBracketVerdict(dragToken)
                            setDragToken(null)
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Right: target or output */}
            <section className="st-panel st-target-panel">
              {challenge!.type === 'build_target' && (
                <>
                  <span className="st-panel-label">TARGET</span>
                  <div className="st-ghost-stack">
                    {(challenge!.target ?? []).map((v, i) => (
                      <span key={`${v}-${i}`}>{v}</span>
                    ))}
                  </div>
                </>
              )}
              {(challenge!.type === 'reverse_string') && (
                <>
                  <span className="st-panel-label">OUTPUT</span>
                  <div className="st-output">{output.join('') || '...'}</div>
                  <div className="st-output-target">
                    <span className="st-panel-label">GOAL</span>
                    <div className="st-output">{challenge!.answer}</div>
                  </div>
                </>
              )}
              {challenge!.type === 'postfix' && (
                <>
                  <span className="st-panel-label">TARGET RESULT</span>
                  <div className="st-output">{challenge!.answer}</div>
                  <span className="st-panel-label" style={{ marginTop: 12 }}>CURRENT STACK</span>
                  <div className="st-output" style={{ fontSize: 14 }}>{stack.join(', ') || '—'}</div>
                </>
              )}
              {challenge!.type === 'bracket_matcher' && (
                <>
                  <span className="st-panel-label">STACK SO FAR</span>
                  <div className="st-output" style={{ fontSize: 14 }}>{stack.join(' ') || 'empty'}</div>
                  <span className="st-panel-label" style={{ marginTop: 12 }}>PROGRESS</span>
                  <div className="st-output" style={{ fontSize: 14 }}>{streamIndex} / {challenge!.stream?.length ?? 0}</div>
                </>
              )}
            </section>
          </div>
        )}

        {/* Multiplayer race */}
        {mode === 'multiplayer' && (
          <div className="st-mp">
            <span><Swords size={12} /> {isRealMultiplayer ? 'Live ops race' : 'Live ops race vs AI'}</span>
            {(isRealMultiplayer
              ? mp.players.map(p => ({
                  name: p.userId === user?.id ? 'You' : p.name,
                  ops: p.userId === user?.id ? ops : (mp.opponentProgress[p.userId]?.value ?? 0),
                }))
              : [{ name: 'You', ops }, ...opponents]
            ).map(p => (
              <div key={p.name}><b>{p.name}</b><em>{p.ops} ops</em></div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
