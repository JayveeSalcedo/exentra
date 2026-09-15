import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import type { Stepper } from './useStepper'

const SPEEDS = [
  { label: '0.5×', ms: 1600 },
  { label: '1×',   ms: 900 },
  { label: '2×',   ms: 450 },
]

interface Props<T> {
  stepper: Stepper<T>
  caption?: string
  /** Code lines of the algorithm being played; `activeLine` is highlighted */
  code?: string[]
  activeLine?: number | null
}

/** Step-by-step playback controls with a caption and optional code panel */
export default function StepControls<T>({ stepper, caption, code, activeLine }: Props<T>) {
  const { index, steps, playing, atStart, atEnd } = stepper
  const hasSteps = steps.length > 0

  return (
    <div className="viz-step">
      {code && code.length > 0 && (
        <pre className="viz-step-code">
          {code.map((line, i) => (
            <div key={i} className={`viz-step-code-line ${activeLine === i ? 'active' : ''}`}>
              <span className="viz-step-code-num">{i + 1}</span>
              <span>{line || ' '}</span>
            </div>
          ))}
        </pre>
      )}

      <div className="viz-step-caption" aria-live="polite">
        {hasSteps ? caption : 'Choose an operation to see it step by step.'}
      </div>

      <div className="viz-step-bar">
        <button className="viz-icon-btn" onClick={stepper.reset} disabled={!hasSteps || atStart} title="Back to first step">
          <RotateCcw size={13} />
        </button>
        <button className="viz-icon-btn" onClick={stepper.prev} disabled={!hasSteps || atStart} title="Previous step">
          <ChevronLeft size={15} />
        </button>
        <button className="viz-icon-btn primary" onClick={stepper.toggle} disabled={steps.length < 2} title={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button className="viz-icon-btn" onClick={stepper.next} disabled={!hasSteps || atEnd} title="Next step">
          <ChevronRight size={15} />
        </button>
        <span className="viz-step-count">{hasSteps ? `${index + 1} / ${steps.length}` : '—'}</span>
        <div className="viz-speed">
          {SPEEDS.map(s => (
            <button
              key={s.ms}
              className={`viz-speed-btn ${stepper.speed === s.ms ? 'active' : ''}`}
              onClick={() => stepper.setSpeed(s.ms)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
