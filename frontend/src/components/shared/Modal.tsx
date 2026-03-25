import { useEffect, useState } from "react"

interface ModalProps {
  title?: string
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  disableClose?: boolean
  onClose?: () => void
}

export default function Modal({
  title,
  children,
  header,
  footer,
  disableClose = false,
}: ModalProps) {

  // modal closing logic
  const [showModal, setShowModal] = useState(true)
  if(!showModal) return null
  const onClose = () => {
    if(!disableClose) setShowModal(false)
  }

  // clicking ESC closes the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])


  return (
    <div
      className="modal-backdrop-custom d-flex justify-content-center align-items-center min-vh-100"
      onClick={onClose}
     >
      <div onClick={(e) => e.stopPropagation()} className="container d-flex justify-content-center">
        {!disableClose && (
          <button
            className="btn-close position-absolute top-0 end-0 m-3"
            onClick={onClose}
          />
        )}
        <div
          className="card shadow"
          style={{ maxWidth: "400px", width: "100%" }}
        >
          <div className="card-body p-4">
            {header && (<h2 className="text-center mb-2">{header}</h2>)}
            {title && (<h5 className="text-center mb-3">{title}</h5>)}

            {children}

            {footer && <div className="text-center mt-3">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}