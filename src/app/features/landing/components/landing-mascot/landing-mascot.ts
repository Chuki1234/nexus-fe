import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type MascotVariant = 'green' | 'purple' | 'orange';

/**
 * Nexi — linh vật thương hiệu Nexus: một "node mạng biết sống".
 * Thân blob phẳng (color-block, theo design system), 2 ăng-ten đầu bi phát tín
 * hiệu (nét nhận diện = presence/real-time). Màu thân đổi theo `variant`, còn
 * đầu bi tín hiệu luôn xanh brand — ngụ ý mọi cá thể cùng nối một mạng lưới.
 *
 * Mọi màu lấy từ token qua class CSS — không hardcode hex, tự đổi theo light/dark.
 */
@Component({
  selector: 'app-landing-mascot',
  imports: [],
  templateUrl: './landing-mascot.html',
  styleUrl: './landing-mascot.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingMascot {
  /** Màu thân: xanh (chính), tím / cam (bạn đồng hành). */
  readonly variant = input<MascotVariant>('green');
  /** Giơ tay vẫy chào (dùng ở hero). */
  readonly waving = input<boolean>(false);
  /** Nhãn cho screen reader; rỗng = ẩn khỏi cây trợ năng (trang trí). */
  readonly label = input<string>('');
}
