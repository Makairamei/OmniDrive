import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';
import type { ToastType } from '../types';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} color="var(--accent-success)" />,
  error: <AlertCircle size={18} color="var(--accent-danger)" />,
  warning: <AlertTriangle size={18} color="var(--accent-warning)" />,
  info: <Info size={18} color="var(--accent-info)" />,
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          {icons[toast.type]}
          <span style={{ flex: 1, fontSize: 'var(--font-size-sm)' }}>{toast.message}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => removeToast(toast.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
