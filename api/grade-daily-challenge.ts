import type { VercelRequest, VercelResponse } from '@vercel/node'
import { groq, MODEL, parseJson, authAndRateLimit } from './_lib/groq'

interface ChallengeGrade {
  is_correct: boolean
  score_pct: number
  feedback: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await authAndRateLimit(req, res, 'grade-daily-challenge', 10, 600)
  if (!userId) return

  const { question, modelAnswer, studentAnswer } = (req.body ?? {}) as {
    question?: string
    modelAnswer?: string
    studentAnswer?: string
  }
  if (!question || !modelAnswer || studentAnswer == null) {
    return res.status(400).json({ error: 'question, modelAnswer and studentAnswer are required' })
  }

  const prompt = `You are grading a student's answer to a DSA (Data Structures and Algorithms) challenge.

Question: ${question}

Reference/model answer: ${modelAnswer}

Student's answer: ${studentAnswer}

Grade the student's answer against the reference answer. Be reasonably lenient about wording and code style — focus on whether the core concept, logic, or algorithm is correct. Partial credit is allowed for answers that are on the right track but incomplete or have minor mistakes.

If the answer is wrong or incomplete, identify the SPECIFIC mistake the student made (e.g. "you used FIFO order but a stack requires LIFO", "your time complexity is off — you said O(n) but traversing a balanced BST is O(log n)") and briefly explain the correction. Address the student directly as "you". Keep feedback to 2-3 sentences.

If the answer is fully correct, give a short encouraging confirmation (1-2 sentences) that reinforces why it's correct.

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "is_correct": true or false,
  "score_pct": 0-100,
  "feedback": "Personalized feedback addressing the student's specific answer"
}`

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.3,
      reasoning_effort: 'low',
      reasoning_format: 'hidden',
      response_format: { type: 'json_object' },
    } as any)

    const raw = response.choices[0]?.message?.content ?? '{}'
    try {
      const parsed = parseJson<Partial<ChallengeGrade>>(raw)
      res.status(200).json({
        is_correct: !!parsed.is_correct,
        score_pct: Math.max(0, Math.min(100, Number(parsed.score_pct) || 0)),
        feedback: parsed.feedback || 'Your answer has been recorded.',
      })
    } catch {
      res.status(200).json({ is_correct: false, score_pct: 0, feedback: 'Could not automatically grade this answer — it has been recorded for manual review.' })
    }
  } catch (e) {
    console.error('[api/grade-daily-challenge]', e)
    res.status(502).json({ error: 'Grading failed. Please try again.' })
  }
}
