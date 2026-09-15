interface Props<K extends string> {
  modes: { key: K; label: string }[]
  value: K
  onChange: (key: K) => void
}

/** Small segmented control for switching a visualizer's operation */
export default function ModeTabs<K extends string>({ modes, value, onChange }: Props<K>) {
  return (
    <div className="viz-mode-tabs" role="tablist">
      {modes.map(m => (
        <button
          key={m.key}
          role="tab"
          aria-selected={value === m.key}
          className={`viz-mode-tab ${value === m.key ? 'active' : ''}`}
          onClick={() => onChange(m.key)}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
