import Groq from 'groq-sdk'

const apiKey = import.meta.env.VITE_GROQ_API_KEY

if (!apiKey) {
  console.warn('Missing VITE_GROQ_API_KEY in .env')
}

export const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true })

export const MODEL = 'llama-3.3-70b-versatile'

// ── DSA topics ─────────────────────────────────────────────────────────────
export const DSA_TOPICS = [
  'Arrays',
  'Linked Lists',
  'Stacks',
  'Queues',
  'Trees',
  'Graphs',
  'Sorting Algorithms',
  'Hashing',
]

// ── Chat system prompt ──────────────────────────────────────────────────────
export const CHATBOT_SYSTEM_PROMPT = `You are Algie, an expert DSA tutor for the Exentra learning platform at Pangasinan State University. You help IT students understand Data Structures and Algorithms (CC 104).

You ONLY answer questions related to these topics:
- Arrays (static arrays, dynamic arrays, multi-dimensional arrays, array operations)
- Linked Lists (singly, doubly, circular linked lists)
- Stacks (LIFO, push/pop, stack applications)
- Queues (FIFO, enqueue/dequeue, priority queues, deques)
- Trees (binary trees, BST, AVL, heaps, tree traversals)
- Graphs (directed/undirected, BFS, DFS, Dijkstra, topological sort)
- Sorting Algorithms (bubble, insertion, selection, merge, quick, heap sort)
- Hashing (hash tables, hash functions, collision resolution)

If a student asks about anything outside these topics, politely decline and redirect them to DSA topics.

---

STUDY VIDEO RECOMMENDATIONS:
When a student asks for a video, tutorial, resource, watch, or study material for any DSA topic, always recommend 2-3 relevant videos from the curated list below.

Format each video EXACTLY like this (this exact pattern is required so the UI can render it properly):
VIDEO_CARD::Title Here::Channel Name::https://www.youtube.com/watch?v=VIDEOID

Use ONLY links from this list. Do not fabricate or guess YouTube video IDs.

CURATED VIDEO LIST:

Arrays:
VIDEO_CARD::Arrays in Data Structures::freeCodeCamp::https://www.youtube.com/watch?v=QJNwK2uJyGs
VIDEO_CARD::Array Data Structure Explained::CS Dojo::https://www.youtube.com/watch?v=pmN9ExDf3yQ
VIDEO_CARD::Arrays Full Tutorial::Bro Code::https://www.youtube.com/watch?v=NptnmWvkbTw

Linked Lists:
VIDEO_CARD::Linked Lists in 4 Minutes::Michael Sambol::https://www.youtube.com/watch?v=F8AbOfQwl1c
VIDEO_CARD::Linked List Data Structure::freeCodeCamp::https://www.youtube.com/watch?v=Hj_rA0dhr2I
VIDEO_CARD::Linked Lists for Beginners::Bro Code::https://www.youtube.com/watch?v=N6dOwBde7-M

Stacks:
VIDEO_CARD::Stack Data Structure::CS Dojo::https://www.youtube.com/watch?v=XSdXSmwb550
VIDEO_CARD::Stacks in 3 Minutes::Michael Sambol::https://www.youtube.com/watch?v=KInG04mAjO0
VIDEO_CARD::Stack Data Structure Tutorial::Bro Code::https://www.youtube.com/watch?v=O1KeXo8lE8A

Queues:
VIDEO_CARD::Queue Data Structure::CS Dojo::https://www.youtube.com/watch?v=XSdXSmwb550
VIDEO_CARD::Queues in 3 Minutes::Michael Sambol::https://www.youtube.com/watch?v=D6gu-_tmEpQ
VIDEO_CARD::Queue Data Structure Tutorial::Bro Code::https://www.youtube.com/watch?v=nqXaPZi99JI

Trees:
VIDEO_CARD::Binary Trees Explained::freeCodeCamp::https://www.youtube.com/watch?v=fAAZixBzIAI
VIDEO_CARD::Binary Search Tree::CS Dojo::https://www.youtube.com/watch?v=hryHlKQalvk
VIDEO_CARD::Tree Traversals Inorder Preorder Postorder::Michael Sambol::https://www.youtube.com/watch?v=WLvU5EQVZqY

Graphs:
VIDEO_CARD::Graph Data Structure::freeCodeCamp::https://www.youtube.com/watch?v=tWVWeAqZ0WU
VIDEO_CARD::BFS and DFS Graph Traversal::Michael Sambol::https://www.youtube.com/watch?v=pcKY4hjDrxk
VIDEO_CARD::Dijkstra's Algorithm Explained::Spanning Tree::https://www.youtube.com/watch?v=pVfj6mxhdMw

Sorting Algorithms:
VIDEO_CARD::Sorting Algorithms Full Course::freeCodeCamp::https://www.youtube.com/watch?v=RfXt_qHDEPw
VIDEO_CARD::Merge Sort in 3 Minutes::Michael Sambol::https://www.youtube.com/watch?v=4VqmGXwpLqc
VIDEO_CARD::Quick Sort in 4 Minutes::Michael Sambol::https://www.youtube.com/watch?v=Hoixgm4-P4M

Hashing:
VIDEO_CARD::Hash Tables and Hash Functions::CS Dojo::https://www.youtube.com/watch?v=shs0KM3wKv8
VIDEO_CARD::Hashing Data Structure::freeCodeCamp::https://www.youtube.com/watch?v=KyUTuwz_b7Q
VIDEO_CARD::Hash Tables Explained::Spanning Tree::https://www.youtube.com/watch?v=jalSiaIi8j4

---

Be encouraging, clear, and use examples. When showing code, use proper formatting with code blocks. Keep responses concise but thorough.`

