import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ServersApiService } from '../../core/api/servers-api.service';
import { ShellData } from '../../core/api/shell-data';
import { ThemeService } from '../../core/theme/theme.service';
import { ChannelSidebar } from './components/channel-sidebar/channel-sidebar';
import { ServerRail } from './components/server-rail/server-rail';
import { SettingsModal } from '../../features/settings/settings-modal';

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
    SettingsModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app-layout.css',
  templateUrl: './app-layout.html',
})
export class AppLayout implements OnInit {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly serversApi = inject(ServersApiService);
  private readonly shell = inject(ShellData);
  protected readonly theme = inject(ThemeService).mode;
  private isHydrating = false;

  async ngOnInit(): Promise<void> {
    await this.hydrateServers();
  }

  private async hydrateServers(): Promise<void> {
    if (this.isHydrating) {
      return;
    }
    this.isHydrating = true;
    try {
      await this.auth.whenReady();
      if (!this.auth.isAuthenticated()) {
        return;
      }
      const servers = await this.serversApi.listServers();
      if (servers.length > 0) {
        this.shell.hydrateServers(servers);
      }
    } catch {
      // Giữ live state rỗng nếu không kết nối được
    } finally {
      this.isHydrating = false;
    }
  }

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
