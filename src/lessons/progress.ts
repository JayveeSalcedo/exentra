import { COURSE_MODULES, type CourseModule } from './course'
import { getLessonsForModule, COURSE_LESSON_IDS } from './index'
import type { Lesson } from './types'

export type UnlockState = 'done' | 'active' | 'locked'

export interface LessonProgress {
  lesson: Lesson
  state: UnlockState
}

export interface ModuleProgress {
  module: CourseModule
  state: UnlockState
  lessons: LessonProgress[]
  completedCount: number
  /** First lesson not yet completed (null when the module is done or locked) */
  nextLesson: Lesson | null
}

/** Keep only completed rows that belong to the current course */
export function completedLessonSet(rows: { lesson_id: string; completed?: boolean | null }[] | null | undefined): Set<string> {
  const valid = new Set(COURSE_LESSON_IDS)
  return new Set(
    (rows ?? [])
      .filter(r => r.completed !== false && valid.has(r.lesson_id))
      .map(r => r.lesson_id)
  )
}

/**
 * Unlock rules:
 * - Module 1 is always open; module N opens once every lesson of module N-1 is done.
 * - Inside an open module, completed lessons are "done" and only the first
 *   incomplete lesson is "active"; the rest are locked.
 */
export function computeCourseProgress(completed: Set<string>): ModuleProgress[] {
  const result: ModuleProgress[] = []
  let previousDone = true

  for (const mod of COURSE_MODULES) {
    const lessons = getLessonsForModule(mod.order)
    const completedCount = lessons.filter(l => completed.has(l.id)).length
    const allDone = lessons.length > 0 && completedCount === lessons.length
    const unlocked = mod.order === 1 || previousDone

    const state: UnlockState = allDone ? 'done' : unlocked ? 'active' : 'locked'
    const nextLesson = state === 'active' ? lessons.find(l => !completed.has(l.id)) ?? null : null

    result.push({
      module: mod,
      state,
      completedCount,
      nextLesson,
      lessons: lessons.map(lesson => ({
        lesson,
        state: completed.has(lesson.id)
          ? 'done'
          : state === 'active' && nextLesson?.id === lesson.id
          ? 'active'
          : 'locked',
      })),
    })
    previousDone = allDone
  }
  return result
}

/** Whether a student may open this lesson (done lessons can always be reviewed) */
export function isLessonOpen(lessonId: string, completed: Set<string>): boolean {
  for (const mp of computeCourseProgress(completed)) {
    const found = mp.lessons.find(l => l.lesson.id === lessonId)
    if (found) return found.state !== 'locked'
  }
  return false
}
