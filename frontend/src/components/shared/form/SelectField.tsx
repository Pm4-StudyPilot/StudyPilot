import { FormFieldLayout, Option, BaseProps } from "./FormFieldLayout"
import { SelectHTMLAttributes,useId} from "react"

type SelectFieldProps = BaseProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: Option[]
  }

export default function SelectField({ options, error, id, ...props }: SelectFieldProps) {
  const finalId = id ?? useId()
  return (
    <FormFieldLayout {...props} id={finalId} error={error}>
      <select
        {...props}
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