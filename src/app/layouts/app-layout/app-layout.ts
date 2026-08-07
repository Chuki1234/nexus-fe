import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ChannelSidebar } from '../channel-sidebar/channel-sidebar';
import { ServerRail } from '../server-rail/server-rail';

/**
 * Khung Dashboard — nơi ba trang còn lại (Profile, Setting, và các trang chat)
 * render vào.
 *
 * Bố cục bốn cột: dải server · danh sách kênh · nội dung · thẻ hồ sơ.
 * Hai cột trái gộp chung vào một drawer, nên ở màn hẹp chúng cùng trượt ra —
 * tách riêng sẽ tốn hai lần vuốt để tới được nội dung.
 */
@Component({
  selector: 'app-dashboard-shell',
  imports: [
    ChannelSidebar,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatTooltipModule,
    RouterOutlet,
    ServerRail,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './dashboard-shell.css',
  templateUrl: './dashboard-shell.html',
})
export class DashboardShell {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /**
   * Dưới `lg` (1024px) thì hai cột trái thu vào drawer — đúng breakpoint Desktop
   * trong DESIGN-voltagent.md.
   */
  private readonly compact = toSignal(
    this.breakpoints
      .observe([Breakpoints.XSmall, Breakpoints.Small, Breakpoints.Medium])
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected readonly isCompact = computed(() => this.compact());

  /**
   * `serverId` của route con đang mở, hoặc null khi đang ở khu tin nhắn trực tiếp.
   *
   * Shell nằm ngoài router-outlet nên không có params của route con — phải lần
   * xuống cây route để lấy.
   */
  private readonly currentServerId = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.readServerId()),
    ),
    { initialValue: this.readServerId() },
  );

  protected readonly serverId = computed(() => this.currentServerId());

  /**
   * Lần xuống cây route tìm param `serverId`.
   *
   * `snapshot` phải kiểm tra tồn tại: shell được dựng trong pha activation, tức
   * TRƯỚC `NavigationEnd`, nên lúc gọi lần đầu route con đã có mặt nhưng snapshot
   * của nó chưa được gán. Bỏ dấu `?` ở đây là ném lỗi và chặn đứng điều hướng.
   */
  private readServerId(): string | null {
    let route: ActivatedRoute | null = this.route;
    while (route) {
      const id = route.snapshot?.paramMap.get('serverId');
      if (id) {
        return id;
      }
      route = route.firstChild;
    }
    return null;
  }
}
