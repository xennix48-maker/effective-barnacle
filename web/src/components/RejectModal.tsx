import { useEffect, useRef } from 'react';

export type RejectModalProps = {
  open: boolean;
  title?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  busy?: boolean;
};

/**
 * Telegram-friendly reject reason modal.
 * Replaces window.prompt which renders poorly inside WebApp / iOS WebView.
 */
export function RejectModal({
  open,
  title = 'ငြင်းပယ်ရသည့် အကြောင်းအရင်း',
  onCancel,
  onConfirm,
  busy = false,
}: RejectModalProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      // Defer focus until after the modal mounts so the keyboard opens cleanly.
      const t = window.setTimeout(() => ref.current?.focus(), 80);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-card">
        <div className="modal-card__head">
          <span className="modal-card__title">{title}</span>
          <button className="modal-card__close" aria-label="ပိတ်မည်" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="modal-card__body">
          <textarea
            ref={ref}
            className="textarea"
            rows={3}
            placeholder="ငြင်းပယ်ရသည့် အကြောင်းအရင်း ထည့်ပါ (user ထံပြပေးမည်)"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancel();
            }}
          />
        </div>
        <div className="modal-card__actions">
          <button className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            မလုပ်တော့ပါ
          </button>
          <button
            className="btn btn--danger"
            disabled={busy}
            onClick={() => {
              const r = ref.current?.value.trim();
              if (!r) {
                ref.current?.focus();
                return;
              }
              onConfirm(r);
            }}
          >
            {busy ? 'ငြင်းပယ်နေသည်...' : '✕ Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
