import { getCourseModule } from './course'
import { getLessonsForModule } from './index'
import type { ContentBlock, Exercise, Lesson } from './types'

/**
 * Plain-text version of the study guide lessons, for grounding AI prompts
 * (quiz generation) in what the class actually studies.
 */

const DEFAULT_CHAR_BUDGET = 16000

function blockToText(block: ContentBlock, maxCodeLines: number): string {
  switch (block.type) {
    case 'heading':   return `\n## ${block.text}`
    case 'paragraph': return block.text
    case 'note':      return `Note: ${block.text}`
    case 'list':      return block.items.map((item, i) => `${block.ordered ? `${i + 1}.` : '-'} ${item}`).join('\n')
    case 'table': {
      const rows = [block.headers, ...block.rows].map(r => r.join(' | '))
      return `${block.caption ? `${block.caption}:\n` : ''}${rows.join('\n')}`
    }
    case 'code': {
      if (maxCodeLines <= 0) return block.caption ? `(Code: ${block.caption})` : ''
      const lines = block.code.split('\n')
      const shown = lines.slice(0, maxCodeLines).join('\n')
      const more = lines.length > maxCodeLines ? `\n… (${lines.length - maxCodeLines} more lines)` : ''
      return `${block.caption ? `${block.caption}:\n` : ''}\`\`\`\n${shown}${more}\n\`\`\``
    }
  }
}

const exerciseToText = (ex: Exercise) =>
  typeof ex === 'string' ? ex : [ex.text, ex.code, ex.after].filter(Boolean).join('\n')

function lessonToText(lesson: Lesson, maxCodeLines: number): string {
  // Summary parts come first so that, if the text has to be trimmed, only the reading is shortened
  return [
    `# Lesson ${lesson.id.replace('l', '')}: ${lesson.title} (Study Guide ${lesson.source.guide}, pp. ${lesson.source.pages})`,
    `Learning outcomes:\n${lesson.unitOutcomes.map(o => `- ${o}`).join('\n')}`,
    `Key points:\n${lesson.keyPoints.map(k => `- ${k}`).join('\n')}`,
    lesson.complexityNote ? `Complexity: ${lesson.complexityNote}` : '',
    `Check Your Understanding:\n${lesson.exercises.map(e => `- ${exerciseToText(e)}`).join('\n')}`,
    `Study guide content:\n${lesson.reading.map(b => blockToText(b, maxCodeLines)).filter(Boolean).join('\n')}`,
  ].filter(Boolean).join('\n\n')
}

/**
 * Build the study guide text for a module (optionally only some of its lessons),
 * shrinking code samples and then trimming text until it fits the character budget.
 */
export function buildLessonContext(
  moduleOrder: number,
  lessonIds?: string[],
  charBudget = DEFAULT_CHAR_BUDGET,
): string {
  const mod = getCourseModule(moduleOrder)
  const lessons = getLessonsForModule(moduleOrder).filter(l => !lessonIds?.length || lessonIds.includes(l.id))
  const header = mod
    ? `MODULE ${mod.order}: ${mod.title}\nObjectives:\n${mod.objectives.map(o => `- ${o}`).join('\n')}`
    : ''

  for (const maxCodeLines of [40, 15, 0]) {
    const text = [header, ...lessons.map(l => lessonToText(l, maxCodeLines))].join('\n\n---\n\n')
    if (text.length <= charBudget) return text
  }

  // Still too long: give each lesson an equal share of the budget
  const share = Math.floor((charBudget - header.length) / Math.max(lessons.length, 1))
  return [header, ...lessons.map(l => {
    const t = lessonToText(l, 0)
    return t.length > share ? `${t.slice(0, share)}\n… (trimmed)` : t
  })].join('\n\n---\n\n')
}
