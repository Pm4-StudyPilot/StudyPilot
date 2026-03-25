import { SelectHTMLAttributes, useId } from "react"
import { FormFieldLayout } from "./FormFieldLayout"
import { Option } from "./types"

type SelectFieldProps = {
  label: string
  error?: string
  options: Option[]
} & SelectHTMLAttributes<HTMLSelectElement>

export default function SelectField({
  options,
  error,
  id,
  label,
  ...selectProps
}: SelectFieldProps) {
  const generatedId = useId()
  const finalId = id ?? generatedId

  return (
    <FormFieldLayout label={label} error={error} id={finalId}>
      <select
        {...selectProps}
        id={finalId}
        className={`form-control${error ? " is-invalid" : ""}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormFieldLayout>
  )
}
