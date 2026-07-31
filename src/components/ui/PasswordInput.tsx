import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  hasError?: boolean
  show: boolean
  onToggle: () => void
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ hasError, show, onToggle, className, ...props }, ref) => {
    const classes = ['field-input', hasError ? 'field-error' : '', className]
      .filter(Boolean)
      .join(' ')

    return (
      <div className="password-wrap">
        <input ref={ref} type={show ? 'text' : 'password'} className={classes} {...props} />
        <button type="button" className="pw-toggle" onClick={onToggle} tabIndex={-1}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

export default PasswordInput
