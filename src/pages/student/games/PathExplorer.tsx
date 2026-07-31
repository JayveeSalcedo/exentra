import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, CheckCircle, Flame, HelpCircle, RotateCcw, Swords,
  Timer, Trash2, Users, Zap, AlertTriangle, Map,
} from 'lucide-react'
import './PathExplorer.css'

/* ── Types ─────────────────────────────────────────────────────────────── */

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type Mode       = 'solo' | 'multiplayer'
type Phase      = 'lobby' | 'playing' | 'result'

type ChallengeType =
  | 'scenario_adjacency'  // Is there a direct edge / who's a neighbor? (scenario, no recipe)
  | 'predict_bfs'         // Which sequence is the correct BFS order from a start node? (MC)
  | 'predict_dfs'         // Which sequence is the correct DFS order from a start node? (MC)
  | 'trace_bfs'           // Click nodes in correct BFS visit order (no labels)
  | 'trace_dfs'           // Click nodes in correct DFS visit order (no labels)
  | 'shortest_hops'       // Fewest edges between two nodes, unweighted (MC numeric)
  | 'shortest_weighted'   // Pick the lowest-cost path between two nodes, weighted (MC)
  | 'spot_property'       // Cycle / connectivity / degree question about the graph (MC)

interface MCOption { label: string; correct: boolean }

interface GNode { id: string; label: string }
interface GEdge { a: string; b: string; weight?: number }

interface Challenge {
  type: ChallengeType
  title: string
  scenario: string          // Narrative, never a step-by-step recipe
  timeLimit: number
  maxSize: number
  nodes: GNode[]
  edges: GEdge[]
  directed: boolean
  weighted: boolean
  startId?: string
  expectedOrder?: string[]  // ids in correct visit order (trace_bfs / trace_dfs)
  mcOptions?: MCOption[]
  answer?: string
}

interface FloatingScore { id: string; value: number; x: number }

/* ── Constants ─────────────────────────────────────────────────────────── */

const ACCENT        = '#9B7ED4'
const TOTAL_ROUNDS  = 5
const POINT_BASE    = 100
const POINT_SPEED   = 50
const POINT_WRONG   = -25
const POINT_HINT    = -35

const DIFFICULTY_CONFIG: Record<Difficulty, {
  label: string; desc: string; time: number; maxSize: number; color: string
}> = {
  easy:   { label: 'Easy',   desc: 'Mental adjacency — no hand-holding',     time: 40,  maxSize: 6,  color: '#00D4AA' },
  medium: { label: 'Medium', desc: 'Trace BFS & DFS visit order',           time: 55,  maxSize: 7,  color: ACCENT    },
  hard:   { label: 'Hard',   desc: 'Shortest hops, cycles & connectivity',  time: 70,  maxSize: 8,  color: '#FFB830' },
  expert: { label: 'Expert', desc: 'Weighted shortest paths, degree traps', time: 90,  maxSize: 9,  color: '#FF6B8A' },
}

const TYPES_BY_DIFF: Record<Difficulty, ChallengeType[]> = {
  easy:   ['scenario_adjacency', 'predict_bfs', 'predict_dfs'],
  medium: ['trace_bfs', 'trace_dfs', 'spot_property'],
  hard:   ['shortest_hops', 'spot_property', 'trace_bfs'],
  expert: ['shortest_weighted', 'trace_dfs', 'spot_property'],
}

const FAKE_OPPONENTS = [
  { name: 'Kai [AI]',  ops: 0 },
  { name: 'Mira [AI]', ops: 0 },
  { name: 'Theo [AI]', ops: 0 },
]

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

/* ── Utilities ─────────────────────────────────────────────────────────── */

function uid()  { return Math.random().toString(36).slice(2, 9) }
function rng(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(arr: T[]) { return arr[rng(0, arr.length - 1)] }
function shuffle<T>(arr: T[]) { return [...arr].sort(() => Math.random() - 0.5) }

function neighborsOf(edges: GEdge[], id: string, directed: boolean): string[] {
  const out: string[] = []
  edges.forEach(e => {
    if (e.a === id) out.push(e.b)
    else if (!directed && e.b === id) out.push(e.a)
  })
  return out
}

function edgeWeight(edges: GEdge[], a: string, b: string): number {
  const e = edges.find(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))
  return e?.weight ?? 1
}

