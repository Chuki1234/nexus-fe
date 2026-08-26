import { DestroyRef, inject, Injectable, PLATFORM_ID, signal, Signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Service tính toán thời gian tương đối cho "Hoạt động ... trước"
 * Sử dụng một Signal Clock dùng chung duy nhất cập nhật mỗi 30s để tránh rò rỉ bộ nhớ hoặc tạo nhiều setInterval.
 * Hoàn toàn an toàn SSR (SSR-safe).
 */
@Injectable({
  providedIn: 'root',
})
export class TimeAgoService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  /** Mốc thời gian hiện tại (ms) cập nhật mỗi 30 giây */
  readonly clock = signal<number>(Date.now());

  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.intervalId = setInterval(() => {
        this.clock.set(Date.now());
      }, 30000);

      this.destroyRef.onDestroy(() => {
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
      });
    }
  }

  /**
   * Định dạng chuỗi "Hoạt động ... trước" canonical tiếng Việt
   * @param isoString Chuỗi ISO 8601 thời điểm hoạt động cuối
   * @param referenceNow Mốc thời gian đối chiếu (mặc định lấy clock hiện tại)
   */
  formatLastSeen(
    isoString: string | null | undefined,
    referenceNow: number = this.clock(),
  ): string | null {
    if (!isoString) return null;

    const timestamp = new Date(isoString).getTime();
    if (isNaN(timestamp)) return null;

    const diffSeconds = Math.max(0, Math.floor((referenceNow - timestamp) / 1000));

    // Dưới 60 giây
    if (diffSeconds < 60) {
      return 'Hoạt động vừa xong';
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    // 1 - 59 phút
    if (diffMinutes < 60) {
      return `Hoạt động ${diffMinutes} phút trước`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    // 1 - 23 giờ
    if (diffHours < 24) {
      return `Hoạt động ${diffHours} giờ trước`;
    }

    const diffDays = Math.floor(diffHours / 24);
    // 1 ngày
    if (diffDays === 1) {
      return 'Hoạt động hôm qua';
    }

    // 2 - 6 ngày
    if (diffDays < 7) {
      return `Hoạt động ${diffDays} ngày trước`;
    }

    // Từ 7 ngày trở lên: hiển thị định dạng ngày/tháng/năm vi-VN
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `Hoạt động ngày ${day}/${month}/${year}`;
  }
}
