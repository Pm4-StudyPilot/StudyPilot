import { ReactNode } from "react"
type FormFieldLayoutProps = BaseProps & {
  children: React.ReactNode
  id?:string
}

export type Option = {
  label: string
  value: string 
}

export type BaseProps = {
  label: string
  error?: string
  description?: string
  iconLeft?: ReactNode
  iconRight?: ReactNode
  noMargin?: boolean
  id?:string
}


export function FormFieldLayout({
  label,
  error,
  description,
  iconLeft,
  iconRight,
  children,
  noMargin,
  id
}: FormFieldLayoutProps) {
  return (
    <div className={noMargin ? '' : 'mb-3'}>
      {id && (<label className="form-label" htmlFor={id}>{label}</label>)}
      <div role="group" className="input-group">
        {iconLeft && <span className="input-group-text">{iconLeft}</span>}
        {children}
        {iconRight && <span className="input-group-text">{iconRight}</span>}
      </div>

      {description && <div className="form-text">{description}</div>}
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  )
}
