import { BreakpointObserver } from '@angular/cdk/layout';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription, filter, map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ServersApiService } from '../../core/api/servers-api.service';
import { ServersStore } from '../../core/servers/servers.store';
import { ChatSocketService } from '../../core/realtime/chat-socket.service';
import { ServerRealtimeCoordinator } from '../../core/servers/server-realtime-coordinator.service';
import { NotificationStore } from '../../core/notification/notification-store';
import { ThemeService } from '../../core/theme/theme.service';
import { UserSettingsService } from '../../features/settings/services/user-settings.service';
import { ToastService } from '../../core/toast/toast.service';
import { SettingsModal } from '../../features/settings/settings-modal';
import { ChannelSidebar } from './components/channel-sidebar/channel-sidebar';
import { ServerRail } from './components/server-rail/server-rail';
import { UserPanel } from './components/user-panel/user-panel';
import { IncomingCallOverlayComponent } from '../../features/dashboard/components/incoming-call-overlay/incoming-call-overlay.component';
import { DirectCallStageComponent } from '../../features/dashboard/components/direct-call-stage/direct-call-stage.component';
import { DirectCallCoordinatorService } from '../../core/calls/direct-call-coordinator.service';

import { UserActivityTrackerService } from '../../core/presence/user-activity-tracker.service';

import {
  DashboardLayoutService,
  MOBILE_BREAKPOINT_QUERY,
  NAV_DEFAULT_WIDTH,
  NAV_MAX_WIDTH,
  NAV_MIN_WIDTH,
  SERVER_RAIL_WIDTH,
} from './services/dashboard-layout.service';

/**
 * Khung Dashboard — nơi ba trang còn lại (Profile, Setting, và các trang chat)
 * render vào.
 *
 * Trên Desktop (!isCompact): Bố cục Flex pane tự nhiên, cho phép resize Navigation Sidebar
 * mà không bao giờ bị overlay hoặc lệch content margin.
 * Trên Mobile (isCompact, <768px): Sử dụng Angular Material MatSidenav với mode="over" và backdrop.
 */
@Component({
  selector: 'app-dashboard-shell',
  imports: [
    ChannelSidebar,
    UserPanel,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatTooltipModule,
    RouterOutlet,
    ServerRail,
    SettingsModal,
    IncomingCallOverlayComponent,
    DirectCallStageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app-layout.css',
  templateUrl: './app-layout.html',
})
export class AppLayout implements OnInit, AfterViewInit, OnDestroy {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly serversApi = inject(ServersApiService);
  private readonly serversStore = inject(ServersStore);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly coordinator = inject(ServerRealtimeCoordinator);
  // Khởi tạo sớm ở root để badge chưa đọc/nhắc tên lắng nghe socket xuyên suốt,
  // không bị mất khi đổi server hay route.
  private readonly notificationStore = inject(NotificationStore);
  private readonly directCallCoordinator = inject(DirectCallCoordinatorService);
  private readonly activityTracker = inject(UserActivityTrackerService);
  protected readonly layoutService = inject(DashboardLayoutService);
  private readonly settingsService = inject(UserSettingsService);
  protected readonly theme = inject(ThemeService).mode;
  protected readonly activeTheme = computed(() => this.settingsService.preferences().theme || 'nexus-dark');
  protected readonly toastService = inject(ToastService);

  protected readonly navMinWidth = NAV_MIN_WIDTH;
  protected readonly navMaxWidth = NAV_MAX_WIDTH;
  protected readonly serverRailWidth = SERVER_RAIL_WIDTH;

  readonly shellContainer = viewChild<ElementRef<HTMLElement>>('dashboardShell');
  readonly drawer = viewChild<MatSidenav>('drawer');
  private resizeObserver: ResizeObserver | null = null;
  private isHydrating = false;
  private readonly subs = new Subscription();

  /**
   * Chỉ kích hoạt compact mode khi viewport nhỏ hơn 768px (mức điện thoại).
   * Tablet (>= 768px) và laptop/desktop luôn giữ desktop navigation.
   */
  private readonly compact = toSignal(
    this.breakpoints
      .observe([MOBILE_BREAKPOINT_QUERY])
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected readonly isCompact = computed(
    () => this.compact() || this.layoutService.shouldForceCompact(),
  );

  ngOnInit(): void {
    void this.hydrateServers();
    void this.directCallCoordinator.restoreActiveCall();
    this.activityTracker.start();

    this.subs.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => {
          const sId = this.readServerId();
          const cId = this.readChannelId();
          this.serversStore.setActive(sId, cId);
          // Đóng drawer trên mobile khi chuyển route
          this.drawer()?.close();
        }),
    );
  }

  ngAfterViewInit(): void {
    const el = this.shellContainer()?.nativeElement;
    if (el && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = Math.round(entry.contentRect.width);
          if (width > 0) {
            this.layoutService.updateContainerWidth(width);
          }
        }
      });
      this.resizeObserver.observe(el);
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.subs.unsubscribe();
  }

  startNavResize(event: PointerEvent): void {
    if (this.isCompact()) return;
    event.preventDefault();

    const target = event.currentTarget as HTMLElement;
    if (target && typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {}
    }

    this.layoutService.isDraggingNav.set(true);
    const startX = event.clientX;
    const startWidth = this.layoutService.navWidth();

    if (typeof document !== 'undefined') {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      this.layoutService.setNavWidth(startWidth + delta);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (target && typeof target.releasePointerCapture === 'function') {
        try {
          target.releasePointerCapture(upEvent.pointerId);
        } catch {}
      }

      this.layoutService.isDraggingNav.set(false);
      if (typeof document !== 'undefined') {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }

      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerUp);
      this.layoutService.savePreferences();
    };

    target.addEventListener('pointermove', onPointerMove);
    target.addEventListener('pointerup', onPointerUp);
    target.addEventListener('pointercancel', onPointerUp);
  }

  resetNavWidth(): void {
    this.layoutService.resetNavWidth();
  }

  handleNavKeyDown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 32 : 8;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.layoutService.adjustNavWidth(-step);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.layoutService.adjustNavWidth(step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.layoutService.setNavWidth(NAV_MIN_WIDTH);
      this.layoutService.savePreferences();
    } else if (event.key === 'End') {
      event.preventDefault();
      this.layoutService.setNavWidth(this.layoutService.effectiveMaxNavWidth());
      this.layoutService.savePreferences();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.resetNavWidth();
    }
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
      const user = this.auth.user();
      this.serversStore.setActiveUser(user?.id ?? null);
      this.chatSocket.connect();
      await this.coordinator.hydrateAndJoinAll();
    } catch {
      // Giữ live state rỗng nếu không kết nối được
    } finally {
      this.isHydrating = false;
    }
  }

  /**
   * `serverId` của route con đang mở, hoặc null khi đang ở khu tin nhắn trực tiếp.
   */
  private readonly currentServerId = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.readServerId()),
    ),
    { initialValue: this.readServerId() },
  );

  protected readonly serverId = computed(() => this.currentServerId());

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

  private readChannelId(): string | null {
    let route: ActivatedRoute | null = this.route;
    while (route) {
      const id = route.snapshot?.paramMap.get('channelId');
      if (id) {
        return id;
      }
      route = route.firstChild;
    }
    return null;
  }
}
