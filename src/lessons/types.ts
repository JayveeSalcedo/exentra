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

/** How a code block is shown: Java gets syntax highlighting; pseudocode and text stay monospace */
export type CodeLang = 'java' | 'pseudocode' | 'text'

/** One block of study-guide reading content */
export type ContentBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'code'; code: string; caption?: string; lang?: CodeLang }
  | { type: 'table'; headers: string[]; rows: string[][]; caption?: string }
  | { type: 'note'; text: string }

/** A "Check Your Understanding" item — plain text, or text with a code snippet */
export type Exercise = string | { text: string; code: string; lang?: CodeLang; after?: string }

export interface Lesson {
  id: string
  moduleId: string
  title: string
  /** One-line hook shown in the header */
  summary: string
  /** Unit learning outcomes, taken from the study guide */
  unitOutcomes: string[]
  /** The study guide's content for this unit, in order */
  reading: ContentBlock[]
  /** 3-5 bullet insights the student should walk away with */
  keyPoints: string[]
  /** "Check Your Understanding" items from the study guide */
  exercises: Exercise[]
  /** Estimated reading + practice time */
  durationMinutes: number
  /** Where this lesson comes from in the study guides */
  source: { guide: number; pages: string }
  /** Which animated visualizer to mount in the right panel */
  visualizerType: VisualizerType
  /** Java starter code for the practice editor — only for units with code demos */
  starterCode?: string
  /** Expected console output */
  expectedOutput?: string
  challenge?: CodeChallenge
  hints: string[]
  /** Time-complexity note shown as a header badge, e.g. "Access O(1) · Search O(n)" */
  complexityNote?: string
  /** A short, relevant YouTube video explaining this topic */
  youtubeUrl?: string
}
