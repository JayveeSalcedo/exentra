import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Zap, Timer, CheckCircle,
  User, Users, HelpCircle, RotateCcw, RotateCw, ChevronRight, Swords, Bot,
  ArrowLeftRight, Trash2, PlusSquare, Target, Sparkles, Undo2, Volume2, VolumeX,
} from 'lucide-react'
import { useAuth } from '../../../store/AuthContext'
import { sfx, gameMusic, useSfxToggle } from '../../../lib/sfx'
import { saveGameSession } from '../../../lib/gameSessions'
import { useMultiplayerRoom } from '../../../lib/multiplayer'
import { SeededRandom } from '../../../lib/seededRandom'
import './ArrayBlitz.css'

// ─── Types ───────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type Mode = 'solo' | 'multiplayer'
type Phase = 'lobby' | 'playing' | 'result'
type PowerupId = 'time_cache' | 'score_surge' | 'free_hint'
type OpType = 'swap' | 'delete' | 'insert' | 'rotateLeft' | 'rotateRight'

interface ArrayElement { id: string; value: string | number }

interface Challenge {
  start: ArrayElement[]
  goal: ArrayElement[]
  parMoves: number
  timeLimit: number
  opsAllowed: OpType[]
  insertPool: ArrayElement[]
}

interface FloatingScore { id: string; value: number; x: number; y: number }
interface RunMission { id: string; label: string; target: number; reward: number }
interface Powerup { id: PowerupId; label: string; desc: string }
interface HintSuggestion { text: string; indices: number[] }
interface HistorySnapshot { current: ArrayElement[]; insertPool: ArrayElement[]; movesUsed: number }

// ─── Constants ─────────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG: Record<Difficulty, {
  size: [number, number]; par: number; time: number; label: string; color: string; icon: string; desc: string
  ops: OpType[]
}> = {
  easy:   { size: [4, 5], par: 2, time: 40, label: 'Easy',   color: '#00D4AA', icon: '🟢', desc: 'Swap & rotate only',        ops: ['swap', 'rotateLeft', 'rotateRight'] },
  medium: { size: [5, 6], par: 3, time: 50, label: 'Medium', color: '#9B7ED4', icon: '🟣', desc: 'Adds delete',               ops: ['swap', 'rotateLeft', 'rotateRight', 'delete'] },
  hard:   { size: [6, 7], par: 4, time: 60, label: 'Hard',   color: '#FFB830', icon: '🟡', desc: 'Adds insert',               ops: ['swap', 'rotateLeft', 'rotateRight', 'delete', 'insert'] },
  expert: { size: [7, 8], par: 5, time: 75, label: 'Expert', color: '#FF6B8A', icon: '🔴', desc: 'Bigger arrays, tighter par', ops: ['swap', 'rotateLeft', 'rotateRight', 'delete', 'insert'] },
}

const POINT_HINT = -30
const POINT_SPEED_BONUS = 40
const TOTAL_ROUNDS = 5
const BOSS_BONUS = 150

const RUN_MISSIONS: RunMission[] = [
  { id: 'under-par-2', label: 'Solve 2 rounds at or under par', target: 2, reward: 250 },
  { id: 'no-hints',    label: 'Finish with no hints',            target: 0, reward: 200 },
  { id: 'solved-4',    label: 'Fully solve 4 rounds',            target: 4, reward: 300 },
]

const POWERUPS: Powerup[] = [
  { id: 'time_cache',  label: 'Time Cache',  desc: '+10 seconds on this round' },
  { id: 'score_surge', label: 'Score Surge', desc: 'Double your next round score' },
  { id: 'free_hint',   label: 'Free Hint',   desc: 'Reveal the next move, no XP cost' },
]

