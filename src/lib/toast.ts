// Avisos curtos no rodapé (ex: "Sessão de admin expirada"). Substitui o Alert do app

export type Toast = { id: number; title: string; message?: string };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<(t: Toast[]) => void>();
const emit = () => listeners.forEach(listener => listener(toasts));

export function subscribeToasts(listener: (t: Toast[]) => void) {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

export function showToast(title: string, message?: string, durationMs = 5000) {
  const toast = { id: nextId++, title, message };
  toasts = [...toasts, toast];
  emit();
  setTimeout(() => dismissToast(toast.id), durationMs);
}

export function dismissToast(id: number) {
  toasts = toasts.filter(t => t.id !== id);
  emit();
}
