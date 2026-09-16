import { useState } from 'react'
import { gradeUnderstandingAnswers, type UnderstandingGrade } from '../lib/groq'
import { buildLessonContext, exerciseToText } from './lessonContext'
import type { Lesson } from './types'

/** A grade plus the exact answer text it was given for (null verdict = submitted but not checked) */
export type StoredGrade =
  | (UnderstandingGrade & { answer: string; unchecked?: false })
  | { answer: string; unchecked: true }

interface Entry {
  answers: string[]
  grades: (StoredGrade | null)[]
}

const STORAGE_PREFIX = 'exentra:cyu:v1'

function load(key: string, count: number): Entry {
  const empty: Entry = { answers: Array(count).fill(''), grades: Array(count).fill(null) }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return empty
    const saved = JSON.parse(raw) as Partial<Entry>
    return {
      answers: empty.answers.map((_, i) => (typeof saved.answers?.[i] === 'string' ? saved.answers[i] : '')),
      grades: empty.grades.map((_, i) => saved.grades?.[i] ?? null),
    }
  } catch {
    return empty
  }
}

function save(key: string, entry: Entry) {
  try { localStorage.setItem(key, JSON.stringify(entry)) } catch { /* storage unavailable */ }
}

/**
 * State for a lesson's "Check Your Understanding": the student's answers, AI grades,
 * and whether every item has been submitted. Answers and grades are kept per
 * student and lesson in localStorage so they survive a reload.
 */
export function useUnderstandingCheck(lesson: Lesson | undefined, userId: string | undefined) {
  const count = lesson?.exercises.length ?? 0
  const key = `${STORAGE_PREFIX}:${userId ?? 'anon'}:${lesson?.id ?? 'none'}`

  const [entries, setEntries] = useState<Record<string, Entry>>({})
  const [grading, setGrading] = useState(false)
  const [error, setError] = useState<{ key: string; message: string } | null>(null)

  const entry = entries[key] ?? load(key, count)

  const update = (next: Entry) => {
    setEntries(prev => ({ ...prev, [key]: next }))
    save(key, next)
  }

  const setAnswer = (index: number, value: string) => {
    const answers = [...entry.answers]
    answers[index] = value
    update({ ...entry, answers })
  }

  /** The grade still matches what is in the answer box */
  const isCurrent = (i: number) => {
    const g = entry.grades[i]
    return !!g && g.answer === entry.answers[i] && entry.answers[i].trim() !== ''
  }

  const allAnswered = count > 0 && entry.answers.every(a => a.trim() !== '')
  const submitted = count === 0 || entry.grades.every((_, i) => isCurrent(i))
  const needsGrading = entry.grades
    .map((g, i) => (!isCurrent(i) || (g && g.unchecked)) ? i : -1)
    .filter(i => i >= 0 && entry.answers[i].trim() !== '')

  const submit = async () => {
    if (!lesson || grading || !allAnswered || needsGrading.length === 0) return
    const submitKey = key
    const snapshot = entry
    const indices = needsGrading
    setGrading(true)
    setError(null)
    try {
      const context = buildLessonContext(Number(lesson.moduleId), [lesson.id], 14000)
      const results = await gradeUnderstandingAnswers(
        context,
        indices.map(i => ({ question: exerciseToText(lesson.exercises[i]), answer: snapshot.answers[i] })),
      )
      const grades = [...snapshot.grades]
      indices.forEach((itemIndex, r) => { grades[itemIndex] = { ...results[r], answer: snapshot.answers[itemIndex] } })
      const next = { ...snapshot, grades }
      setEntries(prev => ({ ...prev, [submitKey]: next }))
      save(submitKey, next)
    } catch (e) {
      console.error('Failed to grade answers:', e)
      // Record the submission so a grading outage never blocks lesson completion
      const grades = [...snapshot.grades]
      indices.forEach(i => { grades[i] = { answer: snapshot.answers[i], unchecked: true } })
      const next = { ...snapshot, grades }
      setEntries(prev => ({ ...prev, [submitKey]: next }))
      save(submitKey, next)
      setError({ key: submitKey, message: 'Your answers were submitted, but they couldn’t be checked right now. Try checking again in a moment.' })
    } finally {
      setGrading(false)
    }
  }

  const checked = entry.grades.filter((g, i): g is UnderstandingGrade & { answer: string } => isCurrent(i) && !!g && !g.unchecked)
  const summary = {
    correct: checked.filter(g => g.verdict === 'correct').length,
    partial: checked.filter(g => g.verdict === 'partial').length,
    incorrect: checked.filter(g => g.verdict === 'incorrect').length,
    unchecked: entry.grades.filter((g, i) => isCurrent(i) && g?.unchecked).length,
    averagePct: checked.length ? Math.round(checked.reduce((n, g) => n + g.score_pct, 0) / checked.length) : null,
  }

  return {
    answers: entry.answers,
    grades: entry.grades,
    isCurrent,
    setAnswer,
    submit,
    grading,
    error: error?.key === key ? error.message : null,
    allAnswered,
    submitted,
    hasPending: needsGrading.length > 0,
    summary,
  }
}

export type UnderstandingCheckState = ReturnType<typeof useUnderstandingCheck>
