import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const ToastContext = createContext(null);

let toastCounter = 0;

function createToastId() {
  toastCounter += 1;
  return `toast-${Date.now()}-${toastCounter}`;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const removeToast = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = createToastId();
    const duration = toast.duration ?? 5000;
    setToasts((previous) => [...previous, { type: 'info', ...toast, id, duration }]);
    if (duration > 0) timers.current.set(id, setTimeout(() => removeToast(id), duration));
    return id;
  }, [removeToast]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({
    toasts,
    addToast,
    removeToast,
    clearToasts: () => setToasts([]),
    success: (message, options = {}) => addToast({ type: 'success', message, ...options }),
    error: (message, options = {}) => addToast({ type: 'error', message, ...options }),
    info: (message, options = {}) => addToast({ type: 'info', message, ...options }),
    warning: (message, options = {}) => addToast({ type: 'warning', message, ...options }),
  }), [toasts, addToast, removeToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
