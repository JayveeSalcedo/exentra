import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, AlertCircle, Bot, CheckCircle, Flame, HelpCircle,
  RotateCcw, Search, Swords, Timer, Trophy, User, Users, Zap, Volume2, VolumeX,
} from 'lucide-react'
import { useAuth } from '../../../store/AuthContext'
import { sfx, gameMusic, useSfxToggle } from '../../../lib/sfx'
import './ArrayBlitz.css'
import './SortArena.css'

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type Mode = 'solo' | 'multiplayer'
type Phase = 'lobby' | 'playing' | 'result'
type ChallengeType =
  | 'spot_algorithm'
  | 'predict_next_swap'
  | 'precondition_check'
  | 'trace_pass'
  | 'binary_search_steps'
  | 'merge_step'
  | 'quicksort_partition'
  | 'complexity_match'

interface ArrayElement { id: string; value: number }
interface Choice { label: string; value: string; correct: boolean }
interface FloatingScore { id: string; value: number; x: number }

interface Challenge {
  type: ChallengeType
  title: string
  instruction: string
  timeLimit: number
  array: ArrayElement[]
  choices?: Choice[]
  answer?: string
  order?: number[]
  pivotIndex?: number
  locked?: number[]
  left?: ArrayElement[]
  right?: ArrayElement[]
  result?: ArrayElement[]
  target?: number
}

const ACCENT = '#FFB830'
const TOTAL_ROUNDS = 5
const POINT_BASE = 100
const POINT_WRONG = -25
const POINT_HINT = -35
const POINT_SPEED_BONUS = 50
const BOSS_BONUS = 150

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; desc: string; time: number; size: [number, number]; color: string }> = {
  easy: { label: 'Easy', desc: 'Spot states, swaps, and search preconditions', time: 35, size: [5, 6], color: '#00D4AA' },
  medium: { label: 'Medium', desc: 'Trace passes and execute binary search', time: 50, size: [6, 8], color: '#9B7ED4' },
  hard: { label: 'Hard', desc: 'Merge sorted halves and partition pivots', time: 65, size: [8, 10], color: ACCENT },
  expert: { label: 'Expert', desc: 'Complexity scenarios and hard sort states', time: 85, size: [9, 12], color: '#FF6B8A' },
}

const TYPES_BY_DIFF: Record<Difficulty, ChallengeType[]> = {
  easy: ['spot_algorithm', 'predict_next_swap', 'precondition_check'],
  medium: ['trace_pass', 'binary_search_steps', 'predict_next_swap'],
  hard: ['merge_step', 'quicksort_partition', 'trace_pass'],
  expert: ['complexity_match', 'quicksort_partition', 'spot_algorithm'],
}

const RUN_MISSIONS = [
  { id: 'pattern', label: 'Identify 2 algorithm patterns', reward: 250 },
  { id: 'pivot', label: 'Clear a partition round', reward: 250 },
  { id: 'streak', label: 'Land a 3-answer streak', reward: 300 },
]

const FAKE_OPPONENTS = [
  { id: 'kai', name: 'Kai [AI]', color: '#9B7ED4' },
  { id: 'mira', name: 'Mira [AI]', color: '#FFB830' },
  { id: 'theo', name: 'Theo [AI]', color: '#FF6B8A' },
]

