import { Injectable, signal } from '@angular/core';

export interface ToastItem {
  id: string;
  message: string;
  action?: string;
  onAction?: () => void;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly currentToast = signal<ToastItem | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(item: Omit<ToastItem, 'id'>): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const toast: ToastItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      duration: item.duration ?? 5000,
    };

    this.currentToast.set(toast);

    this.timer = setTimeout(() => {
      this.dismiss();
    }, toast.duration);
  }

  dismiss(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.currentToast.set(null);
  }
}
