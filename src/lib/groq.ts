// All Groq/LLM calls go through the /api/* serverless functions — the API
// key and prompts live server-side only. Each wrapper here just attaches the
// caller's Supabase session (so the server can auth + rate-limit) and posts.
import { supabase } from './supabase'

async function callApi<T>(path: string, body: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('You must be signed in to use this feature.')

  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

// ── Daily challenge ──────────────────────────────────────────────────────────
export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface DailyChallenge {
  question: string
  topic: string
  difficulty: Difficulty
  xp_reward: number
  hint: string
  model_answer: string
}

export async function generateDailyChallenge(): Promise<DailyChallenge> {
  return callApi<DailyChallenge>('/api/daily-challenge', {})
}

export interface ChallengeGrade {
  is_correct: boolean
  score_pct: number
  feedback: string
}

export async function gradeDailyChallengeAnswer(
  question: string,
  modelAnswer: string,
  studentAnswer: string
): Promise<ChallengeGrade> {
  return callApi<ChallengeGrade>('/api/grade-daily-challenge', { question, modelAnswer, studentAnswer })
}

// ── Chatbot ──────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function chatWithGroq(messages: ChatMessage[]): Promise<string> {
  const { reply } = await callApi<{ reply: string }>('/api/chat', { messages })
  return reply
}

// ── Lesson "Check Your Understanding" grading ──────────────────────────────
export type UnderstandingVerdict = 'correct' | 'partial' | 'incorrect'

export interface UnderstandingGrade {
  verdict: UnderstandingVerdict
  score_pct: number
  feedback: string
}

/**
 * Grade a student's answers to a lesson's Check Your Understanding items,
 * using the lesson's study guide material as the reference.
 * Returns one grade per item, in the same order.
 */
export async function gradeUnderstandingAnswers(
  lessonContext: string,
  items: { question: string; answer: string }[],
): Promise<UnderstandingGrade[]> {
  const { grades } = await callApi<{ grades: UnderstandingGrade[] }>('/api/grade-understanding', {
    lessonContext,
    items,
  })
  return grades
}

// ── Student problem generation ─────────────────────────────────────────────
export interface ProblemChoice {
  text: string
  is_correct: boolean
}

export interface GeneratedProblem {
  title: string
  description: string
  hint: string
  solution: string
  choices?: ProblemChoice[]
}

export async function generateStudentProblem(
  topic: string,
  difficulty: 'Easy' | 'Medium' | 'Hard',
  type: 'coding' | 'multiple_choice',
  /** Study guide text for the selected lessons (see src/lessons/lessonContext.ts) */
  lessonContext?: string
): Promise<GeneratedProblem> {
  return callApi<GeneratedProblem>('/api/generate-problem', { topic, difficulty, type, lessonContext })
}

// ── Flashcard generation ─────────────────────────────────────────────────────
export interface FlashCard {
  front: string
  back: string
}

/** Flashcard pairs for the Create Deck page, optionally grounded in study guide lessons */
export async function generateFlashcards(
  topic: string,
  count: number,
  lessonContext?: string
): Promise<FlashCard[]> {
  const { cards } = await callApi<{ cards: FlashCard[] }>('/api/generate-flashcards', { topic, count, lessonContext })
  return cards
}

// ── Quiz / assessment question generation ───────────────────────────────────
export interface QuizQuestion {
  question: string
  choices: [string, string, string, string]
  correct_index: 0 | 1 | 2 | 3
  explanation: string
}

export async function generateQuiz(
  module: string,
  numQuestions: number,
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed',
  assessmentType: 'Quiz' | 'Activity' | 'Exam',
  /** Study guide text for the selected lessons (see src/lessons/lessonContext.ts) */
  lessonContext?: string
): Promise<QuizQuestion[]> {
  const { questions } = await callApi<{ questions: QuizQuestion[] }>('/api/generate-quiz', {
    module, numQuestions, difficulty, assessmentType, lessonContext,
  })
  return questions
}

// ── Progress sentiment (teacher class overview + student performance) ──────
export async function getTeacherClassSentiment(params: {
  totalStudents: number
  avgScore: number | null
  topicSummary: string
}): Promise<string | null> {
  const { sentiment } = await callApi<{ sentiment: string | null }>('/api/teacher-sentiment', params)
  return sentiment
}

export async function getStudentPerformanceSentiment(params: {
  xp: number
  level: number
  streak: number
  completedModules: number
  totalModules: number
  totalDone: number
  totalAssessments: number
  scoreData: string
}): Promise<string | null> {
  const { sentiment } = await callApi<{ sentiment: string | null }>('/api/student-sentiment', params)
  return sentiment
}
