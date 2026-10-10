import { supabase } from './supabase'
import { COURSE_MODULES, TOTAL_MODULES, moduleForTopic } from '../lessons/course'
import { TOTAL_LESSONS } from '../lessons/index'
import { completedLessonSet, computeCourseProgress, type ModuleProgress } from '../lessons/progress'

/** Score at or above this is passing; below it is flagged as a weak area */
export const PASSING_SCORE = 60

/** Score at or above this is flagged as a strong area */
export const STRONG_SCORE = 80

export interface StudentSummary {
  id: string
  schoolId: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  joinedAt: string | null
  lastActive: string | null
  blockId: string | null
  blockName: string | null
  modulesDone: number
  lessonsDone: number
  assessmentsTaken: number
  avgScore: number | null
  /** Modules whose assessment average is below PASSING_SCORE */
  weakModules: number
}

export interface ModuleScore {
  order: number
  title: string
  topic: string
  avg: number | null
  count: number
}

export interface AssessmentAttempt {
  id: string
  title: string
  moduleTitle: string | null
  type: string
  percentage: number
  submittedAt: string | null
}

export interface LearnerReport extends StudentSummary {
  moduleScores: ModuleScore[]
  attempts: AssessmentAttempt[]
  firstScore: number | null
  latestScore: number | null
  improvement: number | null
  completionPct: number
  courseProgress: ModuleProgress[]
  weakAreas: { title: string; detail: string }[]
  strongAreas: { title: string; detail: string }[]
}

type Row = Record<string, unknown>
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)

function moduleScoresFrom(subs: { percentage: number; topic: string | null }[]): ModuleScore[] {
  return COURSE_MODULES.map(m => {
    const scores = subs.filter(s => moduleForTopic(s.topic)?.order === m.order).map(s => s.percentage)
    return { order: m.order, title: m.title, topic: m.topic, avg: avg(scores), count: scores.length }
  })
}

async function blockNames(studentIds: string[]) {
  const map: Record<string, { id: string; name: string }> = {}
  if (!studentIds.length) return map
  const { data } = await supabase
    .from('block_enrollments')
    .select('student_id, block_id, blocks(name)')
    .eq('status', 'active')
    .in('student_id', studentIds)
  for (const e of (data ?? []) as Row[]) {
    const blocks = e.blocks as { name?: string } | { name?: string }[] | null
    const name = Array.isArray(blocks) ? blocks[0]?.name : blocks?.name
    map[e.student_id as string] = { id: e.block_id as string, name: name ?? 'Block' }
  }
  return map
}

/* ── Class overview ──────────────────────────────────────────────────── */

export interface ClassAnalytics {
  students: StudentSummary[]
  /** Class average per module, across every submitted assessment */
  moduleScores: ModuleScore[]
  /** All submitted percentages with their student, for re-scoping by block */
  submissions: { studentId: string; percentage: number; topic: string | null }[]
}

export async function fetchClassAnalytics(): Promise<ClassAnalytics> {
  const [{ data: profiles }, { data: subs }, { data: progress }] = await Promise.all([
    supabase.from('profiles').select('id, school_id, first_name, last_name, avatar_url, created_at, last_active').eq('role', 'student'),
    supabase.from('submissions').select('student_id, percentage, assessments(module_topic)').eq('is_submitted', true).not('percentage', 'is', null),
    supabase.from('student_progress').select('student_id, lesson_id, completed').eq('completed', true),
  ])

  const students = (profiles ?? []) as Row[]
  const blocks = await blockNames(students.map(p => p.id as string))

  const submissions = ((subs ?? []) as Row[]).map(s => {
    const a = s.assessments as { module_topic?: string | null } | { module_topic?: string | null }[] | null
    const topic = (Array.isArray(a) ? a[0]?.module_topic : a?.module_topic) ?? null
    return { studentId: s.student_id as string, percentage: Number(s.percentage), topic }
  })

  const lessonsByStudent: Record<string, { lesson_id: string; completed: boolean }[]> = {}
  for (const p of (progress ?? []) as Row[]) {
    (lessonsByStudent[p.student_id as string] ??= []).push({ lesson_id: p.lesson_id as string, completed: true })
  }

  const summaries: StudentSummary[] = students.map(p => {
    const id = p.id as string
    const mine = submissions.filter(s => s.studentId === id)
    const course = computeCourseProgress(completedLessonSet(lessonsByStudent[id]))
    const perModule = moduleScoresFrom(mine)
    return {
      id,
      schoolId: p.school_id as string,
      firstName: p.first_name as string,
      lastName: p.last_name as string,
      avatarUrl: (p.avatar_url as string | null) ?? null,
      joinedAt: (p.created_at as string | null) ?? null,
      lastActive: (p.last_active as string | null) ?? null,
      blockId: blocks[id]?.id ?? null,
      blockName: blocks[id]?.name ?? null,
      modulesDone: course.filter(m => m.state === 'done').length,
      lessonsDone: course.reduce((n, m) => n + m.completedCount, 0),
      assessmentsTaken: mine.length,
      avgScore: avg(mine.map(s => s.percentage)),
      weakModules: perModule.filter(m => m.avg !== null && m.avg < PASSING_SCORE).length,
    }
  })

  return { students: summaries, moduleScores: moduleScoresFrom(submissions), submissions }
}

