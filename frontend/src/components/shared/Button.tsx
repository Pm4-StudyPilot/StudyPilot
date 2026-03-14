import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}${className ? ` ${className}` : ""}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="spinner-border spinner-border-sm me-2" role="status" />
      ) : null}
      {children}
    </button>
  );
}