/** Build a connected random graph: a spine (guarantees connectivity) plus a few extra edges. */
function buildGraph(nodeCount: number, extraEdgeChance: number, weighted: boolean): { nodes: GNode[]; edges: GEdge[] } {
  const nodes: GNode[] = Array.from({ length: nodeCount }, (_, i) => ({ id: uid(), label: LABELS[i] }))
  const order = shuffle(nodes)
  const edges: GEdge[] = []
  const has = new Set<string>()
  function key(a: string, b: string) { return [a, b].sort().join('|') }
  function addEdge(a: string, b: string) {
    const k = key(a, b)
    if (a === b || has.has(k)) return
    has.add(k)
    edges.push({ a, b, weight: weighted ? rng(1, 9) : undefined })
  }
  // Spine guarantees every node is reachable.
  for (let i = 1; i < order.length; i++) addEdge(order[i - 1].id, order[i].id)
  // Extra edges add branching / cycles without ever disconnecting anything.
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 2; j < order.length; j++) {
      if (Math.random() < extraEdgeChance) addEdge(order[i].id, order[j].id)
    }
  }
  return { nodes, edges }
}

function bfsOrder(nodes: GNode[], edges: GEdge[], startId: string, directed: boolean): string[] {
  const visited = new Set<string>([startId])
  const order = [startId]
  const queue = [startId]
  while (queue.length) {
    const cur = queue.shift()!
    const nbrs = neighborsOf(edges, cur, directed).filter(n => nodes.some(x => x.id === n)).sort()
    nbrs.forEach(n => {
      if (!visited.has(n)) { visited.add(n); order.push(n); queue.push(n) }
    })
  }
  return order
}

function dfsOrder(nodes: GNode[], edges: GEdge[], startId: string, directed: boolean): string[] {
  const visited = new Set<string>()
  const order: string[] = []
  function walk(id: string) {
    visited.add(id)
    order.push(id)
    const nbrs = neighborsOf(edges, id, directed).filter(n => nodes.some(x => x.id === n)).sort()
    nbrs.forEach(n => { if (!visited.has(n)) walk(n) })
  }
  walk(startId)
  return order
}

function hopDistances(nodes: GNode[], edges: GEdge[], startId: string): Record<string, number> {
  const dist: Record<string, number> = { [startId]: 0 }
  const queue = [startId]
  while (queue.length) {
    const cur = queue.shift()!
    neighborsOf(edges, cur, false).forEach(n => {
      if (!(n in dist)) { dist[n] = dist[cur] + 1; queue.push(n) }
    })
  }
  return dist
}

/** Dijkstra shortest weighted distance + path (undirected, positive weights). */
function dijkstra(nodes: GNode[], edges: GEdge[], startId: string) {
  const dist: Record<string, number> = {}
  const prev: Record<string, string | null> = {}
  const unvisited = new Set(nodes.map(n => n.id))
  nodes.forEach(n => { dist[n.id] = n.id === startId ? 0 : Infinity; prev[n.id] = null })
  while (unvisited.size) {
    let cur: string | null = null
    let best = Infinity
    unvisited.forEach(id => { if (dist[id] < best) { best = dist[id]; cur = id } })
    if (cur === null) break
    unvisited.delete(cur)
    neighborsOf(edges, cur, false).forEach(n => {
      if (!unvisited.has(n)) return
      const alt = dist[cur!] + edgeWeight(edges, cur!, n)
      if (alt < dist[n]) { dist[n] = alt; prev[n] = cur }
    })
  }
  return { dist, prev }
}

function pathTo(prev: Record<string, string | null>, target: string): string[] {
  const path: string[] = []
  let cur: string | null = target
  while (cur) { path.unshift(cur); cur = prev[cur] }
  return path
}

function isConnected(nodes: GNode[], edges: GEdge[]): boolean {
  if (nodes.length === 0) return true
  const seen = bfsOrder(nodes, edges, nodes[0].id, false)
  return seen.length === nodes.length
}

function hasCycle(nodes: GNode[], edges: GEdge[]): boolean {
  // Undirected simple graph: cycle exists iff edges >= nodes (for a connected component) —
  // more generally, run a DFS parent-check.
  const visited = new Set<string>()
  let found = false
  function walk(id: string, parent: string | null) {
    visited.add(id)
    neighborsOf(edges, id, false).forEach(n => {
      if (!visited.has(n)) walk(n, id)
      else if (n !== parent) found = true
    })
  }
  nodes.forEach(n => { if (!visited.has(n.id)) walk(n.id, null) })
  return found
}