function uid() { return Math.random().toString(36).slice(2, 8) }
function rng(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(items: T[]) { return items[rng(0, items.length - 1)] }
function shuffle<T>(items: T[]) { return [...items].sort(() => Math.random() - 0.5) }
function makeValues(size: number, sorted = false) {
  const nums = Array.from({ length: size }, () => rng(5, 96))
  const unique = [...new Set(nums)]
  while (unique.length < size) unique.push(rng(5, 96))
  const values = sorted ? unique.sort((a, b) => a - b) : shuffle(unique)
  return values.slice(0, size).map(value => ({ id: uid(), value }))
}
function choices(correct: string, wrong: string[]): Choice[] {
  return shuffle([correct, ...wrong.filter(w => w !== correct).slice(0, 3)])
    .map(value => ({ label: value, value, correct: value === correct }))
}

function bubbleState() {
  const arr = makeValues(6)
  for (let j = 0; j < arr.length - 1; j++) {
    if (arr[j].value > arr[j + 1].value) [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
  }
  return { name: 'Bubble Sort', arr, locked: [arr.length - 1] }
}
function selectionState() {
  const arr = makeValues(6)
  const minIdx = arr.reduce((best, el, i) => el.value < arr[best].value ? i : best, 0)
  ;[arr[0], arr[minIdx]] = [arr[minIdx], arr[0]]
  return { name: 'Selection Sort', arr, locked: [0] }
}
function insertionState(size = 6) {
  const arr = makeValues(size)
  const prefix = arr.slice(0, Math.max(3, Math.floor(size / 2))).sort((a, b) => a.value - b.value)
  return { name: 'Insertion Sort', arr: [...prefix, ...arr.slice(prefix.length)], locked: [] as number[] }
}
function mergeState() {
  const left = makeValues(4, true)
  const right = makeValues(4, true)
  return { name: 'Merge Sort', arr: [...left, ...right], locked: [], left, right }
}
function quickState() {
  const arr = makeValues(7)
  const pivotIndex = arr.length - 1
  const pivot = arr[pivotIndex].value
  const less = arr.filter((_, i) => i !== pivotIndex).filter(el => el.value < pivot)
  const more = arr.filter((_, i) => i !== pivotIndex).filter(el => el.value >= pivot)
  return { name: 'Quick Sort', arr: [...less, arr[pivotIndex], ...more], locked: [less.length], pivotIndex: less.length }
}

function generateChallenge(difficulty: Difficulty, finalRound: boolean): Challenge {
  const cfg = DIFFICULTY_CONFIG[difficulty]
  const size = rng(cfg.size[0], cfg.size[1])
  const type = finalRound && difficulty === 'expert' ? 'spot_algorithm' : pick(TYPES_BY_DIFF[difficulty])
  const prefix = finalRound ? 'FINAL ROUND: ' : ''

  if (type === 'spot_algorithm') {
    const states = difficulty === 'expert'
      ? [mergeState(), quickState()]
      : [bubbleState(), selectionState(), insertionState()]
    const state = pick(states)
    const pivotIndex = 'pivotIndex' in state ? (state as { pivotIndex: number }).pivotIndex : undefined
    return {
      type, title: 'Spot Algorithm', array: state.arr, locked: state.locked,
      pivotIndex, answer: state.name,
      instruction: `${prefix}Which algorithm produced this intermediate state?`,
      timeLimit: cfg.time,
      choices: choices(state.name, ['Bubble Sort', 'Selection Sort', 'Insertion Sort', 'Merge Sort', 'Quick Sort']),
    }
  }

  if (type === 'predict_next_swap') {
    const arr = makeValues(size)
    const mode = difficulty === 'medium' ? pick(['Bubble Sort', 'Selection Sort']) : 'Bubble Sort'
    let pair = [0, 1]
    if (mode === 'Bubble Sort') {
      const i = arr.findIndex((el, idx) => idx < arr.length - 1 && el.value > arr[idx + 1].value)
      pair = i >= 0 ? [i, i + 1] : [0, 1]
    } else {
      const minIdx = arr.reduce((best, el, i) => el.value < arr[best].value ? i : best, 0)
      pair = [0, minIdx]
    }
    return {
      type, title: 'Predict Next Swap', array: arr, order: pair, answer: pair.join(','),
      instruction: `${prefix}${mode}: click the two elements that swap next.`,
      timeLimit: cfg.time,
    }
  }

  if (type === 'precondition_check') {
    const sorted = Math.random() > 0.45
    const arr = makeValues(size, sorted)
    return {
      type, title: 'Binary Search Check', array: arr, answer: sorted ? 'Yes' : 'No',
      instruction: `${prefix}Is binary search valid on this array as shown?`,
      timeLimit: cfg.time,
      choices: choices(sorted ? 'Yes' : 'No', ['No', 'Yes', 'Only if target exists', 'Only from the first index']),
    }
  }

  if (type === 'trace_pass') {
    const arr = makeValues(size)
    const insertion = difficulty === 'hard'
    const order = insertion
      ? Array.from({ length: Math.min(5, arr.length) }, (_, i) => i)
      : Array.from({ length: arr.length - 1 }, (_, i) => i).sort((a, b) => arr[a].value - arr[b].value)
    return {
      type, title: insertion ? 'Trace Insertion Pass' : 'Trace Selection Pass',
      array: arr, order,
      instruction: insertion
        ? `${prefix}Click elements in the left-to-right order insertion sort inspects this pass.`
        : `${prefix}Selection pass: click values from smallest candidate to largest.`,
      timeLimit: cfg.time,
    }
  }

  if (type === 'binary_search_steps') {
    const arr = makeValues(size, true)
    const target = pick(arr).value
    return {
      type, title: 'Binary Search Steps', array: arr, target,
      instruction: `${prefix}Find ${target}: click each mid pointer in binary search order.`,
      timeLimit: cfg.time,
    }
  }

  if (type === 'merge_step') {
    const left = makeValues(4, true)
    const right = makeValues(4, true)
    const result = [...left, ...right].sort((a, b) => a.value - b.value)
    return {
      type, title: 'Merge Step', array: result, left, right, result: [],
      order: result.map(el => el.value), answer: result.map(el => el.value).join(','),
      instruction: `${prefix}Merge the two sorted halves. Click the next output values in order.`,
      timeLimit: cfg.time,
    }
  }

  if (type === 'quicksort_partition') {
    const arr = makeValues(size)
    const pivotIndex = arr.length - 1
    const pivot = arr[pivotIndex].value
    return {
      type, title: 'Quick Sort Partition', array: arr, pivotIndex,
      instruction: `${prefix}Pivot is ${pivot}. Classify every other value left or right of the pivot.`,
      timeLimit: cfg.time,
    }
  }

  const scenarios = [
    { label: 'Insertion sort on an already sorted list', answer: 'Best: O(n)' },
    { label: 'Quick sort with balanced partitions', answer: 'Average: O(n log n)' },
    { label: 'Quick sort repeatedly picks the smallest pivot', answer: 'Worst: O(n^2)' },
    { label: 'Merge sort on any input of n items', answer: 'All cases: O(n log n)' },
  ]
  const scenario = pick(scenarios)
  return {
    type, title: 'Complexity Match', array: makeValues(6, true), answer: scenario.answer,
    instruction: `${prefix}${scenario.label}. Match the time complexity.`,
    timeLimit: cfg.time,
    choices: choices(scenario.answer, ['Best: O(n)', 'Average: O(n log n)', 'Worst: O(n^2)', 'All cases: O(n log n)', 'O(log n)']),
  }
}

function TimerBar({ timeLimit, onExpire }: { timeLimit: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(timeLimit)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setRemaining(timeLimit)
    ref.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          if (ref.current) clearInterval(ref.current)
          onExpire()
          return 0
        }
        if (prev - 1 <= 5) sfx.tick()
        return prev - 1
      })
    }, 1000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [timeLimit, onExpire])

  const pct = (remaining / timeLimit) * 100
  const color = pct > 50 ? '#00D4AA' : pct > 25 ? ACCENT : '#FF6B8A'
  return (
    <div className={`ab-timer-wrap ${remaining <= 5 ? 'ab-timer--urgent' : ''}`}>
      <Timer size={14} color={color} />
      <div className="ab-timer-track">
        <motion.div className="ab-timer-fill" style={{ background: color }} animate={{ width: `${pct}%` }} />
      </div>
      <span className="ab-timer-num" style={{ color }}>{remaining}s</span>
    </div>
  )
}

