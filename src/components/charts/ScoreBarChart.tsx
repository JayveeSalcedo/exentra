import { useState } from 'react'
import './ScoreBarChart.css'

export interface ScoreBar {
  key: string
  /** Short axis label (e.g. "M1") */
  label: string
  /** Full name for the tooltip and table */
  name: string
  /** 0–100, or null when there is no data yet */
  value: number | null
  detail?: string
}

interface Props {
  bars: ScoreBar[]
  /** 'status' colors each bar pass/fail against `threshold`; 'series' uses one hue */
  colorMode: 'status' | 'series'
  threshold?: number
  emptyText?: string
  ariaLabel: string
}

const TICKS = [0, 20, 40, 60, 80, 100]

/** Column chart on a 0–100% scale with hover tooltips and a table view */
export default function ScoreBarChart({ bars, colorMode, threshold = 60, emptyText = 'No data yet.', ariaLabel }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const [showTable, setShowTable] = useState(false)
  const hasData = bars.some(b => b.value !== null)

  const statusOf = (v: number) => (v >= threshold ? 'pass' : 'fail')
  const hovered = bars.find(b => b.key === hover)

  return (
    <div className="sbc-root">
      <div className="sbc-toolbar">
        {colorMode === 'status' && hasData && (
          <div className="sbc-legend" aria-hidden="true">
            <span><i className="sbc-key pass" /> Passing (≥{threshold}%)</span>
            <span><i className="sbc-key fail" /> Needs work (&lt;{threshold}%)</span>
          </div>
        )}
        {hasData && (
          <button className="sbc-view-toggle" onClick={() => setShowTable(v => !v)}>
            {showTable ? 'Chart view' : 'Table view'}
          </button>
        )}
      </div>

      {!hasData ? (
        <p className="sbc-empty">{emptyText}</p>
      ) : showTable ? (
        <div className="sbc-table-wrap">
          <table className="sbc-table">
            <thead><tr><th>Name</th><th>Score</th>{colorMode === 'status' && <th>Status</th>}<th>Details</th></tr></thead>
            <tbody>
              {bars.map(b => (
                <tr key={b.key}>
                  <td>{b.name}</td>
                  <td className="num">{b.value === null ? '—' : `${b.value}%`}</td>
                  {colorMode === 'status' && <td>{b.value === null ? 'No data' : statusOf(b.value) === 'pass' ? 'Passing' : 'Needs work'}</td>}
                  <td>{b.detail ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="sbc-plot" role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
          <div className="sbc-axis">
            {[...TICKS].reverse().map(t => <span key={t}>{t}%</span>)}
          </div>
          <div className="sbc-area">
            {TICKS.map(t => <div key={t} className="sbc-grid" style={{ bottom: `${t}%` }} />)}
            {colorMode === 'status' && (
              <div className="sbc-threshold" style={{ bottom: `${threshold}%` }} />
            )}
            <div className="sbc-bars" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
              {bars.map(b => {
                const tone = b.value === null ? 'none' : colorMode === 'status' ? statusOf(b.value) : 'series'
                return (
                  <button
                    key={b.key}
                    className={`sbc-slot ${hover === b.key ? 'hover' : ''}`}
                    onMouseEnter={() => setHover(b.key)}
                    onFocus={() => setHover(b.key)}
                    onBlur={() => setHover(null)}
                    aria-label={`${b.name}: ${b.value === null ? 'no data' : `${b.value}%`}`}
                  >
                    {b.value !== null && <span className="sbc-cap" style={{ bottom: `calc(${b.value}% + 4px)` }}>{Math.round(b.value)}%</span>}
                    <span className={`sbc-bar ${tone}`} style={{ height: b.value === null ? '2px' : `${Math.max(b.value, 1)}%` }} />
                  </button>
                )
              })}
            </div>
            {hovered && (
              <div className="sbc-tooltip" style={{ left: `${((bars.indexOf(hovered) + 0.5) / bars.length) * 100}%` }}>
                <strong>{hovered.value === null ? 'No data' : `${hovered.value}%`}</strong>
                <span>{hovered.name}</span>
                {hovered.detail && <em>{hovered.detail}</em>}
              </div>
            )}
          </div>
          <div />
          <div className="sbc-labels" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
            {bars.map(b => <span key={b.key} title={b.name}>{b.label}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}
