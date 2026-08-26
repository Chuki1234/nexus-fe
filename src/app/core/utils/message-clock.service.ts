import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

/**
 * Service đồng hồ thời gian thực cho view chat.
 *
 * Cung cấp signal `now` được cập nhật mỗi giây một lần để tính toán
 * deadline chính xác (ví dụ 5 phút sửa tin nhắn) mà không cần tạo timer riêng cho từng message.
 *
 * Được provide ở cấp độ component/view (ConversationPage, ChannelPage, VoiceChatDrawer)
 * và tự động cleanup khi view bị destroy.
 */
@Injectable()
export class MessageClockService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly now = signal<number>(Date.now());

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const intervalId = setInterval(() => {
        this.now.set(Date.now());
      }, 1000);

      this.destroyRef.onDestroy(() => {
        clearInterval(intervalId);
      });
    }
  }
}
