import type { Lesson } from './types'

// Module 1 – Arrays
import l1_1 from './module1/l1-1-intro-arrays'
import l1_2 from './module1/l1-2-array-operations'
import l1_3 from './module1/l1-3-multidim-arrays'
import l1_4 from './module1/l1-4-arraylist'

// Module 2 – Linked Lists
import l2_1 from './module2/l2-1-singly-linked-list'
import l2_2 from './module2/l2-2-doubly-linked-list'
import l2_3 from './module2/l2-3-circular-linked-list'
import l2_4 from './module2/l2-4-list-complexity'

// Module 3 – Stacks
import l3_1 from './module3/l3-1-stack-fundamentals'
import l3_2 from './module3/l3-2-push-pop-peek'
import l3_3 from './module3/l3-3-stack-applications'

// Module 4 – Queues
import l4_1 from './module4/l4-1-queue-fundamentals'
import l4_2 from './module4/l4-2-circular-queue'
import l4_3 from './module4/l4-3-priority-queue-deque'

// Module 5 – Trees
import l5_1 from './module5/l5-1-tree-terminology'
import l5_2 from './module5/l5-2-binary-search-trees'
import l5_3 from './module5/l5-3-tree-traversals'
import l5_4 from './module5/l5-4-avl-balanced-trees'

// Module 6 – Graphs
import l6_1 from './module6/l6-1-graph-representations'
import l6_2 from './module6/l6-2-bfs-dfs'
import l6_3 from './module6/l6-3-dijkstra'

// Module 7 – Sorting & Searching
import l7_1 from './module7/l7-1-bubble-selection-sort'
import l7_2 from './module7/l7-2-merge-quick-sort'
import l7_3 from './module7/l7-3-linear-binary-search'

// Module 8 – Hashing
import l8_1 from './module8/l8-1-hash-functions'
import l8_2 from './module8/l8-2-collision-resolution'
import l8_3 from './module8/l8-3-hash-tables-practice'

/** Flat lookup map: lessonId → Lesson */
export const LESSONS: Record<string, Lesson> = Object.fromEntries(
  [
    l1_1, l1_2, l1_3, l1_4,
    l2_1, l2_2, l2_3, l2_4,
    l3_1, l3_2, l3_3,
    l4_1, l4_2, l4_3,
    l5_1, l5_2, l5_3, l5_4,
    l6_1, l6_2, l6_3,
    l7_1, l7_2, l7_3,
    l8_1, l8_2, l8_3,
  ].map((l) => [l.id, l])
)

/** All lessons for a given module, sorted by id */
export function getLessonsForModule(moduleId: string): Lesson[] {
  return Object.values(LESSONS)
    .filter((l) => l.moduleId === moduleId)
    .sort((a, b) => a.id.localeCompare(b.id))
}

export function getLesson(moduleId: string, lessonId: string): Lesson | undefined {
  const l = LESSONS[lessonId]
  return l?.moduleId === moduleId ? l : undefined
}