function ArrayTrack({ items, clickable, selected = [], wrong = [], locked = [], pivotIndex, compact, onClick }: {
  items: ArrayElement[]
  clickable?: boolean
  selected?: number[]
  wrong?: number[]
  locked?: number[]
  pivotIndex?: number
  compact?: boolean
  onClick?: (index: number) => void
}) {
  return (
    <div className="ab-array-row sa-array-row">
      {items.map((el, i) => {
        const cls = [
          'ab-slot sa-slot',
          clickable ? 'ab-slot--clickable' : '',
          selected.includes(i) ? 'ab-slot--correct' : '',
          wrong.includes(i) ? 'ab-slot--wrong' : '',
          locked.includes(i) ? 'sa-slot--locked' : '',
          pivotIndex === i ? 'sa-slot--pivot' : '',
          compact ? 'ab-slot--compact' : '',
        ].filter(Boolean).join(' ')
        return (
          <motion.div
            key={el.id}
            className={cls}
            onClick={clickable ? () => onClick?.(i) : undefined}
            whileHover={clickable ? { y: -5, scale: 1.04 } : {}}
            whileTap={clickable ? { scale: 0.96 } : {}}
          >
            <div className="ab-slot-inner">
              <span className="ab-slot-value">{el.value}</span>
            </div>
            <span className="ab-slot-index">[{i}]</span>
          </motion.div>
        )
      })}
    </div>
  )
}

function CountUp({ target }: { target: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let value = 0
    const step = Math.max(1, Math.ceil(target / 36))
    const id = setInterval(() => {
      value = Math.min(target, value + step)
      setDisplay(value)
      if (value >= target) clearInterval(id)
    }, 24)
    return () => clearInterval(id)
  }, [target])
  return <>{display.toLocaleString()}</>
}

