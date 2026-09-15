import { useState } from 'react'
import { COURSE_MODULES, getCourseModule } from './course'
import { getLessonsForModule } from './index'
import { buildLessonContext } from './lessonContext'

/**
 * Which study guide module (and optionally which of its lessons) an AI generator
 * should draw from. Shared by the teacher quiz generator and the student Problem Bank.
 */
export function useLessonScope(initialModule = 1) {
  const [moduleOrder, setModuleOrderState] = useState(initialModule)
  /** Selected lesson ids; empty means every lesson in the module */
  const [selectedLessons, setSelectedLessons] = useState<string[]>([])

  const courseModule = getCourseModule(moduleOrder) ?? COURSE_MODULES[0]
  const moduleLessons = getLessonsForModule(moduleOrder)
  const chosen = selectedLessons.length ? moduleLessons.filter(l => selectedLessons.includes(l.id)) : moduleLessons

  return {
    moduleOrder,
    courseModule,
    moduleLessons,
    selectedLessons,
    setModuleOrder: (order: number) => { setModuleOrderState(order); setSelectedLessons([]) },
    toggleLesson: (id: string) =>
      setSelectedLessons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]),
    selectAllLessons: () => setSelectedLessons([]),
    /** e.g. "Trees (Binary Search Trees, Balanced BSTs and AVL Trees)" */
    scopeLabel: `${courseModule.title} (${selectedLessons.length ? chosen.map(l => l.title).join(', ') : 'all lessons'})`,
    /** Short title for defaults, e.g. a single lesson's title or the module title */
    shortTitle: chosen.length === 1 ? chosen[0].title : courseModule.title,
    /** Study guide text to ground the AI prompt */
    buildContext: (charBudget?: number) => buildLessonContext(moduleOrder, selectedLessons, charBudget),
  }
}

export type LessonScope = ReturnType<typeof useLessonScope>
