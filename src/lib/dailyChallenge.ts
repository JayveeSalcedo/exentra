import { supabase } from './supabase'
import { generateDailyChallenge, gradeDailyChallengeAnswer, type DailyChallenge } from './groq'

export interface DailyChallengeRecord extends DailyChallenge {
  id: string
  date: string
  created_at: string
}

export interface ChallengeAttempt {
  id: string
  student_id: string
  challenge_id: string
  answer: string
  is_correct: boolean | null
  score_pct: number | null
  ai_feedback: string | null
  xp_earned: number
  submitted_at: string
}

// ── Get today's date string YYYY-MM-DD ─────────────────────────────────────
export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// ── Fetch or generate today's challenge ────────────────────────────────────
export async function getTodayChallenge(): Promise<DailyChallengeRecord | null> {
  const today = todayStr()

  // Check if today's challenge already exists in Supabase
  const { data: existing, error } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('date', today)
    .single()

  if (existing && !error) {
    return existing as DailyChallengeRecord
  }

  // Generate new challenge via Groq
  try {
    const challenge = await generateDailyChallenge()

    const { data: inserted, error: insertError } = await supabase
      .from('daily_challenges')
      .insert({
        date: today,
        question: challenge.question,
        topic: challenge.topic,
        difficulty: challenge.difficulty,
        xp_reward: challenge.xp_reward,
        hint: challenge.hint,
        model_answer: challenge.model_answer,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to save daily challenge:', insertError)
      // Return unsaved challenge so UI still works
      return { ...challenge, id: 'temp', date: today, created_at: new Date().toISOString() }
    }

    return inserted as DailyChallengeRecord
  } catch (err) {
    console.error('Failed to generate daily challenge:', err)
    return null
  }
}

// ── Check if student already attempted today's challenge ───────────────────
export async function getTodayAttempt(
  studentId: string,
  challengeId: string
): Promise<ChallengeAttempt | null> {
  const { data } = await supabase
    .from('challenge_attempts')
    .select('*')
    .eq('student_id', studentId)
    .eq('challenge_id', challengeId)
    .single()

  return data ?? null
}

// ── Submit an attempt (AI-graded) ────────────────────────────────────────────
export async function submitChallengeAttempt(
  studentId: string,
  challengeId: string,
  answer: string,
  question: string,
  modelAnswer: string,
  xpReward: number
): Promise<ChallengeAttempt | null> {
  // Grade against the model answer via Groq
  let grade = { is_correct: false, score_pct: 0, feedback: 'Your answer has been recorded.' }
  try {
    grade = await gradeDailyChallengeAnswer(question, modelAnswer, answer)
  } catch (err) {
    console.error('Failed to grade challenge attempt:', err)
  }

  // XP tiers mirror assessment grading (100/75/50/25% of reward)
  const xp =
    grade.score_pct >= 90 ? xpReward :
    grade.score_pct >= 75 ? Math.round(xpReward * 0.75) :
    grade.score_pct >= 50 ? Math.round(xpReward * 0.5) :
    grade.score_pct > 0  ? Math.round(xpReward * 0.25) : 0

  const { data, error } = await supabase
    .from('challenge_attempts')
    .insert({
      student_id: studentId,
      challenge_id: challengeId,
      answer,
      is_correct: grade.is_correct,
      score_pct: grade.score_pct,
      ai_feedback: grade.feedback,
      xp_earned: xp,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to submit attempt:', error)
    return null
  }

  // Award XP to the student's profile
  if (xp > 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, level')
      .eq('id', studentId)
      .single()
    if (profile) {
      const newXp = (profile.xp ?? 0) + xp
      const newLevel = Math.floor(newXp / 1000) + 1
      await supabase
        .from('profiles')
        .update({ xp: newXp, level: newLevel, last_active: new Date().toISOString() })
        .eq('id', studentId)
    }
  }

  return data as ChallengeAttempt
}
