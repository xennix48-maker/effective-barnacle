import { useEffect, useState } from 'react';

export type Toast = {
  id: number;
  message: string;
  variant: 'success' | 'error' | 'info';
};

let counter = 0;
const listeners = new Set<(t: Toast) => void>();

export function pushToast(message: string, variant: Toast['variant'] = 'info') {
  const t = { id: ++counter, message, variant };
  listeners.forEach((l) => l(t));
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const handler = (t: Toast) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
      }, 3000);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);
  return (
    <div className="toast-host">
      {items.map((t) => (
        <div key={t.id} className={`toast toast--${t.variant}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
