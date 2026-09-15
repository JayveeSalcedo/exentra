/**
 * BFS / DFS step generators (Study Guide 5, Unit 3).
 *
 * The study guide's example graph is only shown as an image, so this directed
 * graph was built to reproduce both of the guide's printed results:
 *   DFS from 1: 1 2 9 8 3 5 6 4 10 7
 *   BFS from 1: 1 2 5 9 6 7 8 4 10 3  (with the same queue contents)
 * Neighbours are always taken in ascending order.
 */

export interface GVertex { id: number; x: number; y: number }
export interface GEdge { from: number; to: number }

export const GUIDE_VERTICES: GVertex[] = [
  { id: 1,  x: 185, y: 28 },
  { id: 2,  x: 95,  y: 90 },
  { id: 5,  x: 280, y: 90 },
  { id: 9,  x: 40,  y: 150 },
  { id: 6,  x: 210, y: 160 },
  { id: 7,  x: 335, y: 140 },
  { id: 8,  x: 95,  y: 215 },
  { id: 3,  x: 345, y: 212 },
  { id: 4,  x: 160, y: 262 },
  { id: 10, x: 255, y: 262 },
]

export const GUIDE_EDGES: GEdge[] = [
  { from: 1, to: 2 }, { from: 1, to: 5 },
  { from: 2, to: 9 },
  { from: 5, to: 6 }, { from: 5, to: 7 },
  { from: 9, to: 8 },
  { from: 6, to: 4 }, { from: 6, to: 10 },
  { from: 7, to: 3 },
  { from: 8, to: 3 },
  { from: 3, to: 5 },
  { from: 4, to: 10 },
]

export interface GraphStep {
  current: number | null
  visited: number[]
  /** Queue (BFS) or recursion stack (DFS), front/bottom first */
  frontier: number[]
  /** Edges used to discover a vertex, as "from-to" keys */
  treeEdges: string[]
  /** Edge being examined right now */
  activeEdge?: string
  order: number[]
  line: number | null
  caption: string
}

export const BFS_CODE = [
  'mark start visited; enqueue(start);',
  'while (queue is not empty) {',
  '  v = dequeue(); visit(v);',
  '  for (each neighbour u of v)',
  '    if (u is not visited) { mark u visited; enqueue(u); }',
  '}',
]

export const DFS_CODE = [
  'void dfs(v) {',
  '  mark v visited; visit(v);',
  '  for (each neighbour u of v)',
  '    if (u is not visited) dfs(u);',
  '  // all neighbours done: return to the caller',
  '}',
]

export function adjacency(edges: GEdge[], directed: boolean): Map<number, number[]> {
  const adj = new Map<number, number[]>()
  const add = (a: number, b: number) => adj.set(a, [...(adj.get(a) ?? []), b])
  for (const e of edges) {
    add(e.from, e.to)
    if (!directed) add(e.to, e.from)
  }
  for (const [k, v] of adj) adj.set(k, [...new Set(v)].sort((a, b) => a - b))
  return adj
}

export function bfsSteps(start: number, edges: GEdge[] = GUIDE_EDGES, directed = true): GraphStep[] {
  const adj = adjacency(edges, directed)
  const visited = [start]
  const queue = [start]
  const order: number[] = []
  const treeEdges: string[] = []
  const steps: GraphStep[] = [{ current: null, visited: [...visited], frontier: [...queue], treeEdges: [], order: [], line: 0,
    caption: `Mark ${start} visited and put it in the queue.` }]

  while (queue.length) {
    const v = queue.shift()!
    order.push(v)
    steps.push({ current: v, visited: [...visited], frontier: [...queue], treeEdges: [...treeEdges], order: [...order], line: 2,
      caption: `Dequeue ${v} and visit it. Order so far: ${order.join(' ')}` })
    const added: number[] = []
    for (const u of adj.get(v) ?? []) {
      if (!visited.includes(u)) {
        visited.push(u)
        queue.push(u)
        treeEdges.push(`${v}-${u}`)
        added.push(u)
      }
    }
    steps.push({ current: v, visited: [...visited], frontier: [...queue], treeEdges: [...treeEdges], order: [...order], line: 4,
      caption: added.length
        ? `Enqueue ${v}'s unvisited neighbours: ${added.join(', ')}. QUEUE: ${queue.join(' ')}`
        : `${v} has no unvisited neighbours.${queue.length ? ` QUEUE: ${queue.join(' ')}` : ''}` })
  }
  steps.push({ current: null, visited: [...visited], frontier: [], treeEdges: [...treeEdges], order: [...order], line: 5,
    caption: `The queue is empty. Breadth First Search order: ${order.join(' ')}` })
  return steps
}

export function dfsSteps(start: number, edges: GEdge[] = GUIDE_EDGES, directed = true): GraphStep[] {
  const adj = adjacency(edges, directed)
  const visited: number[] = []
  const order: number[] = []
  const treeEdges: string[] = []
  const steps: GraphStep[] = []

  const dfs = (v: number, stack: number[], from: number | null) => {
    visited.push(v)
    order.push(v)
    if (from !== null) treeEdges.push(`${from}-${v}`)
    const here = [...stack, v]
    steps.push({ current: v, visited: [...visited], frontier: here, treeEdges: [...treeEdges], order: [...order], line: 1,
      caption: `${from === null ? 'Start at' : `Go deeper to`} ${v} and visit it. Order so far: ${order.join(' ')}` })
    for (const u of adj.get(v) ?? []) {
      if (visited.includes(u)) {
        steps.push({ current: v, visited: [...visited], frontier: here, treeEdges: [...treeEdges], activeEdge: `${v}-${u}`, order: [...order], line: 3,
          caption: `${v} → ${u}: ${u} is already visited, skip it.` })
        continue
      }
      dfs(u, here, v)
      steps.push({ current: v, visited: [...visited], frontier: here, treeEdges: [...treeEdges], order: [...order], line: 4,
        caption: `Back at ${v} after finishing ${u}.` })
    }
  }

  dfs(start, [], null)
  steps.push({ current: null, visited: [...visited], frontier: [], treeEdges: [...treeEdges], order: [...order], line: 5,
    caption: `Every reachable vertex is visited. Depth First Search order: ${order.join(' ')}` })
  return steps
}
