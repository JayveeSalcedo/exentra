import type { Lesson } from './types'

// Module 1 – Basic Concepts and Notation (Study Guide 1)
import l1_1 from './module1/l1-1-algorithm-properties'
import l1_2 from './module1/l1-2-problem-solving'
import l1_3 from './module1/l1-3-mathematical-functions'
import l1_4 from './module1/l1-4-complexity-big-oh'

// Module 2 – Arrays, Lists and Linked List (Study Guide 2)
import l2_1 from './module2/l2-1-basic-array-concepts'
import l2_2 from './module2/l2-2-arraylist-in-java'
import l2_3 from './module2/l2-3-lists-singly-linked-list'
import l2_4 from './module2/l2-4-doubly-linked-list'

// Module 3 – Stacks and Queues (Study Guide 3)
import l3_1 from './module3/l3-1-stacks'
import l3_2 from './module3/l3-2-queues'
import l3_3 from './module3/l3-3-infix-to-postfix'
import l3_4 from './module3/l3-4-circular-queue'
import l3_5 from './module3/l3-5-topological-sorting'

// Module 4 – Trees (Study Guide 4)
import l4_1 from './module4/l4-1-tree-definitions'
import l4_2 from './module4/l4-2-binary-trees'
import l4_3 from './module4/l4-3-binary-tree-traversals'
import l4_4 from './module4/l4-4-heaps-sequential-forests'
import l4_5 from './module4/l4-5-equivalence-problem'
import l4_6 from './module4/l4-6-binary-search-trees'
import l4_7 from './module4/l4-7-avl-trees'

// Module 5 – Graphs (Study Guide 5)
import l5_1 from './module5/l5-1-graph-definitions'
import l5_2 from './module5/l5-2-graph-representation'
import l5_3 from './module5/l5-3-graph-traversals'
import l5_4 from './module5/l5-4-minimum-spanning-tree'
import l5_5 from './module5/l5-5-shortest-paths'

// Module 6 – Sorting and Searching Algorithms (Study Guide 6)
import l6_1 from './module6/l6-1-merge-sort'
import l6_2 from './module6/l6-2-quick-sort'
import l6_3 from './module6/l6-3-linear-search'
import l6_4 from './module6/l6-4-binary-search'

// Module 7 – Hash Table and Hashing Techniques (Study Guide 7)
import l7_1 from './module7/l7-1-introduction-to-hashing'
import l7_2 from './module7/l7-2-simple-hash-techniques'
import l7_3 from './module7/l7-3-collision-resolution'
import l7_4 from './module7/l7-4-dynamic-hashing'

const ALL_LESSONS: Lesson[] = [
  l1_1, l1_2, l1_3, l1_4,
  l2_1, l2_2, l2_3, l2_4,
  l3_1, l3_2, l3_3, l3_4, l3_5,
  l4_1, l4_2, l4_3, l4_4, l4_5, l4_6, l4_7,
  l5_1, l5_2, l5_3, l5_4, l5_5,
  l6_1, l6_2, l6_3, l6_4,
  l7_1, l7_2, l7_3, l7_4,
]

/** Flat lookup map: lessonId → Lesson */
export const LESSONS: Record<string, Lesson> = Object.fromEntries(
  ALL_LESSONS.map((l) => [l.id, l])
)

/** Lesson number within its module, e.g. "l4-7" → 7 */
export function lessonNumber(lessonId: string): number {
  return Number(lessonId.split('-')[1] ?? 0)
}

/** All lessons for a module (by its "1".."7" id or order number), in lesson order */
export function getLessonsForModule(moduleId: string | number): Lesson[] {
  const key = String(moduleId)
  return ALL_LESSONS
    .filter((l) => l.moduleId === key)
    .sort((a, b) => lessonNumber(a.id) - lessonNumber(b.id))
}

export function getLesson(moduleId: string, lessonId: string): Lesson | undefined {
  const l = LESSONS[lessonId]
  return l?.moduleId === moduleId ? l : undefined
}

/** Every lesson id in the course, in order */
export const COURSE_LESSON_IDS: string[] = ALL_LESSONS.map((l) => l.id)

export const TOTAL_LESSONS = ALL_LESSONS.length
