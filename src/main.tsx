import { StrictMode, Component } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'monospace',
          padding: '2rem', gap: '1rem',
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--error)' }}>App failed to start</div>
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--error-border-soft)',
            borderRadius: '10px', padding: '1rem 1.5rem', maxWidth: '600px',
            fontSize: '0.82rem', color: 'var(--error)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {err.message}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '500px' }}>
            Check the browser console for more details. If this is a Supabase URL error,
            make sure your <code>.env</code> file is correct and restart the dev server.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '0.5rem', padding: '0.5rem 1.5rem',
              background: 'var(--success-tint)', border: '1px solid var(--success-border)',
              borderRadius: '8px', color: 'var(--cyan)', cursor: 'pointer', fontSize: '0.85rem',
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
