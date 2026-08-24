import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new ToastService();
  });

  it('shows toast with message and auto-dismisses after duration', () => {
    service.show({ message: 'Hello World', duration: 3000 });
    expect(service.currentToast()?.message).toBe('Hello World');

    vi.advanceTimersByTime(3000);
    expect(service.currentToast()).toBeNull();
  });

  it('dismiss() clears toast immediately', () => {
    service.show({ message: 'Dismiss me' });
    expect(service.currentToast()).not.toBeNull();

    service.dismiss();
    expect(service.currentToast()).toBeNull();
  });
});