// ── Chat completion ─────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function chatWithGroq(messages: ChatMessage[]): Promise<string> {
  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: CHATBOT_SYSTEM_PROMPT },
      ...messages,
    ],
    max_tokens: 1024,
    temperature: 0.7,
  })
  return response.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.'
}

// ── Daily challenge generation ──────────────────────────────────────────────
export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export interface DailyChallenge {
  question: string
  topic: string
  difficulty: Difficulty
  xp_reward: number
  hint: string
  model_answer: string
}

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

export async function generateDailyChallenge(): Promise<DailyChallenge> {
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

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 512,
    temperature: 0.8,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean) as DailyChallenge
  return parsed
}

// ── Daily challenge grading ─────────────────────────────────────────────
export interface ChallengeGrade {
  is_correct: boolean
  score_pct: number
  feedback: string
}

export async function gradeDailyChallengeAnswer(
  question: string,
  modelAnswer: string,
  studentAnswer: string
): Promise<ChallengeGrade> {
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

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 512,
    temperature: 0.3,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(clean) as ChallengeGrade
    return {
      is_correct: !!parsed.is_correct,
      score_pct: Math.max(0, Math.min(100, Number(parsed.score_pct) || 0)),
      feedback: parsed.feedback || 'Your answer has been recorded.',
    }
  } catch {
    return { is_correct: false, score_pct: 0, feedback: 'Could not automatically grade this answer — it has been recorded for manual review.' }
  }
}

// ── Student problem generation ─────────────────────────────────────────────

export interface ProblemChoice {
  text: string
  is_correct: boolean
}

export interface GeneratedProblem {
  title: string
  description: string
  hint: string
  solution: string
  choices?: ProblemChoice[]
}

export async function generateStudentProblem(
  topic: string,
  difficulty: 'Easy' | 'Medium' | 'Hard',
  type: 'coding' | 'multiple_choice'
): Promise<GeneratedProblem> {
  const isMC = type === 'multiple_choice'

  const prompt = isMC
    ? `You are a DSA problem generator. Create ONE multiple-choice practice problem.

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
    : `You are a DSA problem generator. Create ONE coding practice problem.

Specs:
- Topic: ${topic}
- Difficulty: ${difficulty}
- Provide a clear problem statement with example input/output

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "title": "Short descriptive title",
  "description": "Full problem statement with example input and expected output",
  "hint": "A helpful hint about the approach or data structure to use",
  "solution": "A complete working solution with explanation (pseudocode or Java/Python)"
}`

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1024,
    temperature: 0.8,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean) as GeneratedProblem
}

// ── Flashcard deck generation ────────────────────────────────────────────────

export interface FlashCard {
  front: string
  back: string
}

export interface GeneratedDeck {
  title: string
  description: string
  cards: FlashCard[]
}

export async function generateFlashcardDeck(
  topic: string,
  cardCount: number = 8
): Promise<GeneratedDeck> {
  const prompt = `You are a DSA flashcard generator. Create a study deck of ${cardCount} flashcards for the topic "${topic}".

Each card:
- front: a term, concept, or question (concise, max 15 words)
- back: the definition, answer, or explanation (clear, max 60 words)

Cover a mix of: definitions, time/space complexities, use cases, key operations, and tricky distinctions.

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "title": "Deck title (e.g. '${topic} Flashcards')",
  "description": "One sentence describing what this deck covers",
  "cards": [
    { "front": "Term or question", "back": "Definition or answer" }
  ]
}`

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
    temperature: 0.75,
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean) as GeneratedDeck
}

export interface QuizQuestion {
  question: string
  choices: [string, string, string, string]
  correct_index: 0 | 1 | 2 | 3
  explanation: string
}

export async function generateQuiz(
  module: string,
  numQuestions: 5 | 10 | 15,
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed',
  assessmentType: 'Quiz' | 'Activity' | 'Exam'
): Promise<QuizQuestion[]> {
  const prompt = `You are a DSA assessment generator. Generate exactly ${numQuestions} multiple-choice questions for a ${assessmentType}.

Specs:
- Topic: ${module}
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

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4096,
    temperature: 0.7,
  })

  const raw = response.choices[0]?.message?.content ?? '[]'
  const clean = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean) as QuizQuestion[]
  return parsed
}
