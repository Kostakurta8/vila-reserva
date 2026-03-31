import { useEffect } from 'react';

/**
 * Styled confirmation dialog — replaces browser's native confirm().
 * Shows reservation details and requires explicit click to delete.
 */
export default function ConfirmDialog({ t, title, message, detail, onConfirm, onCancel }) {
  /* ── ESC key cancels ───────────────────────────────────────── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="overlay confirm-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">⚠️</div>
        <div className="confirm-title">{title}</div>
        <div className="confirm-msg">{message}</div>
        {detail && <div className="confirm-detail">{detail}</div>}
        <div className="confirm-actions">
          <button className="btn btn-outline" onClick={onCancel}>
            {t.cancel}
          </button>
          <button className="btn btn-danger" onClick={onConfirm} autoFocus>
            🗑️ {t.deleteBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
