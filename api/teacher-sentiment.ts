import type { VercelRequest, VercelResponse } from '@vercel/node'
import { groq, MODEL, authAndRateLimit } from './_lib/groq'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await authAndRateLimit(req, res, 'teacher-sentiment', 10, 600)
  if (!userId) return

  const { totalStudents, avgScore, topicSummary } = (req.body ?? {}) as {
    totalStudents?: number
    avgScore?: number | null
    topicSummary?: string
  }
  if (totalStudents == null || !topicSummary) {
    return res.status(400).json({ error: 'totalStudents and topicSummary are required' })
  }

  const prompt = `You are an educational analyst reviewing a class's Data Structures and Algorithms performance.

Class overview:
- Total students: ${totalStudents}
- Class average score: ${avgScore != null ? `${avgScore}%` : 'no data yet'}
- Topic performance:
${topicSummary}

Write a concise class-wide sentiment analysis (3-5 sentences) for the teacher.
Identify the weakest topics (avg < 60%), highlight strong areas (avg > 80%), and give 1-2 actionable teaching recommendations.
Write in a professional but approachable tone. No bullet points — flowing prose only.`

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 250,
      temperature: 0.7,
    })
    res.status(200).json({ sentiment: response.choices[0]?.message?.content ?? null })
  } catch (e) {
    console.error('[api/teacher-sentiment]', e)
    res.status(502).json({ error: 'Could not generate analysis. Please try again.' })
  }
}
