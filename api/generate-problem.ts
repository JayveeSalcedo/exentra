import type { VercelRequest, VercelResponse } from '@vercel/node'
import { groq, MODEL, parseJson, lessonGrounding, authAndRateLimit } from './_lib/groq'

interface ProblemChoice { text: string; is_correct: boolean }
interface GeneratedProblem {
  title: string
  description: string
  hint: string
  solution: string
  choices?: ProblemChoice[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await authAndRateLimit(req, res, 'generate-problem', 15, 600)
  if (!userId) return

  const { topic, difficulty, type, lessonContext } = (req.body ?? {}) as {
    topic?: string
    difficulty?: 'Easy' | 'Medium' | 'Hard'
    type?: 'coding' | 'multiple_choice'
    lessonContext?: string
  }
  if (!topic || !difficulty || !type) {
    return res.status(400).json({ error: 'topic, difficulty and type are required' })
  }

  const isMC = type === 'multiple_choice'
  const grounding = lessonGrounding(lessonContext, 'problem')

  const prompt = isMC
    ? `You are a DSA problem generator for CC 104. Create ONE multiple-choice practice problem.
${grounding}
Specs:
- Topic: ${topic}
- Difficulty: ${difficulty}
- Exactly 4 choices, one correct

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "title": "Short descriptive title",
  "description": "Full question text here?",
  "hint": "A helpful hint that doesn't give away the answer",
  "solution": "Explanation of the correct answer and why the others are wrong",
  "choices": [
    { "text": "Choice A text", "is_correct": false },
    { "text": "Choice B text", "is_correct": true },
    { "text": "Choice C text", "is_correct": false },
    { "text": "Choice D text", "is_correct": false }
  ]
}`
    : `You are a DSA problem generator for CC 104. Create ONE coding practice problem.
${grounding}
Specs:
- Topic: ${topic}
- Difficulty: ${difficulty}
- Provide a clear problem statement with example input/output

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "title": "Short descriptive title",
  "description": "Full problem statement with example input and expected output",
  "hint": "A helpful hint about the approach or data structure to use",
  "solution": "A complete working solution with explanation (${lessonContext ? 'in Java' : 'pseudocode or Java/Python'})"
}`

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3072,
      temperature: 0.8,
      reasoning_effort: 'low',
      reasoning_format: 'hidden',
      response_format: { type: 'json_object' },
    } as any)

    const raw = response.choices[0]?.message?.content ?? '{}'
    const problem = parseJson<GeneratedProblem>(raw)
    res.status(200).json(problem)
  } catch (e) {
    console.error('[api/generate-problem]', e)
    res.status(502).json({ error: 'Problem generation failed. Please try again.' })
  }
}
