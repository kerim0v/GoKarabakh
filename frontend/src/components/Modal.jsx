import { useEffect } from "react";

// Shared modal shell using the glass card styles; closes on Escape and backdrop click.
export default function Modal({ open, onClose, labelledBy, className = "", children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.classList.add("has-modal");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("has-modal");
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="auth-backdrop-enhanced modal-layer" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`auth-card-enhanced glass modal-card ${wide ? "modal-card-wide" : ""} ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <button className="button-auth-close" type="button" onClick={onClose} aria-label="Close">×</button>
        <div className="auth-content-enhanced">{children}</div>
      </div>
    </div>
  );
}
