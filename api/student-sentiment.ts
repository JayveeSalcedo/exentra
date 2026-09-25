import type { VercelRequest, VercelResponse } from '@vercel/node'
import { groq, MODEL, authAndRateLimit } from './_lib/groq'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await authAndRateLimit(req, res, 'student-sentiment', 10, 600)
  if (!userId) return

  const { xp, level, streak, completedModules, totalModules, totalDone, totalAssessments, scoreData } =
    (req.body ?? {}) as {
      xp?: number
      level?: number
      streak?: number
      completedModules?: number
      totalModules?: number
      totalDone?: number
      totalAssessments?: number
      scoreData?: string
    }
  if (!scoreData) {
    return res.status(400).json({ error: 'scoreData is required' })
  }

  const prompt = `You are an educational psychologist analyzing a student's DSA (Data Structures and Algorithms) performance.

Student profile:
- XP: ${xp ?? 0} | Level: ${level ?? 1} | Streak: ${streak ?? 0} days
- Modules completed: ${completedModules ?? 0} / ${totalModules ?? 0}
- Assessments done: ${totalDone ?? 0} / ${totalAssessments ?? 0}
- Scores by topic:
${scoreData}

Write a short, warm, personalized performance sentiment (3-4 sentences).
Mention specific weak topics if score < 60%, strong topics if > 80%.
Be encouraging but honest. Use a motivational coaching tone.
Do NOT use bullet points. Just flowing, friendly prose.`

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.75,
    })
    res.status(200).json({ sentiment: response.choices[0]?.message?.content ?? null })
  } catch (e) {
    console.error('[api/student-sentiment]', e)
    res.status(502).json({ error: 'Could not generate analysis. Please try again.' })
  }
}
