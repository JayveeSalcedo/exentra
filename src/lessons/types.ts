export type VisualizerType =
  | 'array'
  | 'linked-list'
  | 'doubly-linked-list'
  | 'circular-linked-list'
  | 'stack'
  | 'queue'
  | 'circular-queue'
  | 'priority-queue'
  | 'binary-tree'
  | 'bst'
  | 'avl-tree'
  | 'graph-undirected'
  | 'graph-directed'
  | 'bfs-dfs'
  | 'bubble-sort'
  | 'merge-sort'
  | 'binary-search'
  | 'hash-table'
  | 'none'

export interface CodeChallenge {
  prompt: string
  checks: {
    id: string
    label: string
    test: (code: string) => boolean
  }[]
}

export interface Lesson {
  id: string
  moduleId: string
  title: string
  /** One-line hook shown in the header */
  summary: string
  /** 2-3 sentence conceptual explanation, language-agnostic */
  description: string
  /** 3-5 bullet insights the student should walk away with */
  keyPoints: string[]
  /** What the student will accomplish in this lesson */
  objective: string
  /** Step-by-step walkthrough of the concept */
  steps: string[]
  /** Which animated visualizer to mount in the right panel */
  visualizerType: VisualizerType
  /** Java starter code for the practice editor */
  starterCode: string
  /** Expected console output */
  expectedOutput: string
  challenge: CodeChallenge
  hints: string[]
  /** Time-complexity note shown as a footer badge, e.g. "Access O(1) · Search O(n)" */
  complexityNote?: string
}
