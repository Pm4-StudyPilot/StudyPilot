import { FormHTMLAttributes } from "react"

interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  loading?: boolean
  error?: string
}

export default function Form({ children, loading, error, ...props }: FormProps) {
  return (
    <form {...props}>
      {error && <div className="alert alert-danger">{error}</div>}
      {children}
    </form>
  )
}
