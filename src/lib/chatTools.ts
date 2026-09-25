// Tool implementations for the Algie chatbot's function calling. Each function
// runs client-side against Supabase (scoped to the caller's own session via
// RLS — safe, no service key needed) or reuses the existing AI generators.
// `card` in the return value is rendered directly by the UI — never passed
// back through the model's own text — so a fragile id/UUID in a link can
// never get garbled by the model retyping it.
import { supabase } from './supabase'
import { COURSE_MODULES, moduleForTopic } from '../lessons/course'
import { getLessonsForModule } from '../lessons'
import { completedLessonSet, computeCourseProgress } from '../lessons/progress'
import type { GeneratedProblem, FlashCard, ProblemChoice } from './groq'

type GenerateProblemFn = (topic: string, difficulty: 'Easy' | 'Medium' | 'Hard', type: 'coding' | 'multiple_choice') => Promise<GeneratedProblem>
type GenerateFlashcardsFn = (topic: string, count: number) => Promise<FlashCard[]>

export const TOPIC_ENUM = COURSE_MODULES.map(m => m.topic)

export interface ToolCard {
  kind: 'lesson' | 'assessment' | 'problem' | 'deck'
  title: string
  subtitle: string
  path: string
}

export interface ToolResult {
  /** Sent back to the model as the tool's result — keep it small and factual */
  result: Record<string, unknown>
  /** Rendered by the UI as a clickable card; the model never has to reproduce this itself */
  card?: ToolCard
}

async function getStudentBlockId(studentId: string): Promise<string | null> {
  const { data } = await supabase
    .from('block_enrollments')
    .select('block_id')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .maybeSingle()
  return data?.block_id ?? null
}

// ── get_my_progress ──────────────────────────────────────────────────────────
export async function toolGetMyProgress(studentId: string): Promise<ToolResult> {
  const { data: progressRows } = await supabase
    .from('student_progress')
    .select('lesson_id, completed')
    .eq('student_id', studentId)

  const moduleProgress = computeCourseProgress(completedLessonSet(progressRows))

  const { data: subs } = await supabase
    .from('submissions')
    .select('percentage, assessments(module_topic)')
    .eq('student_id', studentId)
    .eq('is_submitted', true)
    .not('percentage', 'is', null)

  // Supabase's generic types infer embedded relations as arrays, but a submission's
  // assessment is a to-one relation and comes back as a single object at runtime
  // (same access pattern as StudentProgress.tsx's identical query).
  const scoresByTopic = new Map<string, number[]>()
  for (const s of (subs ?? []) as unknown as { percentage: number | null; assessments: { module_topic: string | null } | null }[]) {
    const topic = moduleForTopic(s.assessments?.module_topic)?.topic
    if (!topic || s.percentage == null) continue
    if (!scoresByTopic.has(topic)) scoresByTopic.set(topic, [])
    scoresByTopic.get(topic)!.push(s.percentage)
  }

  const modules = moduleProgress.map(mp => {
    const scores = scoresByTopic.get(mp.module.topic) ?? []
    const avgAssessmentScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null
    return {
      topic: mp.module.topic,
      status: mp.state,
      lessonsCompleted: mp.completedCount,
      totalLessons: mp.lessons.length,
      avgAssessmentScore,
    }
  })

  return { result: { modules } }
}

// ── open_lesson ──────────────────────────────────────────────────────────────
export async function toolOpenLesson(studentId: string, topic: string): Promise<ToolResult> {
  const mod = COURSE_MODULES.find(m => m.topic === topic) ?? moduleForTopic(topic)
  if (!mod) return { result: { error: `No module found for topic "${topic}"` } }

  const lessons = getLessonsForModule(mod.order)
  if (!lessons.length) return { result: { error: `Module "${mod.title}" has no lessons yet` } }

  const { data: progressRows } = await supabase
    .from('student_progress')
    .select('lesson_id, completed')
    .eq('student_id', studentId)
  const completed = completedLessonSet(progressRows)

  const moduleProgress = computeCourseProgress(completed)
  const mp = moduleProgress.find(p => p.module.order === mod.order)
  const status = mp?.state ?? 'locked'

  if (status === 'locked') {
    const prevModule = moduleProgress.find(p => p.module.order === mod.order - 1)?.module
    return {
      result: {
        status: 'locked',
        moduleTitle: mod.title,
        unlockRequirement: prevModule
          ? `Finish every lesson in "${prevModule.title}" first.`
          : 'This module is not unlocked yet.',
      },
    }
  }

  // Jump to the first not-yet-completed lesson, or the first lesson if the module is fully done
  const lesson = lessons.find(l => !completed.has(l.id)) ?? lessons[0]

  return {
    result: { status, moduleTitle: mod.title, lessonTitle: lesson.title, alreadyCompleted: completed.has(lesson.id) },
    card: {
      kind: 'lesson',
      title: lesson.title,
      subtitle: mod.title,
      path: `/student/courses/${lesson.moduleId}/lessons/${lesson.id}`,
    },
  }
}

