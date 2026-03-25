import { InputHTMLAttributes, useId } from "react"
import { FormFieldLayout, BaseProps } from "./FormFieldLayout"

type InputFieldProps = BaseProps & InputHTMLAttributes<HTMLInputElement>

export default function InputField({
  error,
  id,
  label,
  ...props
}: InputFieldProps) {
  const generatedId = useId()
  const finalId = id ?? generatedId

  return (
    <FormFieldLayout label={label} error={error} id={finalId} {...props}>
      <input
        {...props}
        id={finalId}
        className={`form-control${error ? " is-invalid" : ""}`}
      />
    </FormFieldLayout>
  )
}