/* ── Single learner ──────────────────────────────────────────────────── */

export async function fetchLearnerReport(studentId: string): Promise<LearnerReport | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, school_id, first_name, last_name, avatar_url, created_at, last_active')
    .eq('id', studentId)
    .maybeSingle()
  if (!profile) return null

  const [subsRes, progressRes, gamesRes, blocks] = await Promise.all([
    supabase.from('submissions')
      .select('id, percentage, submitted_at, assessments(title, type, module_topic)')
      .eq('student_id', studentId).eq('is_submitted', true).not('percentage', 'is', null)
      .order('submitted_at', { ascending: true }),
    supabase.from('student_progress').select('lesson_id, completed').eq('student_id', studentId),
    supabase.from('game_sessions').select('score, correct, total_rounds').eq('student_id', studentId),
    blockNames([studentId]),
  ])

  const attempts: AssessmentAttempt[] = ((subsRes.data ?? []) as Row[]).map(s => {
    const raw = s.assessments as Row | Row[] | null
    const a = (Array.isArray(raw) ? raw[0] : raw) ?? {}
    return {
      id: s.id as string,
      title: (a.title as string) ?? 'Assessment',
      moduleTitle: moduleForTopic(a.module_topic as string | null)?.title ?? (a.module_topic as string | null) ?? null,
      type: (a.type as string) ?? 'quiz',
      percentage: Number(s.percentage),
      submittedAt: (s.submitted_at as string | null) ?? null,
    }
  })
  const moduleScores = moduleScoresFrom(((subsRes.data ?? []) as Row[]).map(s => {
    const raw = s.assessments as Row | Row[] | null
    const a = (Array.isArray(raw) ? raw[0] : raw) ?? {}
    return { percentage: Number(s.percentage), topic: (a.module_topic as string | null) ?? null }
  }))

  const courseProgress = computeCourseProgress(completedLessonSet(progressRes.data as { lesson_id: string; completed: boolean }[]))
  const lessonsDone = courseProgress.reduce((n, m) => n + m.completedCount, 0)
  const modulesDone = courseProgress.filter(m => m.state === 'done').length

  const games = (gamesRes.data ?? []) as Row[]
  const totalRounds = games.reduce((n, g) => n + Number(g.total_rounds ?? 0), 0)
  const correctRounds = games.reduce((n, g) => n + Number(g.correct ?? 0), 0)

  const firstScore = attempts.length ? attempts[0].percentage : null
  const latestScore = attempts.length ? attempts[attempts.length - 1].percentage : null

  const weakAreas: { title: string; detail: string }[] = moduleScores
    .filter(m => m.avg !== null && m.avg < PASSING_SCORE)
    .map(m => ({ title: m.title, detail: `Assessment average ${m.avg}% over ${m.count} attempt${m.count === 1 ? '' : 's'}` }))
  if (!gamesRes.error && totalRounds >= 5 && correctRounds / totalRounds * 100 < PASSING_SCORE) {
    weakAreas.push({ title: 'Game rounds', detail: `${Math.round(correctRounds / totalRounds * 100)}% of rounds solved` })
  }

  const strongAreas: { title: string; detail: string }[] = moduleScores
    .filter(m => m.avg !== null && m.avg >= STRONG_SCORE)
    .map(m => ({ title: m.title, detail: `Assessment average ${m.avg}% over ${m.count} attempt${m.count === 1 ? '' : 's'}` }))

  return {
    id: profile.id,
    schoolId: profile.school_id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    avatarUrl: profile.avatar_url ?? null,
    joinedAt: profile.created_at ?? null,
    lastActive: profile.last_active ?? null,
    blockId: blocks[studentId]?.id ?? null,
    blockName: blocks[studentId]?.name ?? null,
    modulesDone,
    lessonsDone,
    assessmentsTaken: attempts.length,
    avgScore: avg(attempts.map(a => a.percentage)),
    weakModules: weakAreas.length,
    moduleScores,
    attempts,
    firstScore,
    latestScore,
    improvement: firstScore !== null && latestScore !== null && attempts.length > 1 ? Math.round((latestScore - firstScore) * 10) / 10 : null,
    completionPct: Math.round((lessonsDone / TOTAL_LESSONS) * 100),
    courseProgress,
    weakAreas,
    strongAreas,
  }
}

