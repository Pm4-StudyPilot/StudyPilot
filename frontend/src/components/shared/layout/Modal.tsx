import { useEffect, useState, useCallback } from "react";

interface ModalProps {
  title?: string;
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  disableClose?: boolean;
  onClose?: () => void;
}

export default function Modal({
  title,
  children,
  header,
  footer,
  disableClose = false,
  onClose,
}: ModalProps) {
  // modal closing logic
  const [showModal, setShowModal] = useState(true);

  const handleClose = useCallback(() => {
    if (disableClose) return;
    setShowModal(false);
    onClose?.();
  }, [disableClose, onClose]);

  // clicking ESC closes the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose?.();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose]);

  if (!showModal) return null;

  return (
    <div
      data-testid="modal-backdrop"
      className="modal modal-backdrop-custom d-flex justify-content-center align-items-center min-vh-100"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="container d-flex justify-content-center"
      >
        {!disableClose && (
          <button
            data-testid="modal-closebutton"
            className="btn-close position-absolute top-0 end-0 m-3"
            onClick={handleClose}
          />
        )}
        <div className="card shadow">
          <div className="card-body p-4">
            {header && <h2 className="text-center mb-2">{header}</h2>}
            {title && <h5 className="text-center mb-3">{title}</h5>}

            {children}

            {footer && <div className="text-center mt-3">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

