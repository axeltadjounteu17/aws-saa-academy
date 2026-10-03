import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext';

/**
 * Accès aux notifications partagées. Doit être utilisé sous <ToastProvider>.
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast doit être utilisé dans <ToastProvider>.');
  return context;
}

export default useToast;
