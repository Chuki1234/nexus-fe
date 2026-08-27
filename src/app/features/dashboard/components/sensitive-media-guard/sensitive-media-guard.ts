import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Che nội dung media nhạy cảm bằng một lớp phủ mờ cho tới khi người xem chủ động
 * bấm "Hiện".
 *
 * Bọc quanh media bằng chiếu nội dung (`<ng-content>`): nơi gọi không phải đổi
 * markup ảnh/video, chỉ cần lồng vào trong thẻ này và bật `[sensitive]`.
 *
 * `sensitive=false` thì component trong suốt hoàn toàn — hiện media như thường,
 * không thêm DOM che chắn nào.
 */
@Component({
  selector: 'app-sensitive-media-guard',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sensitive-media-guard.html',
  styleUrl: './sensitive-media-guard.css',
})
export class SensitiveMediaGuard {
  /** Có phải media nhạy cảm cần che hay không. */
  readonly sensitive = input(false);
  /** Nhãn mô tả (thường là tên file) cho phần chú thích lớp phủ. */
  readonly label = input('');

  /** Người xem đã bấm "Hiện" chưa — reset khi component tái sử dụng cho media khác. */
  protected readonly revealed = signal(false);

  protected reveal(): void {
    this.revealed.set(true);
  }
}
