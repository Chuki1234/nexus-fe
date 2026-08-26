import { DestroyRef, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ChatSocketService } from '../realtime/chat-socket.service';
import { PRESENCE_ACTIVITY_THROTTLE_MS } from '../../../shared/dto/common';

/**
 * Service theo dõi tương tác người dùng trên ứng dụng để gửi xung nhịp activity lên backend
 * Throttled tối đa 1 lần mỗi 30 giây (PRESENCE_ACTIVITY_THROTTLE_MS).
 * Hoàn toàn an toàn SSR (SSR-safe) và tự động dọn dẹp listeners khi destroy.
 */
@Injectable({
  providedIn: 'root',
})
export class UserActivityTrackerService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly chatSocket = inject(ChatSocketService);

  private lastEmittedAt = 0;
  private isListening = false;
  private cleanups: Array<() => void> = [];

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stop();
    });
  }

  /**
   * Bắt đầu lắng nghe các sự kiện tương tác của người dùng trên browser.
   */
  start(): void {
    if (!isPlatformBrowser(this.platformId) || this.isListening) {
      return;
    }

    this.isListening = true;

    const handler = () => this.recordActivity();

    const events: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'touchstart',
      'scroll',
      'focus',
    ];

    for (const ev of events) {
      window.addEventListener(ev, handler, { passive: true, capture: true });
      this.cleanups.push(() => window.removeEventListener(ev, handler, { capture: true }));
    }

    const docHandler = () => {
      if (document.visibilityState === 'visible') {
        this.recordActivity();
      }
    };
    document.addEventListener('visibilitychange', docHandler);
    this.cleanups.push(() => document.removeEventListener('visibilitychange', docHandler));

    // Gửi ngay 1 xung nhịp khi bắt đầu tracking
    this.recordActivity();
  }

  /**
   * Dừng lắng nghe và dọn dẹp event listeners.
   */
  stop(): void {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
    this.isListening = false;
  }

  /**
   * Ghi nhận hoạt động và gửi presence:activity nếu đã qua thời gian throttle 30s
   */
  recordActivity(force = false): void {
    const now = Date.now();
    if (force || now - this.lastEmittedAt >= PRESENCE_ACTIVITY_THROTTLE_MS) {
      this.lastEmittedAt = now;
      if (typeof this.chatSocket?.emitActivity === 'function') {
        this.chatSocket.emitActivity();
      }
    }
  }
}
