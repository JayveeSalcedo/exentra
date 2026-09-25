import type { VercelRequest, VercelResponse } from '@vercel/node'
import { groq, MODEL, lessonGrounding, authAndRateLimit } from './_lib/groq'

interface FlashCard { front: string; back: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await authAndRateLimit(req, res, 'generate-flashcards', 10, 600)
  if (!userId) return

  const { topic, count, lessonContext } = (req.body ?? {}) as {
    topic?: string
    count?: number
    lessonContext?: string
  }
  if (!topic || !count || count < 1) {
    return res.status(400).json({ error: 'topic and a positive count are required' })
  }

  const prompt = `You are a DSA flashcard generator for CC 104. Generate exactly ${count} flashcard pairs about: "${topic}".
${lessonGrounding(lessonContext, 'flashcard')}
Each item must have "front" (term/question, max 12 words) and "back" (definition/answer, max 40 words).
Respond ONLY with valid JSON, no markdown, no preamble:
{ "cards": [ { "front": "What is a stack?", "back": "A LIFO data structure where elements are pushed and popped from the same end." } ] }`

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: Math.min(16000, 1500 + count * 150),
      temperature: 0.6,
      reasoning_effort: 'low',
      reasoning_format: 'hidden',
      response_format: { type: 'json_object' },
    } as any)

    const raw = response.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as FlashCard[] | Record<string, unknown>
    const list = Array.isArray(parsed)
      ? parsed
      : (Object.values(parsed).find(Array.isArray) as FlashCard[] | undefined) ?? []
    const cards = list.slice(0, count).map(c => ({ front: String(c.front ?? ''), back: String(c.back ?? '') }))

    res.status(200).json({ cards })
  } catch (e) {
    console.error('[api/generate-flashcards]', e)
    res.status(502).json({ error: 'Flashcard generation failed. Please try again.' })
  }
}
