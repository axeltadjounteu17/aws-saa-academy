import { X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

const TONES = {
  success: 'bg-success/10 border-success',
  error: 'bg-error/10 border-error',
  info: 'bg-info/10 border-info',
  warning: 'bg-warning/10 border-warning',
};

export default function ToastContainer({ closeLabel = 'Fermer la notification' }) {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-20 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 lg:bottom-4" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-3 rounded-xl border bg-surface-light p-4 shadow-lg dark:bg-surface-dark ${TONES[toast.type] || TONES.info}`}
        >
          <div className="flex-1 text-sm">
            {toast.title && <p className="font-semibold">{toast.title}</p>}
            <p>{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="rounded p-1 transition-colors hover:bg-black/10"
            aria-label={closeLabel}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
