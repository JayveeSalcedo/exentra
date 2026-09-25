import type { VercelRequest, VercelResponse } from '@vercel/node'
import { groq, MODEL, parseJson, authAndRateLimit } from './_lib/groq'

type Difficulty = 'Easy' | 'Medium' | 'Hard'

interface DailyChallenge {
  question: string
  topic: string
  difficulty: Difficulty
  xp_reward: number
  hint: string
  model_answer: string
}

const DSA_TOPICS = [
  'Arrays', 'Linked Lists', 'Stacks', 'Queues',
  'Trees', 'Graphs', 'Sorting Algorithms', 'Hashing',
]

function getDifficultyForToday(): Difficulty {
  const day = new Date().getDay()
  if (day === 0 || day === 1 || day === 4) return 'Easy'
  if (day === 2 || day === 5) return 'Medium'
  return 'Hard'
}

function getTopicForToday(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  return DSA_TOPICS[dayOfYear % DSA_TOPICS.length]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await authAndRateLimit(req, res, 'daily-challenge', 10, 600)
  if (!userId) return

  const difficulty = getDifficultyForToday()
  const topic = getTopicForToday()
  const xpMap: Record<Difficulty, number> = { Easy: 50, Medium: 120, Hard: 200 }

  const prompt = `Generate a single DSA coding/conceptual challenge with these specs:
- Topic: ${topic}
- Difficulty: ${difficulty}
- Type: A clear, specific question (can be conceptual or require pseudocode/code)

Respond ONLY with valid JSON matching this exact format (no markdown, no extra text):
{
  "question": "The full challenge question here",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "xp_reward": ${xpMap[difficulty]},
  "hint": "A helpful hint without giving away the answer",
  "model_answer": "The complete correct answer/solution, explained clearly, that a grader will use as the reference answer"
}`

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1536,
      temperature: 0.8,
      reasoning_effort: 'low',
      reasoning_format: 'hidden',
      response_format: { type: 'json_object' },
    } as any)

    const raw = response.choices[0]?.message?.content ?? '{}'
    const challenge = parseJson<DailyChallenge>(raw)
    res.status(200).json(challenge)
  } catch (e) {
    console.error('[api/daily-challenge]', e)
    res.status(502).json({ error: 'Could not generate today\'s challenge.' })
  }
}