function degreeOf(edges: GEdge[], id: string): number {
  return edges.filter(e => e.a === id || e.b === id).length
}

/** Circular layout — deterministic, evenly spaced, good for any node count this game uses. */
function layoutCircle(nodes: GNode[]) {
  const positions: Record<string, { x: number; y: number }> = {}
  const n = nodes.length
  const cx = 0, cy = 0, r = 1
  nodes.forEach((node, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    positions[node.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })
  return positions
}

function labelOf(nodes: GNode[], id: string) { return nodes.find(n => n.id === id)?.label ?? '?' }

/* ── Challenge generation ──────────────────────────────────────────────── */

function generateChallenge(difficulty: Difficulty, round: number): Challenge {
  const cfg = DIFFICULTY_CONFIG[difficulty]
  const forcedFinal: Partial<Record<Difficulty, ChallengeType>> = {
    hard: 'shortest_hops', expert: 'shortest_weighted',
  }
  const type: ChallengeType =
    round === TOTAL_ROUNDS - 1 && forcedFinal[difficulty]
      ? forcedFinal[difficulty]!
      : pick(TYPES_BY_DIFF[difficulty])

  /* ── scenario_adjacency ──────────────────────────────────────────────── */
  if (type === 'scenario_adjacency') {
    const n = rng(5, 6)
    const { nodes, edges } = buildGraph(n, 0.12, false)
    const a = pick(nodes)
    const others = nodes.filter(x => x.id !== a.id)
    const isNeighbor = (id: string) => neighborsOf(edges, a.id, false).includes(id)
    const neighborNodes = others.filter(o => isNeighbor(o.id))
    const nonNeighborNodes = others.filter(o => !isNeighbor(o.id))
    const askNeighbor = neighborNodes.length > 0 && (nonNeighborNodes.length === 0 || Math.random() < 0.5)
    const target = askNeighbor ? pick(neighborNodes) : pick(nonNeighborNodes.length ? nonNeighborNodes : others)
    const correct = askNeighbor ? 'Yes — directly connected' : 'No — not directly connected'
    const mcOptions = shuffle([
      { label: 'Yes — directly connected', correct: correct.startsWith('Yes') },
      { label: 'No — not directly connected', correct: correct.startsWith('No') },
    ])
    return {
      type, title: 'Direct Connection?',
      scenario: `In this graph, is there a direct edge between ${a.label} and ${target.label}? (Not "can you reach it" — is there a single edge linking them?)`,
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, edges, directed: false, weighted: false,
      mcOptions, answer: correct,
    }
  }

  /* ── predict_bfs ─────────────────────────────────────────────────────── */
  if (type === 'predict_bfs') {
    const n = rng(5, 6)
    const { nodes, edges } = buildGraph(n, 0.1, false)
    const start = pick(nodes)
    const correctOrder = bfsOrder(nodes, edges, start.id, false).map(id => labelOf(nodes, id))
    const correctStr = correctOrder.join(', ')
    const dfsAlt = dfsOrder(nodes, edges, start.id, false).map(id => labelOf(nodes, id)).join(', ')
    const reversedAlt = [...correctOrder].reverse().join(', ')
    const shuffledAlt = shuffle([...correctOrder]).join(', ')
    const distractors = [dfsAlt, reversedAlt, shuffledAlt].filter(d => d !== correctStr)
    const mcOptions = shuffle([
      { label: correctStr, correct: true },
      ...shuffle(distractors).slice(0, 3).map(l => ({ label: l, correct: false })),
    ])
    return {
      type, title: 'Spot the BFS Order',
      scenario: `Starting from ${start.label}, which sequence below is the correct breadth-first visit order? BFS explores level by level — think about what a queue gives you, not a stack.`,
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, edges, directed: false, weighted: false,
      startId: start.id, mcOptions, answer: correctStr,
    }
  }

  /* ── predict_dfs ─────────────────────────────────────────────────────── */
  if (type === 'predict_dfs') {
    const n = rng(5, 6)
    const { nodes, edges } = buildGraph(n, 0.1, false)
    const start = pick(nodes)
    const correctOrder = dfsOrder(nodes, edges, start.id, false).map(id => labelOf(nodes, id))
    const correctStr = correctOrder.join(', ')
    const bfsAlt = bfsOrder(nodes, edges, start.id, false).map(id => labelOf(nodes, id)).join(', ')
    const reversedAlt = [...correctOrder].reverse().join(', ')
    const shuffledAlt = shuffle([...correctOrder]).join(', ')
    const distractors = [bfsAlt, reversedAlt, shuffledAlt].filter(d => d !== correctStr)
    const mcOptions = shuffle([
      { label: correctStr, correct: true },
      ...shuffle(distractors).slice(0, 3).map(l => ({ label: l, correct: false })),
    ])
    return {
      type, title: 'Spot the DFS Order',
      scenario: `Starting from ${start.label}, which sequence below is the correct depth-first visit order? DFS commits to one neighbor and goes as deep as it can before backtracking — think stack, not queue.`,
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, edges, directed: false, weighted: false,
      startId: start.id, mcOptions, answer: correctStr,
    }
  }

  /* ── trace_bfs ───────────────────────────────────────────────────────── */
  if (type === 'trace_bfs') {
    const n = rng(6, 7)
    const { nodes, edges } = buildGraph(n, 0.1, false)
    const start = pick(nodes)
    const expectedOrder = bfsOrder(nodes, edges, start.id, false)
    return {
      type, title: 'Trace the BFS',
      scenario: `Click the nodes in the order BFS would visit them, starting from ${start.label}. No labels — apply the level-by-level rule yourself. Ties between same-level neighbors break alphabetically.`,
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, edges, directed: false, weighted: false,
      startId: start.id, expectedOrder,
    }
  }

  /* ── trace_dfs ───────────────────────────────────────────────────────── */
  if (type === 'trace_dfs') {
    const n = rng(6, 7)
    const { nodes, edges } = buildGraph(n, 0.1, false)
    const start = pick(nodes)
    const expectedOrder = dfsOrder(nodes, edges, start.id, false)
    return {
      type, title: 'Trace the DFS',
      scenario: `Click the nodes in the order DFS would visit them, starting from ${start.label}. Commit to a branch and go as deep as possible before backtracking. Ties break alphabetically.`,
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, edges, directed: false, weighted: false,
      startId: start.id, expectedOrder,
    }
  }

  /* ── shortest_hops ───────────────────────────────────────────────────── */
  if (type === 'shortest_hops') {
    const n = rng(6, 8)
    const { nodes, edges } = buildGraph(n, 0.14, false)
    const a = pick(nodes)
    const dist = hopDistances(nodes, edges, a.id)
    const candidates = nodes.filter(x => x.id !== a.id && dist[x.id] > 0)
    const b = pick(candidates)
    const correctHops = dist[b.id]
    const distractors = [correctHops - 1, correctHops + 1, correctHops + 2].filter(d => d >= 0 && d !== correctHops).map(String)
    const mcOptions = shuffle([
      { label: String(correctHops), correct: true },
      ...shuffle(distractors).slice(0, 3).map(l => ({ label: l, correct: false })),
    ])
    return {
      type, title: 'Fewest Hops',
      scenario: `What is the minimum number of edges to get from ${a.label} to ${b.label}? Count edges, not nodes visited.`,
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, edges, directed: false, weighted: false,
      mcOptions, answer: String(correctHops),
    }
  }

  /* ── shortest_weighted ───────────────────────────────────────────────── */
  if (type === 'shortest_weighted') {
    const n = rng(6, 8)
    const { nodes, edges } = buildGraph(n, 0.16, true)
    const a = pick(nodes)
    const { dist, prev } = dijkstra(nodes, edges, a.id)
    const candidates = nodes.filter(x => x.id !== a.id && dist[x.id] < Infinity && dist[x.id] > 0)
    const b = pick(candidates)
    const correctPath = pathTo(prev, b.id).map(id => labelOf(nodes, id)).join(' → ')
    const correctCost = dist[b.id]
    const correct = `${correctPath} (cost ${correctCost})`
    // Distractor: shortest by hop count instead of weight (classic trap — fewest edges ≠ cheapest)
    const hopPath = bfsOrder(nodes, edges, a.id, false)
    const hopDist = hopDistances(nodes, edges, a.id)
    let altPath = correctPath
    if (hopDist[b.id] !== undefined) {
      // Re-derive an actual hop-shortest path via BFS parent tracking
      const parents: Record<string, string | null> = { [a.id]: null }
      const q = [a.id]
      while (q.length) {
        const cur = q.shift()!
        neighborsOf(edges, cur, false).forEach(nb => {
          if (!(nb in parents)) { parents[nb] = cur; q.push(nb) }
        })
      }
      const hp = pathTo(parents, b.id).map(id => labelOf(nodes, id))
      altPath = hp.join(' → ')
    }
    let altCost = 0
    const hpIds = pathTo((() => {
      const parents: Record<string, string | null> = { [a.id]: null }
      const q = [a.id]
      while (q.length) {
        const cur = q.shift()!
        neighborsOf(edges, cur, false).forEach(nb => { if (!(nb in parents)) { parents[nb] = cur; q.push(nb) } })
      }
      return parents
    })(), b.id)
    for (let i = 1; i < hpIds.length; i++) altCost += edgeWeight(edges, hpIds[i - 1], hpIds[i])
    const hopTrap = `${altPath} (cost ${altCost})`
    const reversedTrap = `${[...correctPath.split(' → ')].reverse().join(' → ')} (cost ${correctCost})`
    const inflatedTrap = `${correctPath} (cost ${correctCost + rng(2, 5)})`
    const distractors = [hopTrap, reversedTrap, inflatedTrap].filter(d => d !== correct)
    const mcOptions = shuffle([
      { label: correct, correct: true },
      ...shuffle(distractors).slice(0, 3).map(l => ({ label: l, correct: false })),
    ])
    return {
      type, title: 'Cheapest Route',
      scenario: `Edges are weighted (shown as numbers on each connection). Which path from ${a.label} to ${b.label} has the LOWEST total cost? Fewest edges does not always mean cheapest.`,
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, edges, directed: false, weighted: true,
      mcOptions, answer: correct,
    }
  }

  /* ── spot_property ───────────────────────────────────────────────────── */
  const n = rng(5, 7)
  const wantCycleQuestion = Math.random() < 0.34
  const wantDegreeQuestion = !wantCycleQuestion && Math.random() < 0.5
  if (wantCycleQuestion) {
    // Build either a tree (no cycle) or tree+1 edge (guaranteed cycle), 50/50.
    const makeCycle = Math.random() < 0.5
    const { nodes, edges } = buildGraph(n, 0, false)
    if (makeCycle && nodes.length >= 3) {
      const a = nodes[0], b = nodes[nodes.length - 1]
      if (!edges.some(e => (e.a === a.id && e.b === b.id) || (e.a === b.id && e.b === a.id))) {
        edges.push({ a: a.id, b: b.id })
      }
    }
    const correct = hasCycle(nodes, edges) ? 'Yes — this graph contains a cycle' : 'No — this graph has no cycle'
    const mcOptions = shuffle([
      { label: 'Yes — this graph contains a cycle', correct: correct.startsWith('Yes') },
      { label: 'No — this graph has no cycle', correct: correct.startsWith('No') },
    ])
    return {
      type: 'spot_property', title: 'Cycle Check',
      scenario: 'Does this graph contain a cycle — a path that starts and ends at the same node without reusing an edge?',
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, edges, directed: false, weighted: false,
      mcOptions, answer: correct,
    }
  }
  if (wantDegreeQuestion) {
    const { nodes, edges } = buildGraph(n, 0.15, false)
    const target = pick(nodes)
    const correctDeg = degreeOf(edges, target.id)
    const distractors = [correctDeg - 1, correctDeg + 1, correctDeg + 2].filter(d => d >= 0 && d !== correctDeg).map(String)
    const mcOptions = shuffle([
      { label: String(correctDeg), correct: true },
      ...shuffle(distractors).slice(0, 3).map(l => ({ label: l, correct: false })),
    ])
    return {
      type: 'spot_property', title: 'Count the Degree',
      scenario: `What is the degree of node ${target.label} — how many edges touch it directly?`,
      timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, edges, directed: false, weighted: false,
      mcOptions, answer: String(correctDeg),
    }
  }
  // connectivity question — occasionally split the node set into two components
  const splitOff = Math.random() < 0.5 && n >= 6
  let nodes: GNode[], edges: GEdge[]
  if (splitOff) {
    const g1 = buildGraph(Math.ceil(n / 2), 0.1, false)
    const g2 = buildGraph(Math.floor(n / 2), 0.1, false)
    nodes = [...g1.nodes, ...g2.nodes]
    edges = [...g1.edges, ...g2.edges]
  } else {
    const g = buildGraph(n, 0.1, false)
    nodes = g.nodes; edges = g.edges
  }
  const correct = isConnected(nodes, edges) ? 'Yes — every node can reach every other node' : 'No — at least one node is unreachable from the rest'
  const mcOptions = shuffle([
    { label: 'Yes — every node can reach every other node', correct: correct.startsWith('Yes') },
    { label: 'No — at least one node is unreachable from the rest', correct: correct.startsWith('No') },
  ])
  return {
    type: 'spot_property', title: 'Fully Connected?',
    scenario: 'Is this graph connected — can you get from any node to any other node by following edges (direction doesn\'t matter)?',
    timeLimit: cfg.time, maxSize: cfg.maxSize, nodes, edges, directed: false, weighted: false,
    mcOptions, answer: correct,
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
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [seconds, onExpire])
  const pct   = (rem / seconds) * 100
  const color = pct > 45 ? ACCENT : pct > 20 ? '#F97316' : '#FF6B8A'
  return (
    <div className="pe-timer">
      <Timer size={14} color={color} />
      <div className="pe-timer-track">
        <motion.div className="pe-timer-fill" style={{ background: color }} animate={{ width: `${pct}%` }} />
      </div>
      <span style={{ color }}>{rem}s</span>
    </div>
  )
}

/** Visual graph canvas — circular layout, SVG edges (weighted labels), clickable nodes. */
function GraphCanvas({
  nodes, edges, weighted, startId, clickedIds, wrongId, onNodeClick,
}: {
  nodes: GNode[]; edges: GEdge[]; weighted: boolean; startId?: string
  clickedIds?: string[]; wrongId?: string | null
  onNodeClick?: (id: string) => void
}) {
  const positions = useMemo(() => layoutCircle(nodes), [nodes])
  const size = 280
  const cx = size / 2, cy = size / 2, r = size * 0.38

  function px(id: string) { return cx + (positions[id]?.x ?? 0) * r }
  function py(id: string) { return cy + (positions[id]?.y ?? 0) * r }

  return (
    <div className="pe-canvas-wrap">
      <svg className="pe-canvas" viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: size }}>
        {edges.map((e, i) => {
          const x1 = px(e.a), y1 = py(e.a), x2 = px(e.b), y2 = py(e.b)
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
          return (
            <g key={`${e.a}-${e.b}-${i}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(155,126,212,0.3)" strokeWidth={1.5} />
              {weighted && (
                <>
                  <circle cx={mx} cy={my} r={9} fill="#0A0D1A" stroke="rgba(155,126,212,0.5)" strokeWidth={1} />
                  <text x={mx} y={my + 3} textAnchor="middle" fontSize="9" fontWeight={700} fill="#9B7ED4">
                    {e.weight}
                  </text>
                </>
              )}
            </g>
          )
        })}

        {nodes.map(n => {
          const isStart   = startId === n.id
          const isClicked = clickedIds?.includes(n.id)
          const isWrong   = wrongId === n.id
          let cls = 'pe-node-circle'
          if (isWrong) cls += ' pe-node-circle--wrong'
          else if (isClicked) cls += ' pe-node-circle--done'
          else if (isStart) cls += ' pe-node-circle--start'
          return (
            <foreignObject key={n.id} x={px(n.id) - 20} y={py(n.id) - 20} width={40} height={40}>
              <div
                className={cls}
                onClick={onNodeClick ? () => onNodeClick(n.id) : undefined}
                style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
              >
                {n.label}
              </div>
            </foreignObject>
          )
        })}
      </svg>
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
    setChosen(o.label)
    onPick(o)
  }
  return (
    <div className="pe-mc-grid">
      {options.map(o => {
        let cls = 'pe-mc-btn'
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

export default function PathExplorer() {
  const navigate = useNavigate()

  /* Global state */
  const [phase,      setPhase]      = useState<Phase>('lobby')
  const [mode,       setMode]       = useState<Mode>('solo')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')

  /* Round state */
  const [challenge,  setChallenge]  = useState<Challenge | null>(null)
  const [clickedIds, setClickedIds] = useState<string[]>([])
  const [wrongId,    setWrongId]    = useState<string | null>(null)
  const [mcLocked,   setMcLocked]   = useState(false)

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

  const cfg = DIFFICULTY_CONFIG[difficulty]

  /* ── Hint text ── */
  const hintText = useMemo(() => {
    if (!challenge) return ''
    if (challenge.type === 'scenario_adjacency')
      return 'A direct edge means the two nodes are linked by a single line in the drawing — not that you can eventually reach one from the other.'
    if (challenge.type === 'predict_bfs' || challenge.type === 'trace_bfs')
      return 'BFS visits the start, then ALL of its direct neighbors, then all of THEIR unvisited neighbors — level by level, like a queue (first in, first explored).'
    if (challenge.type === 'predict_dfs' || challenge.type === 'trace_dfs')
      return 'DFS picks one neighbor and keeps going deeper through it before trying the next neighbor — like a stack (most recent path, fully explored before backtracking).'
    if (challenge.type === 'shortest_hops')
      return 'Count the edges along the shortest possible chain of connections, not the total number of nodes you pass through.'
    if (challenge.type === 'shortest_weighted')
      return 'Add up the numbers along each candidate path. The path with the smallest total wins — even if it crosses more edges than a "shorter-looking" route.'
    if (challenge.type === 'spot_property')
      return 'Cycle = a closed loop without reusing an edge. Connected = every node reachable from every other. Degree = count of edges touching one node directly.'
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
    setClickedIds([])
    setWrongId(null)
    setMcLocked(false)
    setFeedback(null)
    setHintUsed(false)
    setHintVisible(false)
    setWrongMsg(null)
    runStart.current = Date.now()
  }

  function startGame() {
    setScore(0); setCombo(0); setRound(0); setCorrect(0); setOps(0); setBadges([])
    setOpponents(FAKE_OPPONENTS.map(o => ({ ...o, ops: rng(8, 18) })))
    loadChallenge(0)
    setPhase('playing')
  }

  function completeRound(extra = 0) {
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
    if (challenge?.type === 'shortest_weighted' && nextCombo >= 2) earned.add('Route Master')
    if (challenge?.type === 'trace_bfs' || challenge?.type === 'trace_dfs') earned.add('Traverser')
    if (challenge?.type === 'spot_property')                                earned.add('Graph Theorist')
    if (nextCombo >= 3)                                                     earned.add('On Fire 🔥')
    setBadges([...earned])
    const nextRound = round + 1
    setTimeout(() => {
      if (nextRound >= TOTAL_ROUNDS) setPhase('result')
      else { setRound(nextRound); loadChallenge(nextRound) }
    }, 950)
  }

  function wrong(msg?: string) {
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
    if (o.correct) setTimeout(() => completeRound(), 650)
    else wrong(`Incorrect. The right answer is: ${challenge?.answer}`)
  }

  /* ── trace_bfs / trace_dfs: click nodes in order ── */
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
    if (nextClicked.length >= challenge.expectedOrder.length) completeRound()
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LOBBY
  ════════════════════════════════════════════════════════════════════════ */
  if (phase === 'lobby') {
    return (
      <div className="pe-page">
        <div className="pe-grid-bg" />
        <button className="pe-back-btn" onClick={() => navigate('/student/games')}>
          <ArrowLeft size={15} /> Back
        </button>
        <section className="pe-lobby">
          <motion.div className="pe-logo-map" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>
            <Map size={40} color={ACCENT} />
          </motion.div>
          <h1>PATH EXPLORER</h1>
          <p className="pe-lobby-sub">MODULE 06 · GRAPHS</p>
          <p className="pe-lobby-desc">
            No step-by-step recipes. Read adjacency from the drawing, trace BFS and DFS
            by hand, compute shortest paths, and judge cycles, connectivity, and degree —
            using your own understanding of graph rules.
          </p>

          <div className="pe-selector">
            <button className={mode === 'solo' ? 'active' : ''} onClick={() => setMode('solo')}>
              <Zap size={18} /> Solo
            </button>
            <button className={mode === 'multiplayer' ? 'active' : ''} onClick={() => setMode('multiplayer')}>
              <Users size={18} /> Multiplayer
            </button>
          </div>

          <div className="pe-diff-grid">
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

          <motion.button className="pe-start-btn" onClick={startGame} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Flame size={20} /> Start Exploring
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
      <div className="pe-page pe-page--result">
        <div className="pe-grid-bg" />
        <div className="pe-result">
          <div className="pe-result-rank">{rank}</div>
          <p className="pe-result-label">TOTAL XP</p>
          <h2><CountUp target={score} /></h2>
          <div className="pe-result-stats">
            <span><CheckCircle size={14} /> {correct}/{TOTAL_ROUNDS}</span>
            <span><Swords size={14} /> {ops} ops</span>
            <span><Zap size={14} /> {accuracy}%</span>
          </div>
          {badges.length > 0 && (
            <div className="pe-badges">
              {badges.map(b => <span key={b}>{b}</span>)}
            </div>
          )}
          {ranked.length > 0 && (
            <div className="pe-race-results">
              {ranked.map((p, i) => (
                <div key={p.name} className={p.isMe ? 'me' : ''}>
                  <b>#{i + 1}</b><span>{p.name}</span><em>{p.ops} ops</em>
                </div>
              ))}
            </div>
          )}
          <div className="pe-result-actions">
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

  const isMC = challenge && ['scenario_adjacency', 'predict_bfs', 'predict_dfs', 'shortest_hops', 'shortest_weighted', 'spot_property'].includes(challenge.type)
  const isTrace = challenge?.type === 'trace_bfs' || challenge?.type === 'trace_dfs'

  return (
    <div className={`pe-page pe-page--playing ${shake ? 'pe-shake' : ''}`}>
      <div className="pe-grid-bg" />

      {/* HUD */}
      <div className="pe-hud">
        <button className="pe-back-btn" onClick={() => setPhase('lobby')}><ArrowLeft size={14} /></button>
        <div className="pe-score"><Zap size={14} /> {score.toLocaleString()}</div>
        <div className="pe-rounds">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <span key={i} className={i < round ? 'done' : i === round ? 'active' : ''} />
          ))}
        </div>
        <span className="pe-pill" style={{ color: cfg.color, borderColor: `${cfg.color}55` }}>{cfg.label}</span>
        {combo >= 2 && <span className="pe-pill pe-combo">×{combo}</span>}
        {mode === 'multiplayer' && <span className="pe-pill"><Users size={11} /> Race</span>}
      </div>

      <main className={`pe-arena ${shake ? 'pe-arena--shake' : ''}`}>
        <TimerBar key={`${round}-${challenge?.type}`} seconds={challenge?.timeLimit ?? cfg.time} onExpire={expireRound} />

        {/* Instruction */}
        <div className="pe-instruction">
          <span>{challenge?.title ?? ''}</span>
          <p>{challenge?.scenario ?? ''}</p>
          <button className="pe-hint-btn" onClick={useHint} disabled={hintUsed}>
            <HelpCircle size={13} /> {hintUsed ? 'Hint used' : 'Hint (−35 pts)'}
          </button>
          {hintVisible && <p className="pe-hint">{hintText}</p>}
          {wrongMsg && (
            <p className="pe-expected"><AlertTriangle size={12} /> {wrongMsg}</p>
          )}
        </div>

        {/* Feedback overlay */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              className={`pe-feedback ${feedback}`}
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
        <div className="pe-floating-wrap" aria-hidden>
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

        {/* ── Multiple-choice layout (shows the graph) ── */}
        {isMC && challenge && (
          <div className="pe-mc-area">
            <div className="pe-mc-graph">
              <span className="pe-panel-label">GRAPH</span>
              <GraphCanvas
                nodes={challenge.nodes}
                edges={challenge.edges}
                weighted={challenge.weighted}
                startId={challenge.startId}
              />
            </div>
            <div className="pe-mc-question">
              <span className="pe-panel-label">YOUR ANSWER</span>
              <MCGrid
                options={challenge.mcOptions!}
                onPick={handleMC}
                locked={mcLocked}
              />
            </div>
          </div>
        )}

        {/* ── trace_bfs / trace_dfs layout ── */}
        {isTrace && challenge && (
          <div className="pe-trace-area">
            <span className="pe-panel-label">
              CLICK NODES IN {challenge.type === 'trace_bfs' ? 'BFS' : 'DFS'} ORDER · START AT {labelOf(challenge.nodes, challenge.startId ?? '')}
            </span>
            <GraphCanvas
              nodes={challenge.nodes}
              edges={challenge.edges}
              weighted={challenge.weighted}
              startId={challenge.startId}
              clickedIds={clickedIds}
              wrongId={wrongId}
              onNodeClick={handleTraversalClick}
            />
            <div className="pe-output">
              {clickedIds.map(id => labelOf(challenge.nodes, id)).join(' → ') || '...'}
            </div>
          </div>
        )}

        {/* Multiplayer race */}
        {mode === 'multiplayer' && (
          <div className="pe-mp">
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
