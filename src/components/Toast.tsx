'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
};

const COLORS = {
  info: 'bg-status-info/10 text-status-info border-status-info/20',
  success: 'bg-status-success/10 text-status-success border-status-success/20',
  warning: 'bg-status-warning/10 text-status-warning border-status-warning/20',
};

export default function Toast({ message, type = 'info', duration = 5000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const Icon = ICONS[type];

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 ${
        COLORS[type]
      } ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
    >
      <Icon size={16} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="ml-2 opacity-50 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

// Global toast state for use across components
let _showToast: ((msg: string, type?: ToastType) => void) | null = null;

export function showToast(message: string, type?: ToastType) {
  if (_showToast) _showToast(message, type);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: ToastType }>>([]);
  let counter = 0;

  useEffect(() => {
    _showToast = (message: string, type: ToastType = 'info') => {
      const id = ++counter;
      setToasts(prev => [...prev, { id, message, type }]);
    };
    return () => { _showToast = null; };
  });

  return (
    <>
      {children}
      {toasts.map(t => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
        />
      ))}
    </>
  );
}
