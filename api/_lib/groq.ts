import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const apiKey = process.env.GROQ_API_KEY
if (!apiKey) console.error('[api] Missing GROQ_API_KEY')

export const groq = new Groq({ apiKey })
export const MODEL = 'openai/gpt-oss-120b'

const supabaseUrl = process.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY as string

/** Strips markdown code fences and parses the model's JSON response. */
export function parseJson<T>(raw: string): T {
  return JSON.parse(raw.replace(/```json|```/g, '').trim()) as T
}

/**
 * Prompt block that restricts generation to the selected study guide lessons.
 * `items` names what is being generated, e.g. "question", "problem", "flashcard".
 */
export function lessonGrounding(lessonContext: string | undefined, items: string): string {
  if (!lessonContext) return ''
  return `
The class studies from the CC 104 study guide. Base EVERY ${items} only on the lesson material below:
- Use the definitions, terminology, notation, algorithms, code demonstrations and examples exactly as the material presents them.
- Do not use topics, techniques or language features that the material does not cover.
- Spread the ${items}s across the selected lessons instead of focusing on one section.
- When code is involved, use Java as in the material.
- Mention which lesson the answer comes from in the explanation or solution.

===== LESSON MATERIAL START =====
${lessonContext}
===== LESSON MATERIAL END =====
`
}

/**
 * Verifies the caller's Supabase session (Bearer token) and enforces a
 * per-user, per-feature rate limit via the check_ai_rate_limit RPC.
 * On failure, writes the error response itself and returns null — callers
 * should just `return` when they get null back.
 */
export async function authAndRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  feature: string,
  limit: number,
  windowSeconds: number,
): Promise<string | null> {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header' })
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user) {
    res.status(401).json({ error: 'Invalid or expired session' })
    return null
  }

  const { data: allowed, error: rpcErr } = await supabase.rpc('check_ai_rate_limit', {
    p_user_id: userData.user.id,
    p_feature: feature,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (rpcErr) {
    // Infra hiccup on the rate-limit table shouldn't take the feature down — fail open.
    console.error('[api] rate limit check failed', rpcErr)
    return userData.user.id
  }
  if (!allowed) {
    res.status(429).json({ error: 'Rate limit exceeded — please try again in a bit.' })
    return null
  }

  return userData.user.id
}
