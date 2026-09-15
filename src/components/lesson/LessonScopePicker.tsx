import { BookOpen, ChevronDown } from 'lucide-react'
import { COURSE_MODULES } from '../../lessons/course'
import type { LessonScope } from '../../lessons/useLessonScope'
import './LessonScopePicker.css'

interface Props {
  scope: LessonScope
  /** Explains what the selection is used for, shown under the lesson list */
  hint?: string
}

/** Study guide module dropdown plus lesson checkboxes, used to scope AI generation */
export default function LessonScopePicker({ scope, hint }: Props) {
  const { moduleOrder, moduleLessons, selectedLessons } = scope

  return (
    <div className="lsp-root">
      <div className="lsp-field">
        <label className="lsp-label" htmlFor="lsp-module">Study Guide Module</label>
        <div className="lsp-select-wrap">
          <select
            id="lsp-module"
            className="lsp-select"
            value={moduleOrder}
            onChange={e => scope.setModuleOrder(Number(e.target.value))}
          >
            {COURSE_MODULES.map(m => (
              <option key={m.order} value={m.order}>Module {m.order} – {m.title}</option>
            ))}
          </select>
          <ChevronDown size={14} className="lsp-select-arrow" />
        </div>
      </div>

      <div className="lsp-field">
        <span className="lsp-label"><BookOpen size={10} /> Lessons to cover</span>
        <div className="lsp-lesson-list">
          <label className={`lsp-lesson-option ${selectedLessons.length === 0 ? 'active' : ''}`}>
            <input type="checkbox" checked={selectedLessons.length === 0} onChange={scope.selectAllLessons} />
            <span>All lessons in this module</span>
          </label>
          {moduleLessons.map(l => (
            <label key={l.id} className={`lsp-lesson-option ${selectedLessons.includes(l.id) ? 'active' : ''}`}>
              <input type="checkbox" checked={selectedLessons.includes(l.id)} onChange={() => scope.toggleLesson(l.id)} />
              <span>{l.title}</span>
              <em>pp. {l.source.pages}</em>
            </label>
          ))}
        </div>
        {hint && <p className="lsp-hint">{hint}</p>}
      </div>
    </div>
  )
}
