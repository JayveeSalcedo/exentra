import { useState } from 'react'
import {
  BUCKET_SIZE, GUIDE_KEYS, HASH_CODE, emptyTable, hashInsertSteps, hashSequenceSteps,
  type HashMode, type HashStep,
} from './algorithms/hash'
import { useStepper } from './stepper/useStepper'
import StepControls from './stepper/StepControls'
import ModeTabs from './stepper/ModeTabs'

interface Props { lessonId: string }

export default function HashVisualizer({ lessonId }: Props) {
  // Collision resolution lesson starts on double hashing, the others on chaining
  const [mode, setMode] = useState<HashMode>(lessonId === 'l7-3' ? 'double' : 'chaining')
  const [table, setTable] = useState<number[][]>(emptyTable)
  const [key, setKey] = useState('')
  const stepper = useStepper<HashStep>([], 700)
  const step = stepper.step
  const shown = step?.table ?? table
  const probes = new Set(step?.probes ?? [])

  const changeMode = (m: HashMode) => {
    setMode(m)
    setTable(emptyTable())
    stepper.load([], false)
  }

  const insertKey = () => {
    const k = parseInt(key)
    if (isNaN(k) || k < 0) return
    const r = hashInsertSteps(table, k, mode)
    setTable(r.table)
    stepper.load(r.steps)
    setKey('')
  }

  const runGuideKeys = () => {
    const r = hashSequenceSteps(GUIDE_KEYS, mode)
    setTable(r.table)
    stepper.load(r.steps)
  }

  const clear = () => {
    setTable(emptyTable())
    stepper.load([], false)
  }

  return (
    <div className="viz-hash-root">
      <ModeTabs<HashMode>
        value={mode}
        onChange={changeMode}
        modes={[
          { key: 'chaining', label: 'Chaining' },
          { key: 'linear', label: 'Linear probing' },
          { key: 'double', label: 'Double hashing' },
        ]}
      />

      <div className="viz-hs-formula">
        {step?.key != null ? `key ${step.key}: ${step.formula || (step.placed !== null ? `stored at ${step.placed}` : '')}` : 'h(k) = k mod 13'}
      </div>

      <div className="viz-hs-table">
        {shown.map((bucket, addr) => {
          const isPlaced = step?.placed === addr
          const isProbe = probes.has(addr) && !isPlaced
          const slots = mode === 'chaining' ? bucket : [...bucket, ...Array(Math.max(BUCKET_SIZE - bucket.length, 0)).fill(null)]
          return (
            <div key={addr} className={`viz-hs-row ${isPlaced ? 'placed' : isProbe ? 'probe' : ''}`}>
              <span className="viz-hs-addr">{addr}</span>
              <div className="viz-hs-slots">
                {mode === 'chaining' && bucket.length === 0 && <span className="viz-hs-slot empty">∅</span>}
                {slots.map((v, i) => (
                  <span key={i} style={{ display: 'contents' }}>
                    {mode === 'chaining' && i > 0 && <span className="viz-hs-link">→</span>}
                    <span className={`viz-hs-slot ${v === null ? 'empty' : ''} ${isPlaced && v === step?.key ? 'new' : ''}`}>
                      {v ?? '—'}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="viz-controls">
        <label className="viz-field">
          key
          <input className="viz-input narrow" value={key} maxLength={5} onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && insertKey()} />
        </label>
        <button className="viz-btn" onClick={insertKey} disabled={stepper.playing}>Insert</button>
        <button className="viz-btn" onClick={runGuideKeys} disabled={stepper.playing}>Study guide keys</button>
        <button className="viz-btn ghost" onClick={clear}>Clear</button>
      </div>

      <div className="viz-legend">
        <span className="viz-legend-item">13 addresses</span>
        {mode !== 'chaining' && <span className="viz-legend-item">Buckets hold {BUCKET_SIZE} keys</span>}
        {mode === 'double' && <span className="viz-legend-item">h2(k) = k mod 11</span>}
        <span className="viz-legend-item"><span className="viz-legend-dot warn" />Probed</span>
        <span className="viz-legend-item"><span className="viz-legend-dot accent" />Stored</span>
      </div>

      <StepControls stepper={stepper} caption={step?.caption} code={HASH_CODE[mode]} activeLine={step?.line ?? null} />
    </div>
  )
}