// ── open_assessment ──────────────────────────────────────────────────────────
export async function toolOpenAssessment(studentId: string, topic: string): Promise<ToolResult> {
  const blockId = await getStudentBlockId(studentId)

  let query = supabase
    .from('assessments')
    .select('id, title, type, is_archived, module_topic')
    .eq('is_published', true)

  query = blockId
    ? query.or(`block_id.is.null,block_id.eq.${blockId}`)
    : query.is('block_id', null)

  const { data: rows } = await query.order('created_at', { ascending: false })

  const match = (rows ?? []).find(a => !a.is_archived && moduleForTopic(a.module_topic)?.topic === topic)
  if (!match) return { result: { error: `No published assessment found for topic "${topic}"` } }

  return {
    result: { title: match.title, type: match.type },
    card: {
      kind: 'assessment',
      title: match.title,
      subtitle: match.type.charAt(0).toUpperCase() + match.type.slice(1),
      path: `/student/assessments/${match.id}`,
    },
  }
}

// ── generate_practice_problem ─────────────────────────────────────────────────
export async function toolGeneratePracticeProblem(
  studentId: string,
  topic: string,
  difficulty: 'Easy' | 'Medium' | 'Hard',
  type: 'coding' | 'multiple_choice',
  generateProblem: GenerateProblemFn,
): Promise<ToolResult> {
  const mod = COURSE_MODULES.find(m => m.topic === topic) ?? moduleForTopic(topic)
  const scopeLabel = mod?.title ?? topic

  const problem = await generateProblem(scopeLabel, difficulty, type)

  const choices: ProblemChoice[] | null = type === 'multiple_choice' ? (problem.choices ?? null) : null

  const { data: saved, error } = await supabase
    .from('student_problems')
    .insert({
      student_id: studentId,
      topic: mod?.topic ?? topic,
      type,
      difficulty,
      title: problem.title,
      description: problem.description,
      hint: problem.hint || null,
      solution: problem.solution,
      choices,
    })
    .select('id')
    .single()

  if (error || !saved) {
    return { result: { error: 'Generated the problem but could not save it. Please try again.' } }
  }

  return {
    result: { title: problem.title, difficulty, type },
    card: {
      kind: 'problem',
      title: problem.title,
      subtitle: `${difficulty} · ${type === 'coding' ? 'Coding' : 'Multiple Choice'}`,
      path: `/student/problems/${saved.id}`,
    },
  }
}

// ── generate_flashcards ───────────────────────────────────────────────────────
export async function toolGenerateFlashcards(
  studentId: string,
  topic: string,
  count: number,
  generateCards: GenerateFlashcardsFn,
): Promise<ToolResult> {
  const mod = COURSE_MODULES.find(m => m.topic === topic) ?? moduleForTopic(topic)
  const scopeLabel = mod?.title ?? topic
  const cardCount = Math.max(4, Math.min(20, count || 8))

  const cards = await generateCards(scopeLabel, cardCount)
  if (!cards.length) return { result: { error: 'No flashcards were generated. Please try again.' } }

  const title = `${mod?.title ?? topic} Flashcards`

  const { data: deck, error: deckErr } = await supabase
    .from('student_decks')
    .insert({ student_id: studentId, title, topic: mod?.topic ?? topic, card_count: cards.length })
    .select('id')
    .single()

  if (deckErr || !deck) {
    return { result: { error: 'Generated the cards but could not save the deck. Please try again.' } }
  }

  const { error: cardsErr } = await supabase.from('deck_cards').insert(
    cards.map((c, i) => ({ deck_id: deck.id, position: i, front: c.front, back: c.back }))
  )
  if (cardsErr) {
    return { result: { error: 'The deck was created but its cards failed to save.' } }
  }

  return {
    result: { title, cardCount: cards.length },
    card: { kind: 'deck', title, subtitle: `${cards.length} cards`, path: `/student/decks/${deck.id}` },
  }
}
