import { TextareaHTMLAttributes, useId } from "react"
import { FormFieldLayout } from "./FormFieldLayout"

type TextareaFieldProps = {
  label: string
  error?: string
} & TextareaHTMLAttributes<HTMLTextAreaElement>

export default function TextareaField({
  error,
  id,
  label,
  ...textareaProps
}: TextareaFieldProps) {
  const generatedId = useId()
  const finalId = id ?? generatedId

  return (
    <FormFieldLayout label={label} error={error} id={finalId}>
      <textarea
        {...textareaProps}
        id={finalId}
        className={`form-control${error ? " is-invalid" : ""}`}
      />
    </FormFieldLayout>
  )
}
