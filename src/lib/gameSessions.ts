import { supabase } from './supabase'

export type GameId = 'array_blitz' | 'node_connect' | 'stack_tower'
export type GameMode = 'solo' | 'multiplayer'

export interface GameSessionInput {
  gameId: GameId
  mode: GameMode
  difficulty: string
  score: number
  correct: number
  totalRounds: number
  bestCombo?: number
  rankLetter?: string
  badges?: string[]
  meta?: Record<string, unknown>
}

export interface GameSessionRecord extends GameSessionInput {
  id: string
  student_id: string
  xp_earned: number
  played_at: string
}

// XP is intentionally decoupled from each game's raw arcade `score`. Score still
// drives that game's own combo bar / results screen / in-game leaderboard — it's
// tuned per-game for how that game feels (combo multipliers, speed bonuses, boss
// rounds, mission rewards) and was never meant to be walked 1:1 into profile XP.
// A straight passthrough let Node Connect (whose base score scales with pointer-
// task count, uncapped) pay out 2x+ more than Stack Tower (no mission bonus, no
// boss round) for an equally hard run. XP instead comes from a flat per-round
// value by difficulty, so a solved round is worth the same XP no matter which
// game it came from.
const XP_PER_ROUND: Record<string, number> = { easy: 12, medium: 18, hard: 25, expert: 35 }
const XP_CLEAR_BONUS: Record<string, number> = { easy: 20, medium: 30, hard: 40, expert: 60 }

function computeXp(input: GameSessionInput): number {
  const perRound = XP_PER_ROUND[input.difficulty] ?? 15
  const clearBonus = XP_CLEAR_BONUS[input.difficulty] ?? 25
  const clearedAll = input.totalRounds > 0 && input.correct >= input.totalRounds
  return Math.max(0, input.correct) * perRound + (clearedAll ? clearBonus : 0)
}

// ── Save a completed game run and award XP to the student's profile ────────
// Mirrors the pattern in dailyChallenge.ts: insert an attempt-style record,
// then bump profiles.xp/level.
export async function saveGameSession(
  studentId: string,
  input: GameSessionInput
): Promise<GameSessionRecord | null> {
  const xp = computeXp(input)

  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      student_id: studentId,
      game_id: input.gameId,
      mode: input.mode,
      difficulty: input.difficulty,
      score: input.score,
      correct: input.correct,
      total_rounds: input.totalRounds,
      best_combo: input.bestCombo ?? 0,
      rank_letter: input.rankLetter ?? null,
      badges: input.badges ?? [],
      meta: input.meta ?? {},
      xp_earned: xp,
      played_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error(`Failed to save ${input.gameId} session:`, error)
    return null
  }

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

  return data as GameSessionRecord
}
