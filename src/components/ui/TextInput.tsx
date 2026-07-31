import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ hasError, className, ...props }, ref) => {
    const classes = ['field-input', hasError ? 'field-error' : '', className]
      .filter(Boolean)
      .join(' ')

    return <input ref={ref} className={classes} {...props} />
  }
)

TextInput.displayName = 'TextInput'

export default TextInput
