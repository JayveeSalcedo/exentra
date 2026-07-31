import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & {
  hasError?: boolean
}

const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ hasError, className, children, ...props }, ref) => {
    const classes = ['field-input', 'field-select', hasError ? 'field-error' : '', className]
      .filter(Boolean)
      .join(' ')

    return (
      <select ref={ref} className={classes} {...props}>
        {children}
      </select>
    )
  }
)

SelectInput.displayName = 'SelectInput'

export default SelectInput
