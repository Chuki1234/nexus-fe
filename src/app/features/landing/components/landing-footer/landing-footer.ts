import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingMascot } from '../landing-mascot/landing-mascot';

interface AnchorLink {
  readonly label: string;
  readonly href: string;
}
interface RouteLink {
  readonly label: string;
  readonly link: string;
}

/**
 * Footer kiểu Discord: logo trái · cột link phải · wordmark "Nexus" khổng lồ.
 * Chỉ liệt kê những đích THẬT SỰ tồn tại — mục neo trong trang và route auth.
 * Không bịa trang marketing (Blog, API, Đối tác…), không social/ngôn ngữ giả.
 */
@Component({
  selector: 'app-landing-footer',
  imports: [RouterLink, LandingMascot],
  templateUrl: './landing-footer.html',
  styleUrl: './landing-footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingFooter {
  protected readonly year = new Date().getFullYear();

  /** Neo tới các section có thật trên trang (khớp id trong template mỗi section). */
  protected readonly productLinks: readonly AnchorLink[] = [
    { label: 'Tính năng', href: '#journey' },
    { label: 'Chi tiết', href: '#chi-tiet' },
    { label: 'Cộng đồng', href: '#community' },
  ];

  /** Route auth đã tồn tại trong ứng dụng. */
  protected readonly accountLinks: readonly RouteLink[] = [
    { label: 'Đăng nhập', link: '/login' },
    { label: 'Tạo tài khoản', link: '/register' },
    { label: 'Quên mật khẩu', link: '/forgot-password' },
  ];
}
