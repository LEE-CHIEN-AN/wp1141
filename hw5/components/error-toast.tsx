'use client';

import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ErrorToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ErrorToastProps) {
  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: 'bg-green-500/10 border-green-500/20 text-green-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  };

  const Icon = icons[toast.type];
  const colorClass = colors[toast.type];

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm ${colorClass} animate-in slide-in-from-top-5`}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 rounded-full p-1 hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useErrorToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'error', duration = 5000) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const ToastContainer = () => {
    if (toasts.length === 0) return null;

    return (
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    );
  };

  return {
    showToast,
    showError: (message: string, duration?: number) => showToast(message, 'error', duration),
    showSuccess: (message: string, duration?: number) => showToast(message, 'success', duration),
    showWarning: (message: string, duration?: number) => showToast(message, 'warning', duration),
    showInfo: (message: string, duration?: number) => showToast(message, 'info', duration),
    ToastContainer,
  };
}







