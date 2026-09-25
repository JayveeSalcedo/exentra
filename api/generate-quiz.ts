import type { VercelRequest, VercelResponse } from '@vercel/node'
import { groq, MODEL, lessonGrounding, authAndRateLimit } from './_lib/groq'

interface QuizQuestion {
  question: string
  choices: [string, string, string, string]
  correct_index: 0 | 1 | 2 | 3
  explanation: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await authAndRateLimit(req, res, 'generate-quiz', 10, 1800)
  if (!userId) return

  const { module: moduleTopic, numQuestions, difficulty, assessmentType, lessonContext } = (req.body ?? {}) as {
    module?: string
    numQuestions?: number
    difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Mixed'
    assessmentType?: 'Quiz' | 'Activity' | 'Exam'
    lessonContext?: string
  }
  if (!moduleTopic || !numQuestions || numQuestions < 1 || !difficulty || !assessmentType) {
    return res.status(400).json({ error: 'module, numQuestions, difficulty and assessmentType are required' })
  }

  const grounding = lessonGrounding(lessonContext, 'question')

  const prompt = `You are a DSA assessment generator for CC 104 (Data Structures and Algorithms). Generate exactly ${numQuestions} multiple-choice questions for a ${assessmentType}.
${grounding}
Specs:
- Topic: ${moduleTopic}
- Difficulty: ${difficulty}
- Each question must have exactly 4 choices labeled A, B, C, D
- Include one correct answer per question
- Provide a brief explanation for the correct answer

Respond ONLY with a valid JSON array, no markdown, no preamble:
[
  {
    "question": "Question text here?",
    "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
    "correct_index": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

Generate exactly ${numQuestions} questions. The correct_index must be 0, 1, 2, or 3.`

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      // Roughly 350 tokens per question plus room for reasoning
      max_tokens: Math.min(32000, 2000 + numQuestions * 350),
      temperature: 0.7,
      reasoning_effort: 'low',
      reasoning_format: 'hidden',
      response_format: { type: 'json_object' },
    } as any)

    const raw = response.choices[0]?.message?.content ?? '[]'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as QuizQuestion[] | Record<string, unknown>
    // JSON mode may wrap the array in an object, e.g. { "questions": [...] }
    const list = Array.isArray(parsed)
      ? parsed
      : (Object.values(parsed).find(Array.isArray) as QuizQuestion[] | undefined) ?? []

    res.status(200).json({ questions: list.slice(0, numQuestions) })
  } catch (e) {
    console.error('[api/generate-quiz]', e)
    res.status(502).json({ error: 'Quiz generation failed. Please try again.' })
  }
}
