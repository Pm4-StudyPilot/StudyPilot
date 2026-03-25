import { TextareaHTMLAttributes, useId } from "react"
import { FormFieldLayout, BaseProps } from "./FormFieldLayout"

type TextareaFieldProps = BaseProps &
  TextareaHTMLAttributes<HTMLTextAreaElement>

export default function TextareaField({ error, id, ...props }: TextareaFieldProps) {
const finalId = id ?? useId()
  return (
    <FormFieldLayout {...props} id={finalId} error={error}>
      <textarea
        {...props}
        id={finalId}
        className={`form-control${error ? " is-invalid" : ""}`}
      />
    </FormFieldLayout>
  )
}