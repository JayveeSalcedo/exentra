import { useState } from 'react'
import type { VisualizerType } from '../../lessons/types'
import {
  newNode, singlyInsertSteps, singlyDeleteSteps,
  doublyInsertFirstSteps, doublyInsertLastSteps, doublyDeleteFirstSteps, doublyBackwardSteps,
  SINGLY_INSERT_CODE, SINGLY_DELETE_CODE,
  DOUBLY_INSERT_FIRST_CODE, DOUBLY_INSERT_LAST_CODE, DOUBLY_DELETE_FIRST_CODE, DOUBLY_BACKWARD_CODE,
  type DLLStep, type LLNode,
} from './algorithms/linkedList'
import { useStepper } from './stepper/useStepper'
import StepControls from './stepper/StepControls'
import ModeTabs from './stepper/ModeTabs'

interface Props { type: VisualizerType; lessonId: string }

type SinglyMode = 'insert' | 'delete'
type DoublyMode = 'insertFirst' | 'insertLast' | 'deleteFirst' | 'backward'

const START = ['10', '20', '30']

export default function LinkedListVisualizer({ type }: Props) {
  const isDoubly = type === 'doubly-linked-list'
  const [list, setList] = useState<LLNode[]>(() => START.map(newNode))
  const [value, setValue] = useState('25')
  const [pos, setPos] = useState('2')
  const [singlyMode, setSinglyMode] = useState<SinglyMode>('insert')
  const [doublyMode, setDoublyMode] = useState<DoublyMode>('insertFirst')
  const [code, setCode] = useState<string[]>(isDoubly ? DOUBLY_INSERT_FIRST_CODE : SINGLY_INSERT_CODE)
  const stepper = useStepper<DLLStep>()
  const step = stepper.step

  const run = () => {
    const v = value.trim() || '?'
    const p = parseInt(pos)
    let steps: DLLStep[]
    if (isDoubly) {
      steps = doublyMode === 'insertFirst' ? doublyInsertFirstSteps(list, v)
        : doublyMode === 'insertLast' ? doublyInsertLastSteps(list, v)
        : doublyMode === 'deleteFirst' ? doublyDeleteFirstSteps(list)
        : doublyBackwardSteps(list)
      setCode(doublyMode === 'insertFirst' ? DOUBLY_INSERT_FIRST_CODE
        : doublyMode === 'insertLast' ? DOUBLY_INSERT_LAST_CODE
        : doublyMode === 'deleteFirst' ? DOUBLY_DELETE_FIRST_CODE
        : DOUBLY_BACKWARD_CODE)
    } else {
      steps = singlyMode === 'insert'
        ? singlyInsertSteps(list, v, isNaN(p) ? list.length : p)
        : singlyDeleteSteps(list, isNaN(p) ? 1 : p)
      setCode(singlyMode === 'insert' ? SINGLY_INSERT_CODE : SINGLY_DELETE_CODE)
    }
    setList(steps[steps.length - 1].nodes)
    stepper.load(steps)
  }

  const resetList = () => {
    setList(START.map(newNode))
    stepper.load([], false)
  }

  // Before any operation, show the current list
  const nodes = step?.nodes ?? list
  const pointers = step?.pointers ?? (nodes.length ? { list: 0 } : {})
  const buttonLabel = isDoubly
    ? { insertFirst: 'Insert first', insertLast: 'Insert last', deleteFirst: 'Delete first', backward: 'Print backward' }[doublyMode]
    : singlyMode === 'insert' ? 'Insert' : 'Delete'

  return (
    <div className="viz-ll-root">
      {isDoubly ? (
        <ModeTabs<DoublyMode>
          value={doublyMode}
          onChange={setDoublyMode}
          modes={[
            { key: 'insertFirst', label: 'Insert first' },
            { key: 'insertLast', label: 'Insert last' },
            { key: 'deleteFirst', label: 'Delete first' },
            { key: 'backward', label: 'Display backward' },
          ]}
        />
      ) : (
        <ModeTabs<SinglyMode>
          value={singlyMode}
          onChange={setSinglyMode}
          modes={[
            { key: 'insert', label: 'Insert at position' },
            { key: 'delete', label: 'Delete at position' },
          ]}
        />
      )}

      <div className="viz-lls-stage">
        <div className="viz-lls-floating">
          {step?.floating && (
            <>
              <span className="viz-lls-ptr">{step.floating.label}</span>
              <div className="viz-lls-node fresh">
                {isDoubly && <span className="viz-lls-cell link prev">prev</span>}
                <span className="viz-lls-cell">{step.floating.node.val}</span>
                <span className="viz-lls-cell link">{isDoubly ? 'next' : 'link'}</span>
              </div>
              <span>→ {step.floating.linkTo === null ? 'null' : nodes[step.floating.linkTo]?.val}</span>
            </>
          )}
        </div>

        <div className="viz-lls-row">
          {nodes.length === 0 && <span className="viz-empty-label">list → null (empty)</span>}
          {nodes.map((node, i) => {
            const labels = Object.entries(pointers).filter(([, idx]) => idx === i).map(([name]) => name)
            const cls = [
              'viz-lls-node',
              step?.highlight.includes(i) ? 'hl' : '',
              step?.removing === i ? 'removing' : '',
            ].join(' ')
            return (
              <div key={node.id} className="viz-lls-item">
                <div className="viz-lls-col">
                  <div className={cls}>
                    {isDoubly && <span className="viz-lls-cell link prev">{i === 0 ? '∅' : '◀'}</span>}
                    <span className="viz-lls-cell">{node.val}</span>
                    <span className="viz-lls-cell link">{i === nodes.length - 1 ? '∅' : '▶'}</span>
                  </div>
                  <div className="viz-lls-ptrs">
                    {labels.map(l => <span key={l} className={`viz-lls-ptr ${l === 'list' ? 'head' : ''}`}>{l}</span>)}
                  </div>
                </div>
                {i < nodes.length - 1
                  ? <span className="viz-lls-arrow">{isDoubly ? '⇄' : '→'}</span>
                  : <span className="viz-lls-null">null</span>}
              </div>
            )
          })}
        </div>

        {step?.output && step.output.length > 0 && (
          <div className="viz-panel-row">
            <span className="viz-muted">Printed:</span>
            {step.output.map((v, i) => <span key={i} className="viz-chip accent">{v}</span>)}
          </div>
        )}
      </div>

      <div className="viz-controls">
        {(isDoubly ? doublyMode === 'insertFirst' || doublyMode === 'insertLast' : singlyMode === 'insert') && (
          <label className="viz-field">
            value
            <input className="viz-input narrow" value={value} maxLength={4} onChange={e => setValue(e.target.value)} />
          </label>
        )}
        {!isDoubly && (
          <label className="viz-field">
            pos
            <input className="viz-input narrow" value={pos} maxLength={2} onChange={e => setPos(e.target.value)}
              title={singlyMode === 'insert' ? '0 = new head' : '1 = first node'} />
          </label>
        )}
        <button className="viz-btn" onClick={run} disabled={stepper.playing}>{buttonLabel}</button>
        <button className="viz-btn ghost" onClick={resetList}>Reset list</button>
      </div>
      {!isDoubly && (
        <p className="viz-muted" style={{ fontSize: '0.68rem', margin: '0.3rem 0 0' }}>
          {singlyMode === 'insert' ? 'pos 0 inserts a new head; pos n inserts after the n-th node.' : 'pos 1 deletes the head.'}
        </p>
      )}

      <StepControls stepper={stepper} caption={step?.caption} code={code} activeLine={step?.line ?? null} />
    </div>
  )
}