/* ── Class record (gradebook) ─────────────────────────────────────────── */

export interface ClassRecordAssessment {
  id: string
  title: string
  type: string
  totalPoints: number
  dueDate: string | null
  moduleTopic: string | null
}

export interface ClassRecordStudent {
  id: string
  schoolId: string
  firstName: string
  lastName: string
}

export interface ClassRecordData {
  blockName: string
  students: ClassRecordStudent[]
  assessments: ClassRecordAssessment[]
  /** scores[studentId][assessmentId] = raw score earned (out of the assessment's totalPoints), absent if not submitted */
  scores: Record<string, Record<string, number>>
}

export async function fetchClassRecord(teacherId: string, blockId: string): Promise<ClassRecordData> {
  const [{ data: block }, { data: enrollments }, { data: assessmentRows }] = await Promise.all([
    supabase.from('blocks').select('name').eq('id', blockId).eq('teacher_id', teacherId).maybeSingle(),
    supabase.from('block_enrollments')
      .select('student_id, profiles(id, school_id, first_name, last_name)')
      .eq('block_id', blockId).eq('status', 'active'),
    supabase.from('assessments')
      .select('id, title, type, total_points, due_date, module_topic')
      .eq('block_id', blockId).eq('is_archived', false).eq('is_published', true)
      .order('due_date'),
  ])

  const students: ClassRecordStudent[] = ((enrollments ?? []) as Row[])
    .map(e => {
      const raw = e.profiles as Row | Row[] | null
      const p = (Array.isArray(raw) ? raw[0] : raw) ?? {}
      return {
        id: (p.id as string) ?? (e.student_id as string),
        schoolId: (p.school_id as string) ?? '',
        firstName: (p.first_name as string) ?? '',
        lastName: (p.last_name as string) ?? '',
      }
    })
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))

  const assessments: ClassRecordAssessment[] = ((assessmentRows ?? []) as Row[]).map(a => ({
    id: a.id as string,
    title: a.title as string,
    type: (a.type as string) ?? 'quiz',
    totalPoints: Number(a.total_points ?? 0),
    dueDate: (a.due_date as string | null) ?? null,
    moduleTopic: (a.module_topic as string | null) ?? null,
  }))

  const scores: Record<string, Record<string, number>> = {}
  if (assessments.length) {
    const { data: subs } = await supabase
      .from('submissions')
      .select('student_id, assessment_id, score')
      .eq('is_submitted', true).not('score', 'is', null)
      .in('assessment_id', assessments.map(a => a.id))
    for (const s of (subs ?? []) as Row[]) {
      const studentId = s.student_id as string
      ;(scores[studentId] ??= {})[s.assessment_id as string] = Number(s.score)
    }
  }

  return { blockName: block?.name ?? 'Block', students, assessments, scores }
}

export { TOTAL_MODULES, TOTAL_LESSONS }
