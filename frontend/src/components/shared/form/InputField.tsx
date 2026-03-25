import { InputHTMLAttributes, useId } from "react"
import { FormFieldLayout } from "./FormFieldLayout"

type InputFieldProps = {
  label: string
  error?: string
} & InputHTMLAttributes<HTMLInputElement>

export default function InputField({
  error,
  id,
  label,
  ...inputProps
}: InputFieldProps) {
  const generatedId = useId()
  const finalId = id ?? generatedId

  return (
    <FormFieldLayout label={label} error={error} id={finalId}>
      <input
        {...inputProps}
        id={finalId}
        className={`form-control${error ? " is-invalid" : ""}`}
      />
    </FormFieldLayout>
  )
}