const FAKE_OPPONENTS = [
  { id: 'bot1', name: 'Alex [AI]', avatar: 'AI', color: '#9B7ED4' },
  { id: 'bot2', name: 'Sam [AI]',  avatar: 'AI', color: '#FFB830' },
  { id: 'bot3', name: 'Rea [AI]',  avatar: 'AI', color: '#FF6B8A' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

// `rng` is only passed in real multiplayer runs (seeded from the room's shared
// seed, so every player generates identical rounds). Solo/practice-vs-bots
// omits it and falls back to Math.random() exactly as before.
function randomInt(min: number, max: number, rng?: SeededRandom) {
  if (rng) return rng.int(min, max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function uid() { return Math.random().toString(36).slice(2, 8) }
function randomValue(rng?: SeededRandom): string | number {
  const isNum = rng ? rng.bool(0.5) : Math.random() > 0.5
  return isNum
    ? randomInt(1, 99, rng)
    : ['apple','blue','cat','delta','echo','fox','green','hat','ink','java'][randomInt(0, 9, rng)]
}
function makeArray(size: number, rng?: SeededRandom): ArrayElement[] {
  return Array.from({ length: size }, () => ({ id: uid(), value: randomValue(rng) }))
}
function cloneArr(arr: ArrayElement[]): ArrayElement[] {
  return arr.map(e => ({ ...e }))
}

// ─── Challenge generation ─────────────────────────────────────────────────
// Start with a random array, then apply N random ops to derive the goal.
// This guarantees the goal is reachable in exactly N moves (the "par").

function generateChallenge(difficulty: Difficulty, bossRound = false, rng?: SeededRandom): Challenge {
  const cfg = DIFFICULTY_CONFIG[difficulty]
  const size = randomInt(cfg.size[0], cfg.size[1], rng)
  const start = makeArray(size, rng)
  let working = cloneArr(start)
  const numOps = bossRound ? cfg.par + 2 : cfg.par
  const insertedValues: ArrayElement[] = []
  const minSize = Math.max(3, size - 2)
  const maxSize = size + 2

  let attempts = 0
  let opsApplied = 0
  while (opsApplied < numOps && attempts < numOps * 6) {
    attempts++
    const candidates = cfg.ops.filter(op => {
      if (op === 'delete' && working.length <= minSize) return false
      if (op === 'insert' && working.length >= maxSize) return false
      if ((op === 'swap') && working.length < 2) return false
      return true
    })
    if (candidates.length === 0) break
    const op = candidates[randomInt(0, candidates.length - 1, rng)]

    if (op === 'swap') {
      const i = randomInt(0, working.length - 1, rng)
      let j = randomInt(0, working.length - 1, rng)
      if (i === j) { opsApplied--; continue }
      const tmp = working[i]; working[i] = working[j]; working[j] = tmp
    } else if (op === 'rotateLeft') {
      working.push(working.shift()!)
    } else if (op === 'rotateRight') {
      working.unshift(working.pop()!)
    } else if (op === 'delete') {
      const i = randomInt(0, working.length - 1, rng)
      working.splice(i, 1)
    } else if (op === 'insert') {
      const el: ArrayElement = { id: uid(), value: randomValue(rng) }
      const i = randomInt(0, working.length, rng)
      working.splice(i, 0, el)
      insertedValues.push(el)
    }
    opsApplied++
  }

  const goal = working
  // insertPool = values the player will need to add back to go start -> goal
  const insertPool = insertedValues.map(v => ({ id: uid(), value: v.value }))

  return { start, goal, parMoves: Math.max(1, opsApplied), timeLimit: cfg.time, opsAllowed: cfg.ops, insertPool }
}

function computeMatch(current: ArrayElement[], goal: ArrayElement[]) {
  const len = Math.max(current.length, goal.length, 1)
  let m = 0
  for (let i = 0; i < len; i++) {
    if (current[i] && goal[i] && current[i].value === goal[i].value) m++
  }
  return m / len
}
function isFullMatch(current: ArrayElement[], goal: ArrayElement[]) {
  return current.length === goal.length && computeMatch(current, goal) === 1
}

function suggestHint(current: ArrayElement[], goal: ArrayElement[], insertPool: ArrayElement[]): HintSuggestion {
  if (current.length > goal.length) {
    const idx = current.length - 1
    return { text: `Try deleting index ${idx}`, indices: [idx] }
  }
  if (current.length < goal.length && insertPool.length > 0) {
    let mismatchIdx = current.length
    for (let i = 0; i < current.length; i++) {
      if (current[i].value !== goal[i]?.value) { mismatchIdx = i; break }
    }
    return { text: `Try inserting "${insertPool[0].value}" near index ${mismatchIdx}`, indices: [mismatchIdx] }
  }
  for (let i = 0; i < current.length; i++) {
    if (current[i].value !== goal[i]?.value) {
      const swapWith = current.findIndex((el, j) => j > i && el.value === goal[i].value)
      if (swapWith !== -1) return { text: `Try swapping index ${i} and ${swapWith}`, indices: [i, swapWith] }
      return { text: `Try rotating — index ${i} doesn't belong here`, indices: [i] }
    }
  }
  return { text: 'Rotate to bring elements into place', indices: [] }
}

// ─── Slot ──────────────────────────────────────────────────────────────────

function Slot({ el, index, matched, selected, hint, ghost, clickable, compact, onClick }: {
  el?: ArrayElement; index: number
  matched?: boolean; selected?: boolean; hint?: boolean; ghost?: boolean
  clickable?: boolean; compact?: boolean; onClick?: () => void
}) {
  const cls = ['ab-slot',
    matched   ? 'ab-slot--matched'   : '',
    selected  ? 'ab-slot--selected'  : '',
    hint      ? 'ab-slot--hint'      : '',
    ghost     ? 'ab-slot--ghost'     : '',
    clickable ? 'ab-slot--clickable' : '',
    compact   ? 'ab-slot--compact'   : '',
  ].filter(Boolean).join(' ')

  return (
    <motion.div className={cls} onClick={onClick}
      layout
      whileHover={clickable ? { y: -4, scale: 1.05 } : {}}
      whileTap={clickable ? { scale: 0.95 } : {}}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
    >
      <div className="ab-slot-inner">
        <span className="ab-slot-value">{el ? String(el.value) : ''}</span>
      </div>
      <span className="ab-slot-index">[{index}]</span>
    </motion.div>
  )
}

// ─── TimerBar ─────────────────────────────────────────────────────────────

// Note: this timer no longer ends the round when it hits 0 — it's a solve-fast
// bonus window. Running out just closes the bonus, it never blocks play, since
// this is a puzzle and forcing an end mid-thought would be counterproductive.
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
  const color = expired ? 'rgba(255,255,255,0.25)' : pct > 50 ? '#00D4AA' : pct > 25 ? '#FFB830' : '#FF6B8A'

  return (
    <div className={`ab-timer-wrap ${urgent ? 'ab-timer--urgent' : ''}`}>
      <Timer size={14} color={color} />
      <div className="ab-timer-track">
        <motion.div className="ab-timer-fill" style={{ background: color }}
          animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'linear' }} />
      </div>
      <motion.span className="ab-timer-num" style={{ color }}
        animate={urgent ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={urgent ? { repeat: Infinity, duration: 0.5 } : {}}>
        {expired ? 'bonus closed' : `${remaining}s`}
      </motion.span>
    </div>
  )
}

// ─── CountUp ──────────────────────────────────────────────────────────────

function CountUp({ target }: { target: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const steps = 40
    const inc = target / steps
    const t = setInterval(() => {
      start += inc
      if (start >= target) { setDisplay(target); clearInterval(t) }
      else setDisplay(Math.floor(start))
    }, 30)
    return () => clearInterval(t)
  }, [target])
  return <>{display.toLocaleString()}</>
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ArrayBlitz() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Player'
  const avatarColor = '#00D4AA'
  const mp = useMultiplayerRoom('array_blitz', user?.id, displayName, avatarColor)
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const seededRngRef = useRef<SeededRandom | null>(null)

  const [phase,      setPhase]      = useState<Phase>('lobby')
  const [mode,       setMode]       = useState<Mode>('solo')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')

  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [current,   setCurrent]   = useState<ArrayElement[]>([])
  const [insertPool, setInsertPool] = useState<ArrayElement[]>([])
  const [movesUsed, setMovesUsed] = useState(0)

  const [activeTool,      setActiveTool]      = useState<OpType | null>(null)
  const [selectedIndex,   setSelectedIndex]   = useState<number | null>(null)
  const [armedChipId,     setArmedChipId]     = useState<string | null>(null)

  const [score,          setScore]          = useState(0)
  const [combo,          setCombo]          = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [correct,        setCorrect]        = useState(0)
  const [roundEfficiencies, setRoundEfficiencies] = useState<number[]>([])
  const [feedback,       setFeedback]       = useState<'solved' | null>(null)
  const [hintUsed,       setHintUsed]       = useState(false)
  const [hintSuggestion, setHintSuggestion] = useState<HintSuggestion | null>(null)
  const [roundStartTime, setRoundStartTime] = useState(Date.now())
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([])
  const [mission,        setMission]        = useState<RunMission>(RUN_MISSIONS[0])
  const [missionPaid,    setMissionPaid]    = useState(false)
  const [bestStreak,     setBestStreak]     = useState(0)
  const [hintsUsedCount, setHintsUsedCount] = useState(0)
  const [powerupChoices, setPowerupChoices] = useState<Powerup[]>([])
  const [doubleNext,     setDoubleNext]     = useState(false)
  const [history,        setHistory]        = useState<HistorySnapshot[]>([])
  const [bonusClosed,    setBonusClosed]    = useState(false)

  const [opponentScores, setOpponentScores] = useState<Record<string, number>>({})
  const opTimers = useRef<ReturnType<typeof setInterval>[]>([])
  const sessionSaved = useRef(false)

  const { muted: sfxMuted, toggle: toggleSfx } = useSfxToggle()

  const isRealMultiplayer = mode === 'multiplayer' && mp.available

  // Joiners inherit the room's actual difficulty (set by whoever created it),
  // overriding whatever they had locally selected before joining.
  useEffect(() => {
    if (mp.roomDifficulty) setDifficulty(mp.roomDifficulty as Difficulty)
  }, [mp.roomDifficulty])

  // Once every player in the room is ready, the server counts down and flips
  // status to 'playing' — that's our cue to actually start the seeded run.
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
      const acc = totalQuestions > 0 ? correct / totalQuestions : 0
      if (acc >= 0.6) sfx.success()
      else sfx.needsWork()

      if (!sessionSaved.current && user?.id) {
        sessionSaved.current = true
        const avgEfficiency = roundEfficiencies.length > 0
          ? roundEfficiencies.reduce((a, b) => a + b, 0) / roundEfficiencies.length
          : 0
        const rank = acc >= 0.9 ? 'S' : acc >= 0.75 ? 'A' : acc >= 0.6 ? 'B' : acc >= 0.4 ? 'C' : 'D'
        const sessionInput = {
          gameId: 'array_blitz' as const,
          mode,
          difficulty,
          score,
          correct,
          totalRounds: totalQuestions,
          bestCombo: bestStreak,
          rankLetter: rank,
          meta: {
            avgEfficiency,
            opponentScores: mode === 'multiplayer' && !isRealMultiplayer ? opponentScores : undefined,
          },
        }
        saveGameSession(user.id, sessionInput)
        if (isRealMultiplayer) mp.sendFinish(sessionInput)
      }
    }
  }, [phase])

  useEffect(() => () => { gameMusic.stop() }, [])

  const isCompact = current.length > 7 || (challenge?.goal.length ?? 0) > 7

  const missionProgress = mission.id === 'under-par-2'
    ? Math.min(roundEfficiencies.filter(e => e >= 1).length, mission.target)
    : mission.id === 'no-hints'
      ? hintsUsedCount
      : Math.min(correct, mission.target)

  function spawnFloating(value: number) {
    const id = uid()
    const x = randomInt(30, 70)
    setFloatingScores(prev => [...prev, { id, value, x, y: 0 }])
    setTimeout(() => setFloatingScores(prev => prev.filter(f => f.id !== id)), 1000)
  }

  function startGame(seed?: string) {
    gameMusic.play()
    sessionSaved.current = false
    seededRngRef.current = seed ? new SeededRandom(seed) : null
    setScore(0); setCombo(0); setTotalQuestions(0); setCorrect(0); setRoundEfficiencies([])
    setMission(RUN_MISSIONS[randomInt(0, RUN_MISSIONS.length - 1)])
    setMissionPaid(false); setBestStreak(0); setHintsUsedCount(0)
    setPowerupChoices([]); setDoubleNext(false)
    if (mode === 'multiplayer' && !seed) {
      const init: Record<string, number> = {}
      FAKE_OPPONENTS.forEach(o => { init[o.id] = 0 })
      setOpponentScores(init)
    }
    loadNextChallenge(0)
    setPhase('playing')
  }

  const loadNextChallenge = useCallback((roundIndex = 0) => {
    const ch = generateChallenge(difficulty, roundIndex === TOTAL_ROUNDS - 1, seededRngRef.current ?? undefined)
    setChallenge(ch)
    setCurrent(cloneArr(ch.start))
    setInsertPool(cloneArr(ch.insertPool))
    setMovesUsed(0)
    setActiveTool(null); setSelectedIndex(null); setArmedChipId(null)
    setHintUsed(false); setHintSuggestion(null)
    setFeedback(null); setHistory([]); setBonusClosed(false)
    setRoundStartTime(Date.now())

    const botPractice = mode === 'multiplayer' && !seededRngRef.current
    if (botPractice) {
      opTimers.current.forEach(clearInterval)
      opTimers.current = FAKE_OPPONENTS.map(op =>
        setInterval(() => {
          setOpponentScores(prev => ({ ...prev, [op.id]: prev[op.id] + randomInt(10, 40) }))
        }, randomInt(2000, 6000))
      )
    }
  }, [difficulty, mode])

  function offerPowerups(nextRound: number) {
    if (nextRound !== 2 || powerupChoices.length > 0) return
    setPowerupChoices([...POWERUPS].sort(() => Math.random() - 0.5).slice(0, 2))
  }

  function awardMissionIfComplete(nextRound: number, nextCorrect: number, nextEfficiencies: number[], nextHintsUsed: number) {
    if (missionPaid) return
    const complete =
      mission.id === 'under-par-2' ? nextEfficiencies.filter(e => e >= 1).length >= mission.target :
      mission.id === 'no-hints'    ? (nextRound >= TOTAL_ROUNDS && nextHintsUsed === 0) :
      nextCorrect >= mission.target
    if (!complete) return
    setMissionPaid(true)
    setScore(s => s + mission.reward)
    spawnFloating(mission.reward)
  }

  function activatePowerup(powerup: Powerup) {
    sfx.powerup()
    if (powerup.id === 'time_cache' && challenge) {
      setChallenge({ ...challenge, timeLimit: challenge.timeLimit + 10 })
    }
    if (powerup.id === 'score_surge') setDoubleNext(true)
    if (powerup.id === 'free_hint') revealHint(true)
    setPowerupChoices([])
  }

  function advanceRound(nextRound: number, nextCorrect: number, nextEfficiencies: number[]) {
    offerPowerups(nextRound)
    awardMissionIfComplete(nextRound, nextCorrect, nextEfficiencies, hintsUsedCount)
    opTimers.current.forEach(clearInterval)
    setTimeout(() => {
      if (nextRound >= TOTAL_ROUNDS) setPhase('result')
      else loadNextChallenge(nextRound)
    }, 1200)
  }

  function finishRoundSolved() {
    if (!challenge) return
    const elapsed = (Date.now() - roundStartTime) / 1000
    const efficiency = movesUsed <= challenge.parMoves ? 1 : challenge.parMoves / movesUsed
    const speedBonus = elapsed < challenge.timeLimit * 0.5 ? POINT_SPEED_BONUS : 0
    const bossBonus = totalQuestions === TOTAL_ROUNDS - 1 ? BOSS_BONUS : 0
    const newCombo = combo + 1
    const comboMultiplier = newCombo >= 3 ? 3 : newCombo >= 2 ? 2 : 1
    const gained = Math.round((Math.round(100 * efficiency) + speedBonus + bossBonus) * comboMultiplier * (doubleNext ? 2 : 1))

    const nextRound = totalQuestions + 1
    const nextCorrect = correct + 1
    const nextEfficiencies = [...roundEfficiencies, efficiency]

    setScore(s => s + gained)
    setDoubleNext(false)
    setCombo(newCombo)
    setBestStreak(s => Math.max(s, newCombo))
    setCorrect(nextCorrect)
    setRoundEfficiencies(nextEfficiencies)
    setTotalQuestions(nextRound)
    setFeedback('solved')
    sfx.success()
    spawnFloating(gained)
    if (isRealMultiplayer) mp.sendRoundDone(nextRound - 1, score + gained, true)
    advanceRound(nextRound, nextCorrect, nextEfficiencies)
  }

  function checkForMatch(nextArr: ArrayElement[]) {
    if (challenge && isFullMatch(nextArr, challenge.goal)) {
      setTimeout(() => finishRoundSolved(), 250)
    }
  }

  function useHint() { revealHint(false) }

  function revealHint(free: boolean) {
    if (hintUsed || !challenge) return
    const suggestion = suggestHint(current, challenge.goal, insertPool)
    setHintSuggestion(suggestion)
    setHintUsed(true)
    setHintsUsedCount(c => c + 1)
    sfx.hint()
    if (!free) {
      setScore(s => Math.max(0, s + POINT_HINT))
      spawnFloating(POINT_HINT)
    }
  }

  // ─── Op handlers ────────────────────────────────────────────────────────

  function selectTool(tool: OpType) {
    sfx.pick()
    setActiveTool(prev => prev === tool ? null : tool)
    setSelectedIndex(null)
    setArmedChipId(null)
  }

  // Snapshot current state before applying a move, so a misclick is always recoverable.
  function pushHistory() {
    setHistory(h => [...h, { current: cloneArr(current), insertPool: cloneArr(insertPool), movesUsed }])
  }

  function handleUndo() {
    if (feedback || history.length === 0) return
    sfx.undo()
    const last = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setCurrent(last.current)
    setInsertPool(last.insertPool)
    setMovesUsed(last.movesUsed)
    setSelectedIndex(null)
    setArmedChipId(null)
  }

  function handleCellClick(index: number) {
    if (feedback) return
    if (activeTool === 'swap') {
      if (selectedIndex === null) { sfx.pick(); setSelectedIndex(index); return }
      if (selectedIndex === index) { setSelectedIndex(null); return }
      pushHistory()
      const next = cloneArr(current)
      const tmp = next[selectedIndex]; next[selectedIndex] = next[index]; next[index] = tmp
      setCurrent(next)
      setMovesUsed(m => m + 1)
      setSelectedIndex(null)
      sfx.place()
      checkForMatch(next)
    } else if (activeTool === 'delete') {
      pushHistory()
      const next = current.filter((_, i) => i !== index)
      setCurrent(next)
      setMovesUsed(m => m + 1)
      sfx.place()
      checkForMatch(next)
    }
  }

  function handleDropZone(atIndex: number) {
    if (feedback || activeTool !== 'insert' || !armedChipId) return
    const chip = insertPool.find(c => c.id === armedChipId)
    if (!chip) return
    pushHistory()
    const next = cloneArr(current)
    next.splice(atIndex, 0, { id: uid(), value: chip.value })
    setCurrent(next)
    setInsertPool(prev => prev.filter(c => c.id !== armedChipId))
    setArmedChipId(null)
    setMovesUsed(m => m + 1)
    sfx.place()
    checkForMatch(next)
  }

  function handleRotate(dir: 'left' | 'right') {
    if (feedback || current.length < 2) return
    pushHistory()
    const next = cloneArr(current)
    if (dir === 'left') next.push(next.shift()!)
    else next.unshift(next.pop()!)
    setCurrent(next)
    setMovesUsed(m => m + 1)
    sfx.place()
    checkForMatch(next)
  }

  // ─── LOBBY ─────────────────────────────────────────────────────────────

  if (phase === 'lobby') {
    return (
      <div className="ab-page ab-page--lobby">
        <div className="ab-blueprint-bg" />

        <div className="ab-lobby-topbar">
          <button className="ab-back-btn" onClick={() => navigate('/student/games')}>
            <ArrowLeft size={15} /> Back
          </button>
          <button className="ab-sfx-toggle" onClick={toggleSfx} title={sfxMuted ? 'Unmute sound' : 'Mute sound'}>
            {sfxMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>

        <div className="ab-lobby">
          <div className="ab-lobby-hero">
            <div className="ab-lobby-glow" />
            <motion.div className="ab-lobby-icon"
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}>
              <Target size={52} strokeWidth={1.5} />
            </motion.div>
            <h1 className="ab-lobby-title">ARRAY BLITZ</h1>
            <p className="ab-lobby-sub">MODULE 01 · ARRAYS & ARRAY LISTS</p>
            <p className="ab-lobby-desc">
              Every round drops a blueprint. Swap, delete, insert &amp; rotate your
              array to match it — in as few moves as possible.
            </p>
          </div>

          <div className="ab-lobby-section">
            <p className="ab-section-label">// GAME MODE</p>
            <div className="ab-mode-row">
              <button className={`ab-mode-card ${mode === 'solo' ? 'active' : ''}`} onClick={() => selectMode('solo')}>
                <User size={22} />
                <span className="ab-mode-title">SOLO</span>
                <span className="ab-mode-sub">Practice at your own pace</span>
              </button>
              <button className={`ab-mode-card ${mode === 'multiplayer' ? 'active multi' : ''}`} onClick={() => selectMode('multiplayer')}>
                <Users size={22} />
                <span className="ab-mode-title">MULTIPLAYER</span>
                <span className="ab-mode-sub">{mp.available ? 'Race a real classmate' : 'Race against 3 AI bots'}</span>
                <span className="ab-mode-badge-bot">
                  {mp.available ? <><Swords size={10} /> Live rooms · no bots</> : <><Bot size={10} /> AI Bots · Live multiplayer server offline</>}
                </span>
              </button>
            </div>
          </div>

          {(!isRealMultiplayer || mp.status === 'idle' || mp.status === 'error') && (
            <div className="ab-lobby-section">
              <p className="ab-section-label">// DIFFICULTY</p>
              <div className="ab-diff-row">
                {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG['easy']][]).map(([d, cfg]) => (
                  <button key={d} className={`ab-diff-card ${difficulty === d ? 'active' : ''}`}
                    style={difficulty === d ? { borderColor: cfg.color, boxShadow: `0 0 20px ${cfg.color}30, inset 0 0 20px ${cfg.color}08` } : {}}
                    onClick={() => setDifficulty(d)}>
                    <span className="ab-diff-icon">{cfg.icon}</span>
                    <span className="ab-diff-name" style={difficulty === d ? { color: cfg.color } : {}}>{cfg.label}</span>
                    <span className="ab-diff-desc">{cfg.desc}</span>
                    <div className="ab-diff-meta">
                      <span>{cfg.size[0]}–{cfg.size[1]} els</span>
                      <span style={{ color: cfg.color }}>par {cfg.par}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isRealMultiplayer && (
            <motion.button className="ab-start-btn" onClick={() => { sfx.submit(); startGame() }}
              whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(0,212,170,0.5)' }}
              whileTap={{ scale: 0.97 }}>
              <Zap size={20} />
              START GAME
              <span className="ab-start-rounds">{TOTAL_ROUNDS} ROUNDS</span>
            </motion.button>
          )}

          {isRealMultiplayer && mp.status === 'idle' && (
            <div className="ab-lobby-section">
              <p className="ab-section-label">// MULTIPLAYER ROOM</p>
              <div className="ab-mp-room-actions">
                <motion.button className="ab-start-btn" onClick={() => { sfx.submit(); mp.createRoom(difficulty) }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Users size={18} /> CREATE ROOM
                </motion.button>
                <div className="ab-mp-join-row">
                  <input className="ab-mp-code-input" placeholder="ROOM CODE" maxLength={5}
                    value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} />
                  <button className="ab-result-btn secondary" disabled={roomCodeInput.length < 5}
                    onClick={() => { sfx.submit(); mp.joinRoom(roomCodeInput) }}>
                    Join Room
                  </button>
                </div>
              </div>
            </div>
          )}

          {isRealMultiplayer && mp.status === 'error' && (
            <div className="ab-lobby-section">
              <p className="ab-run-reward" style={{ color: '#FF6B8A' }}>{mp.errorMessage}</p>
              <div className="ab-mp-join-row">
                <input className="ab-mp-code-input" placeholder="ROOM CODE" maxLength={5}
                  value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} />
                <button className="ab-result-btn secondary" disabled={roomCodeInput.length < 5}
                  onClick={() => mp.joinRoom(roomCodeInput)}>Try Again</button>
              </div>
            </div>
          )}

          {isRealMultiplayer && mp.status === 'lobby' && (
            <div className="ab-lobby-section">
              <p className="ab-section-label">// ROOM {mp.roomCode}</p>
              <p className="ab-lobby-desc">
                Share this code with a classmate. Waiting for {Math.max(0, mp.minPlayers - mp.players.length)} more player(s) — no bots, real race only.
              </p>
              <div className="ab-mp-room-players">
                {mp.players.map(p => (
                  <div key={p.userId} className="ab-mp-row">
                    <div className="ab-mp-avatar" style={{ background: `${p.avatarColor}20`, borderColor: p.avatarColor }}>
                      {p.name.charAt(0)}
                    </div>
                    <span className="ab-mp-name">{p.name}{p.userId === user?.id ? ' (You)' : ''}</span>
                    <span className="ab-diff-pill" style={p.ready ? { color: '#00D4AA', borderColor: '#00D4AA50', background: '#00D4AA10' } : {}}>
                      {p.ready ? 'READY' : 'NOT READY'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="ab-mp-room-actions">
                <motion.button className="ab-start-btn" disabled={!!mp.players.find(p => p.userId === user?.id)?.ready}
                  onClick={() => { sfx.submit(); mp.setReady() }}>
                  <CheckCircle size={18} /> {mp.players.find(p => p.userId === user?.id)?.ready ? 'WAITING FOR OTHERS' : 'READY UP'}
                </motion.button>
                <button className="ab-result-btn secondary" onClick={() => mp.leaveRoom()}>Leave Room</button>
              </div>
            </div>
          )}

          {isRealMultiplayer && mp.status === 'starting' && (
            <div className="ab-lobby-section">
              <p className="ab-lobby-title" style={{ fontSize: '1.4rem' }}>STARTING…</p>
              <p className="ab-lobby-desc">Everyone's ready. Get set!</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── RESULT ────────────────────────────────────────────────────────────

  if (phase === 'result') {
    const accuracy = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0
    const avgEfficiency = roundEfficiencies.length > 0
      ? Math.round((roundEfficiencies.reduce((a, b) => a + b, 0) / roundEfficiencies.length) * 100)
      : 0
    const rank = accuracy >= 90 ? 'S' : accuracy >= 75 ? 'A' : accuracy >= 60 ? 'B' : accuracy >= 40 ? 'C' : 'D'
    const rankColor = { S: '#FFB830', A: '#00D4AA', B: '#9B7ED4', C: '#63B3ED', D: '#FF6B8A' }[rank]

    const allScores = mode === 'multiplayer'
      ? (isRealMultiplayer
          ? (mp.results ? mp.results.map(r => ({ name: r.name, score: r.score, isMe: r.userId === user?.id })) : null)
          : [
              { name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'You', score, isMe: true },
              ...FAKE_OPPONENTS.map(o => ({ name: o.name, score: opponentScores[o.id] ?? 0, isMe: false })),
            ].sort((a, b) => b.score - a.score))
      : null
    const myRank = allScores?.findIndex(s => s.isMe) ?? -1
    const waitingForOpponents = isRealMultiplayer && !mp.results

    return (
      <div className="ab-page ab-page--result">
        <div className="ab-blueprint-bg" />
        <div className="ab-result-burst">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="ab-burst-ring"
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 3 + i, opacity: 0 }}
              transition={{ duration: 1.5, delay: i * 0.3, ease: 'easeOut' }} />
          ))}
        </div>

        <div className="ab-result">
          <motion.div className="ab-rank-badge"
            style={{ borderColor: rankColor, boxShadow: `0 0 40px ${rankColor}50` }}
            initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}>
            <span className="ab-rank-letter" style={{ color: rankColor }}>{rank}</span>
            <span className="ab-rank-sub">RANK</span>
          </motion.div>

          <motion.div className="ab-result-hero"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <p className="ab-result-label">TOTAL SCORE</p>
            <div className="ab-result-score" style={{ color: rankColor }}><CountUp target={score} /></div>
          </motion.div>

          <motion.div className="ab-result-stats"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <div className="ab-result-stat">
              <CheckCircle size={15} color="#00D4AA" />
              <span>{correct}/{totalQuestions}</span>
              <span className="ab-stat-label">SOLVED</span>
            </div>
            <div className="ab-result-stat">
              <Target size={15} color="#FFB830" />
              <span>{avgEfficiency}%</span>
              <span className="ab-stat-label">AVG EFFICIENCY</span>
            </div>
            <div className="ab-result-stat">
              <Zap size={15} color="#9B7ED4" />
              <span>×{bestStreak >= 3 ? 3 : bestStreak >= 2 ? 2 : 1}</span>
              <span className="ab-stat-label">BEST COMBO</span>
            </div>
          </motion.div>

          {waitingForOpponents && (
            <motion.div className="ab-result-leaderboard"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <p className="ab-section-label">// MATCH RESULTS</p>
              <p className="ab-lobby-desc">Waiting for the other player to finish…</p>
            </motion.div>
          )}

          {allScores && (
            <motion.div className="ab-result-leaderboard"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <p className="ab-section-label">// MATCH RESULTS</p>
              {allScores.map((s, i) => {
                const medal = ['🥇', '🥈', '🥉'][i] ?? `#${i + 1}`
                return (
                  <div key={s.name} className={`ab-result-lb-row ${s.isMe ? 'me' : ''}`}>
                    <span className="ab-lb-medal">{medal}</span>
                    <span className="ab-lb-name">{s.name}{s.isMe ? ' (You)' : ''}</span>
                    <div className="ab-lb-bar-wrap">
                      <motion.div className="ab-lb-bar"
                        style={{ background: s.isMe ? '#00D4AA' : FAKE_OPPONENTS.find(o => o.name === s.name)?.color ?? '#9B7ED4' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((s.score / (allScores[0].score || 1)) * 100, 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.8 + i * 0.1 }} />
                    </div>
                    <span className="ab-lb-score">{s.score.toLocaleString()}</span>
                  </div>
                )
              })}
              {myRank === 0 && <p className="ab-result-win-msg">🏆 {isRealMultiplayer ? 'You won the race!' : 'You beat the AI bots!'}</p>}
            </motion.div>
          )}

          <motion.div className="ab-result-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
            <button className="ab-result-btn secondary" onClick={() => { if (mp.roomCode) mp.leaveRoom(); setPhase('lobby') }}>
              <RotateCcw size={15} /> Play Again
            </button>
            <button className="ab-result-btn primary" onClick={() => navigate('/student/games')}>
              Games Lobby <ChevronRight size={15} />
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  // ─── PLAYING ───────────────────────────────────────────────────────────

  const diffCfg = DIFFICULTY_CONFIG[difficulty]
  const matchPct = challenge ? Math.round(computeMatch(current, challenge.goal) * 100) : 0
  const parColor = !challenge ? '#00D4AA' : movesUsed <= challenge.parMoves ? '#00D4AA' : movesUsed <= challenge.parMoves + 2 ? '#FFB830' : '#FF6B8A'

  return (
    <div className="ab-page ab-page--playing">
      <div className="ab-blueprint-bg" />

      <div className="ab-hud">
        <button className="ab-back-btn" onClick={() => { gameMusic.stop(); if (mp.roomCode) mp.leaveRoom(); setPhase('lobby') }}><ArrowLeft size={14} /></button>

        <div className="ab-hud-score-wrap">
          <div className="ab-hud-score">
            <Zap size={14} color="#FFB830" />
            <span className="ab-hud-score-num">{score.toLocaleString()}</span>
          </div>
          <AnimatePresence>
            {combo >= 2 && (
              <motion.div className="ab-combo-badge" key={combo}
                initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500 }}>
                ×{combo >= 3 ? 3 : 2} COMBO{combo >= 3 ? '!!!' : '!'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="ab-hud-rounds">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div key={i} className={`ab-round-pip ${i < totalQuestions ? 'done' : ''} ${i === totalQuestions ? 'current' : ''}`} />
          ))}
        </div>

        <div className="ab-hud-right">
          <button className="ab-sfx-toggle" onClick={toggleSfx} title={sfxMuted ? 'Unmute sound' : 'Mute sound'}>
            {sfxMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          <span className="ab-diff-pill" style={{ color: diffCfg.color, borderColor: `${diffCfg.color}50`, background: `${diffCfg.color}10` }}>
            {diffCfg.label}
          </span>
          {mode === 'multiplayer' && (
            <span className="ab-diff-pill" style={{ color: '#9B7ED4', borderColor: '#9B7ED450', background: '#9B7ED410' }}>
              {isRealMultiplayer ? <><Swords size={10} /> Live Race</> : <><Bot size={10} /> AI Race</>}
            </span>
          )}
        </div>
      </div>

      <div className="ab-run-panel">
        <div>
          <span className="ab-run-label">MISSION</span>
          <strong>{mission.label}</strong>
        </div>
        <span className={`ab-run-reward ${missionPaid ? 'complete' : ''}`}>
          {missionPaid ? 'CLAIMED' : `+${mission.reward} XP`}
        </span>
        <div className="ab-run-progress">
          <span style={{ width: `${mission.id === 'no-hints' ? (hintsUsedCount === 0 ? 100 : 0) : (missionProgress / mission.target) * 100}%` }} />
        </div>
      </div>

      <div className="ab-arena">
        <div className="ab-corner ab-corner--tl" />
        <div className="ab-corner ab-corner--tr" />
        <div className="ab-corner ab-corner--bl" />
        <div className="ab-corner ab-corner--br" />

        <div className="ab-arena-header">
          <TimerBar key={totalQuestions} timeLimit={challenge?.timeLimit ?? 40} onWindowClosed={() => setBonusClosed(true)} />
          <div className="ab-match-ring-wrap">
            <svg viewBox="0 0 40 40" className="ab-match-ring">
              <circle cx="20" cy="20" r="16" className="ab-match-ring-bg" />
              <motion.circle cx="20" cy="20" r="16" className="ab-match-ring-fg"
                style={{ stroke: matchPct === 100 ? '#00D4AA' : '#9B7ED4' }}
                strokeDasharray={2 * Math.PI * 16}
                animate={{ strokeDashoffset: 2 * Math.PI * 16 * (1 - matchPct / 100) }}
                transition={{ duration: 0.35 }} />
            </svg>
            <span className="ab-match-ring-num">{matchPct}%</span>
          </div>
        </div>

        <div className="ab-instruction-wrap">
          <div className="ab-instruction-badge">MATCH THE BLUEPRINT</div>
          <div className="ab-moves-meter">
            <span>MOVES <b style={{ color: parColor }}>{movesUsed}</b> / PAR {challenge?.parMoves}</span>
            {bonusClosed && <span className="ab-bonus-closed-label">— speed bonus window closed, take your time</span>}
          </div>
          <button className="ab-hint-btn" onClick={useHint} disabled={hintUsed}>
            <HelpCircle size={13} />
            {hintUsed ? 'Hint used' : `Hint (−${Math.abs(POINT_HINT)} XP)`}
          </button>
          {hintSuggestion && (
            <motion.p className="ab-hint-text" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              <Sparkles size={12} /> {hintSuggestion.text}
            </motion.p>
          )}
        </div>

        {powerupChoices.length > 0 && (
          <motion.div className="ab-powerups" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <div>
              <span className="ab-run-label">POWERUP DROP</span>
              <strong>Pick one boost</strong>
            </div>
            <div className="ab-powerup-row">
              {powerupChoices.map(powerup => (
                <button key={powerup.id} className="ab-powerup-card" onClick={() => activatePowerup(powerup)}>
                  <span>{powerup.label}</span>
                  <small>{powerup.desc}</small>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="ab-floating-wrap">
          <AnimatePresence>
            {floatingScores.map(f => (
              <motion.div key={f.id} className={`ab-floating ${f.value > 0 ? 'pos' : 'neg'}`}
                style={{ left: `${f.x}%` }}
                initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -60 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}>
                {f.value > 0 ? `+${f.value}` : f.value}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {feedback === 'solved' && (
            <motion.div className="ab-feedback ab-feedback--correct"
              initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }}
              transition={{ type: 'spring', stiffness: 400 }}>
              <CheckCircle size={26} /> BLUEPRINT MATCHED
            </motion.div>
          )}
        </AnimatePresence>

        {/* Blueprint (goal) row */}
        <div className="ab-build-bay">
          <p className="ab-build-label">BLUEPRINT</p>
          <div className="ab-blueprint-row">
            {(challenge?.goal ?? []).map((el, i) => {
              const matched = !!current[i] && current[i].value === el.value
              return <Slot key={`g-${i}`} el={matched ? el : undefined} index={i} ghost={!matched} matched={matched} compact={isCompact} />
            })}
          </div>

          {/* Insert supply pool */}
          {activeTool === 'insert' && insertPool.length > 0 && (
            <div className="ab-supply-row">
              <span className="ab-supply-label">SUPPLY</span>
              {insertPool.map(chip => (
                <button key={chip.id}
                  className={`ab-supply-chip ${armedChipId === chip.id ? 'armed' : ''}`}
                  onClick={() => { sfx.pick(); setArmedChipId(prev => prev === chip.id ? null : chip.id) }}>
                  {String(chip.value)}
                </button>
              ))}
            </div>
          )}

          {/* Current (workbench) row */}
          <p className="ab-build-label">WORKBENCH</p>
          <div className="ab-current-row">
            {activeTool === 'insert' && (
              <button className={`ab-drop-zone ${armedChipId ? 'ab-drop-zone--active' : ''}`}
                disabled={!armedChipId} onClick={() => handleDropZone(0)}>+</button>
            )}
            {current.map((el, i) => {
              const matched = !!challenge?.goal[i] && challenge.goal[i].value === el.value
              const clickable = activeTool === 'swap' || activeTool === 'delete'
              return (
                <div key={el.id} className="ab-current-cell-wrap">
                  <Slot el={el} index={i} matched={matched} selected={selectedIndex === i}
                    hint={hintSuggestion?.indices.includes(i)}
                    clickable={clickable} compact={isCompact}
                    onClick={clickable ? () => handleCellClick(i) : undefined} />
                  {activeTool === 'insert' && (
                    <button className={`ab-drop-zone ${armedChipId ? 'ab-drop-zone--active' : ''}`}
                      disabled={!armedChipId} onClick={() => handleDropZone(i + 1)}>+</button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Toolbelt */}
        <div className="ab-toolbelt">
          {challenge?.opsAllowed.includes('swap') && (
            <button className={`ab-tool-btn ${activeTool === 'swap' ? 'active' : ''}`} onClick={() => selectTool('swap')}>
              <ArrowLeftRight size={16} /><span>Swap</span>
            </button>
          )}
          {challenge?.opsAllowed.includes('delete') && (
            <button className={`ab-tool-btn ${activeTool === 'delete' ? 'active' : ''}`} onClick={() => selectTool('delete')}>
              <Trash2 size={16} /><span>Delete</span>
            </button>
          )}
          {challenge?.opsAllowed.includes('insert') && (
            <button className={`ab-tool-btn ${activeTool === 'insert' ? 'active' : ''}`} onClick={() => selectTool('insert')}>
              <PlusSquare size={16} /><span>Insert</span>
            </button>
          )}
          <div className="ab-toolbelt-divider" />
          {challenge?.opsAllowed.includes('rotateLeft') && (
            <button className="ab-tool-btn ab-tool-btn--rotate" onClick={() => handleRotate('left')}>
              <RotateCcw size={16} /><span>Rotate</span>
            </button>
          )}
          {challenge?.opsAllowed.includes('rotateRight') && (
            <button className="ab-tool-btn ab-tool-btn--rotate" onClick={() => handleRotate('right')}>
              <RotateCw size={16} /><span>Rotate</span>
            </button>
          )}
          <div className="ab-toolbelt-divider" />
          <button className="ab-tool-btn ab-tool-btn--undo" onClick={handleUndo} disabled={history.length === 0}>
            <Undo2 size={16} /><span>Undo{history.length > 0 ? ` (${history.length})` : ''}</span>
          </button>
        </div>

        {mode === 'multiplayer' && (
          <div className="ab-mp-panel">
            <p className="ab-mp-title"><Swords size={12} /> {isRealMultiplayer ? 'LIVE RACE' : 'LIVE RACE vs AI BOTS'}</p>
            {(isRealMultiplayer
              ? mp.players.map(p => ({
                  name: p.userId === user?.id ? 'You' : p.name,
                  score: p.userId === user?.id ? score : (mp.opponentProgress[p.userId]?.value ?? 0),
                  color: p.userId === user?.id ? '#00D4AA' : p.avatarColor,
                  isMe: p.userId === user?.id,
                }))
              : [
                  { name: 'You', score, color: '#00D4AA', isMe: true },
                  ...FAKE_OPPONENTS.map(o => ({ name: o.name, score: opponentScores[o.id] ?? 0, color: o.color, isMe: false })),
                ]
            ).sort((a, b) => b.score - a.score).map((p, i) => (
              <div key={`${p.name}-${i}`} className="ab-mp-row">
                <span className="ab-mp-pos">#{i + 1}</span>
                <div className="ab-mp-avatar" style={{ background: `${p.color}20`, borderColor: p.color }}>
                  {p.isMe ? 'U' : isRealMultiplayer ? p.name.charAt(0) : <Bot size={10} />}
                </div>
                <span className="ab-mp-name" style={{ color: p.isMe ? '#00D4AA' : 'var(--text-secondary)' }}>{p.name}</span>
                <div className="ab-mp-bar-wrap">
                  <motion.div className="ab-mp-bar" style={{ background: p.color }}
                    animate={{ width: `${Math.min((p.score / 700) * 100, 100)}%` }} transition={{ duration: 0.4 }} />
                </div>
                <span className="ab-mp-score">{p.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