export default function SortArena() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('lobby')
  const [mode, setMode] = useState<Mode>('solo')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [round, setRound] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [hintUsed, setHintUsed] = useState(false)
  const [hintVisible, setHintVisible] = useState(false)
  const [roundStart, setRoundStart] = useState(Date.now())
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [wrong, setWrong] = useState<number[]>([])
  const [bsLow, setBsLow] = useState(0)
  const [bsHigh, setBsHigh] = useState(0)
  const [mergeResult, setMergeResult] = useState<ArrayElement[]>([])
  const [partition, setPartition] = useState<Record<number, 'left' | 'right'>>({})
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([])
  const [opponentScores, setOpponentScores] = useState<Record<string, number>>({})
  const [mission, setMission] = useState(RUN_MISSIONS[0])
  const [missionPaid, setMissionPaid] = useState(false)
  const [bestStreak, setBestStreak] = useState(0)
  const [badges, setBadges] = useState<Set<string>>(new Set())
  const timers = useRef<ReturnType<typeof setInterval>[]>([])

  const { muted: sfxMuted, toggle: toggleSfx } = useSfxToggle()

  useEffect(() => {
    if (phase === 'result') {
      gameMusic.stop()
      const acc = round > 0 ? correct / round : 0
      if (acc >= 0.6) sfx.success()
      else sfx.needsWork()
    }
  }, [phase])

  useEffect(() => () => { gameMusic.stop() }, [])

  const compact = (challenge?.array.length ?? 0) > 8

  function spawnFloating(value: number) {
    const id = uid()
    setFloatingScores(prev => [...prev, { id, value, x: rng(30, 70) }])
    setTimeout(() => setFloatingScores(prev => prev.filter(f => f.id !== id)), 900)
  }

  function loadChallenge(nextRound: number) {
    const ch = generateChallenge(difficulty, nextRound === TOTAL_ROUNDS - 1)
    setChallenge(ch)
    setSelected([])
    setWrong([])
    setSelectedChoice(null)
    setHintUsed(false)
    setHintVisible(false)
    setFeedback(null)
    setMergeResult([])
    setPartition({})
    setRoundStart(Date.now())
    setBsLow(0)
    setBsHigh(ch.array.length - 1)
    timers.current.forEach(clearInterval)
    if (mode === 'multiplayer') {
      timers.current = FAKE_OPPONENTS.map(op => setInterval(() => {
        setOpponentScores(prev => ({ ...prev, [op.id]: (prev[op.id] ?? 0) + rng(12, 42) }))
      }, rng(1800, 4800)))
    }
  }

  function startGame() {
    sfx.submit()
    gameMusic.play()
    setScore(0)
    setCombo(0)
    setRound(0)
    setCorrect(0)
    setBestStreak(0)
    setBadges(new Set())
    setMission(pick(RUN_MISSIONS))
    setMissionPaid(false)
    if (mode === 'multiplayer') {
      const init: Record<string, number> = {}
      FAKE_OPPONENTS.forEach(op => { init[op.id] = 0 })
      setOpponentScores(init)
    }
    loadChallenge(0)
    setPhase('playing')
  }

  function awardBadges(ch: Challenge, nextCombo: number) {
    setBadges(prev => {
      const next = new Set(prev)
      if (ch.type === 'spot_algorithm') next.add('Pattern Spotter')
      if (ch.type === 'quicksort_partition') next.add('Pivot Master')
      if (ch.type === 'merge_step') next.add('Merge Maven')
      if (nextCombo >= 3) next.add('On Fire 🔥')
      return next
    })
  }

  function awardMission(ch: Challenge, nextCombo: number) {
    if (missionPaid) return
    const complete =
      (mission.id === 'pattern' && ch.type === 'spot_algorithm' && correct + 1 >= 2) ||
      (mission.id === 'pivot' && ch.type === 'quicksort_partition') ||
      (mission.id === 'streak' && nextCombo >= 3)
    if (!complete) return
    setMissionPaid(true)
    setScore(s => s + mission.reward)
    spawnFloating(mission.reward)
  }

  function scoreCorrect() {
    if (!challenge) return
    sfx.success()
    const elapsed = (Date.now() - roundStart) / 1000
    const nextCombo = combo + 1
    const multiplier = nextCombo >= 3 ? 3 : nextCombo >= 2 ? 2 : 1
    const speedBonus = elapsed < challenge.timeLimit * 0.5 ? POINT_SPEED_BONUS : 0
    const bossBonus = round === TOTAL_ROUNDS - 1 ? BOSS_BONUS : 0
    const gained = (POINT_BASE + speedBonus + bossBonus) * multiplier
    const nextRound = round + 1
    setScore(s => s + gained)
    setCombo(nextCombo)
    setBestStreak(s => Math.max(s, nextCombo))
    setCorrect(c => c + 1)
    setRound(nextRound)
    setFeedback('correct')
    spawnFloating(gained)
    awardBadges(challenge, nextCombo)
    awardMission(challenge, nextCombo)
    timers.current.forEach(clearInterval)
    setTimeout(() => nextRound >= TOTAL_ROUNDS ? setPhase('result') : loadChallenge(nextRound), 1200)
  }

  function scoreWrong(index?: number) {
    if (!challenge || feedback) return
    sfx.error()
    setScore(s => Math.max(0, s + POINT_WRONG))
    setCombo(0)
    setFeedback('wrong')
    if (index !== undefined) setWrong(prev => [...prev, index])
    spawnFloating(POINT_WRONG)
    timers.current.forEach(clearInterval)
    const nextRound = round + 1
    setRound(nextRound)
    setTimeout(() => nextRound >= TOTAL_ROUNDS ? setPhase('result') : loadChallenge(nextRound), 1200)
  }

  function handleChoice(choice: Choice) {
    if (feedback || selectedChoice) return
    sfx.select()
    setSelectedChoice(choice.value)
    choice.correct ? scoreCorrect() : scoreWrong()
  }

  function handleTrackClick(index: number) {
    if (!challenge || feedback) return
    sfx.pick()
    if (challenge.type === 'predict_next_swap') {
      const next = selected.includes(index) ? selected.filter(i => i !== index) : [...selected, index].slice(-2)
      setSelected(next)
      if (next.length === 2) {
        const expected = [...(challenge.order ?? [])].sort().join(',')
        const actual = [...next].sort().join(',')
        actual === expected ? scoreCorrect() : scoreWrong(index)
      }
      return
    }
    if (challenge.type === 'trace_pass') {
      const expected = challenge.order?.[selected.length]
      if (index === expected) {
        const next = [...selected, index]
        setSelected(next)
        if (next.length === challenge.order?.length) scoreCorrect()
      } else scoreWrong(index)
      return
    }
    if (challenge.type === 'binary_search_steps') {
      const mid = Math.floor((bsLow + bsHigh) / 2)
      if (index !== mid) { scoreWrong(index); return }
      const next = [...selected, index]
      setSelected(next)
      const value = challenge.array[index].value
      if (value === challenge.target) scoreCorrect()
      else if (value < (challenge.target ?? 0)) setBsLow(index + 1)
      else setBsHigh(index - 1)
      return
    }
    if (challenge.type === 'merge_step') {
      const expected = challenge.order?.[mergeResult.length]
      const source = [...(challenge.left ?? []), ...(challenge.right ?? [])]
      const clicked = source[index]
      if (clicked?.value === expected) {
        const next = [...mergeResult, clicked]
        setMergeResult(next)
        if (next.length === challenge.order?.length) scoreCorrect()
      } else scoreWrong(index)
    }
  }

  function markPartition(index: number, side: 'left' | 'right') {
    if (!challenge || feedback || challenge.pivotIndex === index) return
    sfx.pick()
    const next = { ...partition, [index]: side }
    setPartition(next)
    const required = challenge.array.length - 1
    if (Object.keys(next).length !== required) return
    const pivot = challenge.array[challenge.pivotIndex ?? challenge.array.length - 1].value
    const ok = challenge.array.every((el, i) => {
      if (i === challenge.pivotIndex) return true
      return el.value < pivot ? next[i] === 'left' : next[i] === 'right'
    })
    ok ? scoreCorrect() : scoreWrong()
  }

  function useHint() {
    if (!challenge || hintUsed) return
    sfx.hint()
    setHintUsed(true)
    setHintVisible(true)
    setScore(s => Math.max(0, s + POINT_HINT))
    spawnFloating(POINT_HINT)
  }

  function hintText() {
    if (!challenge || !hintVisible) return null
    if (challenge.choices) return `Look for: ${challenge.answer}`
    if (challenge.type === 'binary_search_steps') return `Current mid index is ${Math.floor((bsLow + bsHigh) / 2)}.`
    if (challenge.type === 'predict_next_swap') return `Next swap indices: ${challenge.order?.join(' and ')}.`
    if (challenge.type === 'merge_step') return `Next output value: ${challenge.order?.[mergeResult.length]}.`
    if (challenge.type === 'quicksort_partition') return 'Values smaller than pivot go left; the rest go right.'
    return `Next index: ${challenge.order?.[selected.length]}.`
  }

  function renderChallenge() {
    if (!challenge) return null
    if (challenge.type === 'merge_step') {
      const mergedIds = new Set(mergeResult.map(el => el.id))
      const combined = [...(challenge.left ?? []), ...(challenge.right ?? [])]
      return (
        <div className="sa-merge-board">
          <div>
            <span className="sa-track-label">LEFT HALF</span>
            <ArrayTrack items={challenge.left ?? []} compact={compact} clickable onClick={handleTrackClick}
              selected={(challenge.left ?? []).map((el, i) => mergedIds.has(el.id) ? i : -1).filter(i => i >= 0)} />
          </div>
          <div>
            <span className="sa-track-label">RIGHT HALF</span>
            <ArrayTrack items={challenge.right ?? []} compact={compact} clickable
              onClick={i => handleTrackClick((challenge.left?.length ?? 0) + i)}
              selected={(challenge.right ?? []).map((el, i) => mergedIds.has(el.id) ? i : -1).filter(i => i >= 0)} />
          </div>
          <div>
            <span className="sa-track-label">RESULT</span>
            <ArrayTrack items={mergeResult.length ? mergeResult : combined.map(() => ({ id: uid(), value: 0 }))} compact={compact}
              locked={mergeResult.map((_, i) => i)} />
          </div>
        </div>
      )
    }
    if (challenge.type === 'quicksort_partition') {
      return (
        <div className="sa-partition-board">
          <ArrayTrack items={challenge.array} compact={compact} pivotIndex={challenge.pivotIndex} />
          <div className="sa-partition-actions">
            {challenge.array.map((el, i) => (
              <div key={el.id} className="sa-partition-control">
                <span>{i === challenge.pivotIndex ? 'PIVOT' : el.value}</span>
                {i !== challenge.pivotIndex && (
                  <div>
                    <button className={partition[i] === 'left' ? 'active' : ''} onClick={() => markPartition(i, 'left')}>Left</button>
                    <button className={partition[i] === 'right' ? 'active' : ''} onClick={() => markPartition(i, 'right')}>Right</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }
    return (
      <ArrayTrack
        items={challenge.array}
        compact={compact}
        clickable={['predict_next_swap', 'trace_pass', 'binary_search_steps'].includes(challenge.type)}
        selected={selected}
        wrong={wrong}
        locked={challenge.locked}
        pivotIndex={challenge.pivotIndex}
        onClick={handleTrackClick}
      />
    )
  }

  useEffect(() => () => timers.current.forEach(clearInterval), [])

  if (phase === 'lobby') {
    return (
      <div className="ab-page ab-page--lobby sa-page">
        <div className="ab-grid-bg sa-grid-bg" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button className="ab-back-btn" style={{ marginBottom: 0 }} onClick={() => navigate('/student/games')}><ArrowLeft size={15} /> Back</button>
          <button className="ab-sfx-toggle" onClick={toggleSfx} title={sfxMuted ? 'Unmute sound' : 'Mute sound'}>
            {sfxMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
        <div className="ab-lobby">
          <div className="ab-lobby-hero">
            <div className="sa-lobby-glow" />
            <Trophy className="sa-lobby-icon" size={64} />
            <h1 className="ab-lobby-title sa-lobby-title">SORT ARENA</h1>
            <p className="ab-lobby-sub sa-lobby-sub">MODULE 07 · SORTING & SEARCHING</p>
            <p className="ab-lobby-desc">Read sort states, trace passes, partition pivots, merge halves, and keep binary search honest.</p>
          </div>
          <div className="ab-lobby-section">
            <p className="ab-section-label sa-section-label">// GAME MODE</p>
            <div className="ab-mode-row">
              <button className={`ab-mode-card ${mode === 'solo' ? 'active sa-active' : ''}`} onClick={() => setMode('solo')}>
                <User size={22} /><span className="ab-mode-title">SOLO</span><span className="ab-mode-sub">Practice the arena ladder</span>
              </button>
              <button className={`ab-mode-card ${mode === 'multiplayer' ? 'active multi' : ''}`} onClick={() => setMode('multiplayer')}>
                <Users size={22} /><span className="ab-mode-title">MULTIPLAYER</span><span className="ab-mode-sub">Race against 3 AI bots</span>
                <span className="ab-mode-badge-bot"><Bot size={10} /> AI Bots</span>
              </button>
            </div>
          </div>
          <div className="ab-lobby-section">
            <p className="ab-section-label sa-section-label">// DIFFICULTY</p>
            <div className="ab-diff-row">
              {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG.easy][]).map(([key, cfg]) => (
                <button key={key} className={`ab-diff-card ${difficulty === key ? 'active' : ''}`}
                  style={difficulty === key ? { borderColor: cfg.color, boxShadow: `0 0 20px ${cfg.color}30` } : {}}
                  onClick={() => setDifficulty(key)}>
                  <span className="ab-diff-icon">{key === 'expert' ? 'XL' : key.slice(0, 2).toUpperCase()}</span>
                  <span className="ab-diff-name" style={difficulty === key ? { color: cfg.color } : {}}>{cfg.label}</span>
                  <span className="ab-diff-desc">{cfg.desc}</span>
                  <div className="ab-diff-meta"><span>{cfg.size[0]}-{cfg.size[1]}</span><span style={{ color: cfg.color }}>{cfg.time}s</span></div>
                </button>
              ))}
            </div>
          </div>
          <motion.button className="ab-start-btn sa-start-btn" onClick={startGame} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Zap size={20} /> START GAME <span className="ab-start-rounds">{TOTAL_ROUNDS} ROUNDS</span>
          </motion.button>
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    const accuracy = round ? Math.round((correct / round) * 100) : 0
    const rank = accuracy >= 90 ? 'S' : accuracy >= 75 ? 'A' : accuracy >= 60 ? 'B' : 'C'
    const rankColor = { S: ACCENT, A: '#00D4AA', B: '#9B7ED4', C: '#63B3ED' }[rank]
    const allScores = mode === 'multiplayer'
      ? [{ name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'You', score, isMe: true },
        ...FAKE_OPPONENTS.map(op => ({ name: op.name, score: opponentScores[op.id] ?? 0, isMe: false }))]
        .sort((a, b) => b.score - a.score)
      : null
    return (
      <div className="ab-page ab-page--result sa-page">
        <div className="ab-grid-bg sa-grid-bg" />
        <div className="ab-result">
          <motion.div className="ab-rank-badge" style={{ borderColor: rankColor, boxShadow: `0 0 40px ${rankColor}50` }}
            initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <span className="ab-rank-letter" style={{ color: rankColor }}>{rank}</span><span className="ab-rank-sub">RANK</span>
          </motion.div>
          <div className="ab-result-hero">
            <p className="ab-result-label">TOTAL SCORE</p>
            <div className="ab-result-score" style={{ color: rankColor }}><CountUp target={score} /></div>
          </div>
          <div className="ab-result-stats">
            <div className="ab-result-stat"><CheckCircle size={15} color="#00D4AA" /><span>{correct}/{round}</span><span className="ab-stat-label">CORRECT</span></div>
            <div className="ab-result-stat"><Search size={15} color={ACCENT} /><span>{accuracy}%</span><span className="ab-stat-label">ACCURACY</span></div>
            <div className="ab-result-stat"><Flame size={15} color="#FF6B8A" /><span>{bestStreak}</span><span className="ab-stat-label">STREAK</span></div>
          </div>
          {badges.size > 0 && <div className="sa-badges">{[...badges].map(badge => <span key={badge}>{badge}</span>)}</div>}
          {allScores && (
            <div className="ab-result-leaderboard">
              <p className="ab-section-label sa-section-label">// MATCH RESULTS</p>
              {allScores.map((s, i) => (
                <div key={s.name} className={`ab-result-lb-row ${s.isMe ? 'me' : ''}`}>
                  <span className="ab-lb-medal">#{i + 1}</span><span className="ab-lb-name">{s.name}{s.isMe ? ' (You)' : ''}</span>
                  <span className="ab-lb-score">{s.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          <div className="ab-result-actions">
            <button className="ab-result-btn secondary" onClick={() => setPhase('lobby')}><RotateCcw size={15} /> Play Again</button>
            <button className="ab-result-btn primary sa-result-primary" onClick={() => navigate('/student/games')}>Games Lobby</button>
          </div>
        </div>
      </div>
    )
  }

  const diffCfg = DIFFICULTY_CONFIG[difficulty]
  return (
    <div className="ab-page ab-page--playing sa-page">
      <div className="ab-grid-bg sa-grid-bg" />
      <div className="ab-hud">
        <button className="ab-back-btn" onClick={() => { gameMusic.stop(); setPhase('lobby') }}><ArrowLeft size={14} /></button>
        <div className="ab-hud-score-wrap">
          <div className="ab-hud-score sa-score"><Zap size={14} color={ACCENT} /><span className="ab-hud-score-num">{score.toLocaleString()}</span></div>
          <AnimatePresence>{combo >= 2 && <motion.div className="ab-combo-badge" initial={{ scale: 0 }} animate={{ scale: 1 }}>x{combo >= 3 ? 3 : 2} COMBO</motion.div>}</AnimatePresence>
        </div>
        <div className="ab-hud-rounds">{Array.from({ length: TOTAL_ROUNDS }).map((_, i) => <div key={i} className={`ab-round-pip ${i < round ? 'done' : ''} ${i === round ? 'current' : ''}`} />)}</div>
        <div className="ab-hud-right">
          <button className="ab-sfx-toggle" onClick={toggleSfx} title={sfxMuted ? 'Unmute sound' : 'Mute sound'}>
            {sfxMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          <span className="ab-diff-pill" style={{ color: diffCfg.color, borderColor: `${diffCfg.color}50`, background: `${diffCfg.color}10` }}>{diffCfg.label}</span>
          {mode === 'multiplayer' && <span className="ab-diff-pill"><Bot size={10} /> AI Race</span>}
        </div>
      </div>
      <div className="ab-run-panel sa-run-panel">
        <div><span className="ab-run-label">MISSION</span><strong>{mission.label}</strong></div>
        <span className={`ab-run-reward ${missionPaid ? 'complete' : ''}`}>{missionPaid ? 'CLAIMED' : `+${mission.reward} XP`}</span>
      </div>
      <motion.div className="ab-arena sa-arena">
        <div className="ab-corner ab-corner--tl" /><div className="ab-corner ab-corner--tr" /><div className="ab-corner ab-corner--bl" /><div className="ab-corner ab-corner--br" />
        <TimerBar key={challenge?.instruction} timeLimit={challenge?.timeLimit ?? 35} onExpire={scoreWrong} />
        <div className="ab-instruction-wrap">
          <div className="ab-instruction-badge sa-instruction-badge">{challenge?.title}</div>
          <p className="ab-instruction">{challenge?.instruction}</p>
          <button className="ab-hint-btn" onClick={useHint} disabled={hintUsed}><HelpCircle size={13} />{hintUsed ? '-35 XP used' : 'Hint (-35 XP)'}</button>
          {hintVisible && <p className="sa-hint">{hintText()}</p>}
        </div>
        <div className="ab-floating-wrap">
          <AnimatePresence>{floatingScores.map(f => <motion.div key={f.id} className={`ab-floating ${f.value > 0 ? 'pos' : 'neg'}`} style={{ left: `${f.x}%` }} initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -55 }}>{f.value > 0 ? `+${f.value}` : f.value}</motion.div>)}</AnimatePresence>
        </div>
        <AnimatePresence>{feedback && <motion.div className={`ab-feedback ab-feedback--${feedback}`} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>{feedback === 'correct' ? <><CheckCircle size={28} /> CORRECT!</> : <><AlertCircle size={28} /> WRONG!</>}</motion.div>}</AnimatePresence>
        <div className="ab-array-container">{renderChallenge()}</div>
        {challenge?.choices && (
          <div className="ab-choices">
            {challenge.choices.map((choice, i) => {
              const isSelected = selectedChoice === choice.value
              const isReveal = !!selectedChoice && choice.correct && !isSelected
              const cls = `ab-choice ${isSelected ? (choice.correct ? 'correct' : 'wrong') : ''} ${isReveal ? 'reveal' : ''}`.trim()
              return (
                <motion.button key={choice.value} className={cls} disabled={!!selectedChoice}
                  onClick={() => handleChoice(choice)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <span className="ab-choice-letter">{['A', 'B', 'C', 'D'][i]}</span>{choice.label}
                </motion.button>
              )
            })}
          </div>
        )}
        {mode === 'multiplayer' && (
          <div className="ab-mp-panel">
            <p className="ab-mp-title"><Swords size={12} /> LIVE RACE vs AI BOTS</p>
            {[{ name: 'You', score, color: '#00D4AA', isMe: true }, ...FAKE_OPPONENTS.map(op => ({ name: op.name, score: opponentScores[op.id] ?? 0, color: op.color, isMe: false }))].sort((a, b) => b.score - a.score).map((p, i) => (
              <div key={p.name} className="ab-mp-row"><span className="ab-mp-pos">#{i + 1}</span><div className="ab-mp-avatar" style={{ borderColor: p.color }}>{p.isMe ? 'U' : <Bot size={10} />}</div><span className="ab-mp-name">{p.name}</span><div className="ab-mp-bar-wrap"><motion.div className="ab-mp-bar" style={{ background: p.color }} animate={{ width: `${Math.min((p.score / 700) * 100, 100)}%` }} /></div><span className="ab-mp-score">{p.score}</span></div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
