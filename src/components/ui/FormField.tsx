import type { ReactNode } from 'react'

type FormFieldProps = {
  label: string
  htmlFor?: string
  error?: string
  children: ReactNode
}

export default function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="field-group">
      <label className="field-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <span className="error-msg">{error}</span>}
    </div>
  )
}
