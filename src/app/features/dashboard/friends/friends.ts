import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ServerInvitationsStore } from '../../../core/servers/server-invitations.store';
import type { DirectServerInvitationDto } from '../../../../shared/dto/server-invitations.dto';
import { ServerInvitationItem } from './components/server-invitation-item/server-invitation-item';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PresenceService } from '../../../core/presence/presence.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { UserSettingsService } from '../../settings/services/user-settings.service';
import { Avatar } from '../../../shared/ui/avatar/avatar';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { SearchField } from '../../../shared/ui/search-field/search-field';
import { SectionLabel } from '../../../shared/ui/section-label/section-label';
import { ContextPanel } from '../components/context-panel/context-panel';
import { DashboardState } from '../components/dashboard-state/dashboard-state';
import { DashboardUiState } from '../services/dashboard-ui-state';
import { ActivityPanel } from './components/activity-panel/activity-panel';
import { AddFriendForm } from './components/add-friend-form/add-friend-form';
import { FriendRequestItem } from './components/friend-request-item/friend-request-item';
import { FriendRow } from './components/friend-row';
import { FriendsToolbar, type FriendsTab } from './components/friends-toolbar';
import {
  FriendsStore,
  type FriendListPerson,
  type FriendRequestPerson,
} from './services/friends-store';

import {
  DashboardLayoutService,
  MOBILE_BREAKPOINT_QUERY,
} from '../../../layouts/app-layout/services/dashboard-layout.service';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

type FriendsContextView = 'activity';

/**
 * Trang đích của khu tin nhắn trực tiếp — `/channels/@me`.
 *
 * Quản lý danh sách bạn bè và duyệt các yêu cầu kết bạn / lời mời tham gia máy chủ.
 */
@Component({
  selector: 'app-friends-page',
  imports: [
    ActivityPanel,
    AddFriendForm,
    Avatar,
    ContextPanel,
    DashboardState,
    EmptyState,
    FriendRequestItem,
    FriendRow,
    FriendsToolbar,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    SearchField,
    SectionLabel,
    ServerInvitationItem,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  templateUrl: './friends.html',
  styleUrl: './friends.css',
})
export class FriendsPage implements OnInit {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly themeService = inject(ThemeService);
  private readonly uiState = inject(DashboardUiState);
  private readonly friendsStore = inject(FriendsStore);
  private readonly invitationsStore = inject(ServerInvitationsStore);
  private readonly presenceService = inject(PresenceService);
  private readonly route = inject(ActivatedRoute);

  // Màn hình rộng (>= 1280px) thì mở Activity Panel; màn hình nhỏ/tablet/mobile thì đóng để không che danh sách
  protected readonly isLargeScreen = toSignal(
    this.breakpoints.observe('(min-width: 1280px)').pipe(map((state) => state.matches)),
    { initialValue: typeof window !== 'undefined' ? window.innerWidth >= 1280 : true },
  );

  protected readonly isMobile = toSignal(
    this.breakpoints.observe(MOBILE_BREAKPOINT_QUERY).pipe(map((state) => state.matches)),
    { initialValue: typeof window !== 'undefined' ? window.innerWidth < 768 : false },
  );

  protected readonly tab = signal<FriendsTab>('all');
  protected readonly query = signal('');
  protected readonly theme = this.themeService.mode;
  protected readonly contextView = signal<FriendsContextView | null>(null);
  protected readonly blockingState = this.uiState.blockingState;
  protected readonly connectionState = this.uiState.connectionState;
  protected readonly friendsLoading = this.friendsStore.loading;
  protected readonly friendsError = this.friendsStore.error;
  protected readonly friendFeedback = this.friendsStore.feedback;
  protected readonly sendingRequest = this.friendsStore.sending;
  protected readonly busyIds = this.friendsStore.busyIds;
  protected readonly incomingRequests = this.friendsStore.incomingRequests;
  protected readonly outgoingRequests = this.friendsStore.outgoingRequests;

  /** Quản lý danh sách lời mời máy chủ */
  protected readonly serverInvitations = this.invitationsStore.pendingInvitations;
  protected readonly serverInvitationsLoading = this.invitationsStore.isLoading;
  protected readonly processingInviteIds = signal<Set<string>>(new Set());

  protected readonly allFriends = this.friendsStore.friends;

  protected readonly onlineFriends = computed(() =>
    this.allFriends().filter((person) => {
      const presence = this.presenceService.getPresence(person.id)();
      return presence !== 'offline';
    }),
  );

  protected readonly blockedUsers = this.friendsStore.blocked;
  protected readonly blockedLoading = this.friendsStore.loadingBlocked;

  protected readonly visible = computed(() => {
    const needle = this.query().trim().toLowerCase();
    const people = this.tab() === 'online' ? this.onlineFriends() : this.allFriends();
    return people.filter((person) => {
      if (!needle) return true;
      return (
        person.name.toLowerCase().includes(needle) ||
        person.username?.toLowerCase().includes(needle)
      );
    });
  });

  protected readonly visibleBlocked = computed(() => {
    const needle = this.query().trim().toLowerCase();
    return this.blockedUsers().filter((user) => {
      if (!needle) return true;
      const name = user.displayName || user.username;
      return (
        name.toLowerCase().includes(needle) ||
        user.username.toLowerCase().includes(needle)
      );
    });
  });

  /** Tổng số yêu cầu đang chờ duyệt: lời mời kết bạn (đến + đi) + lời mời tham gia máy chủ */
  protected readonly pendingCount = computed(
    () =>
      this.incomingRequests().length +
      this.outgoingRequests().length +
      this.serverInvitations().length,
  );

  protected readonly sectionLabel = computed(() => {
    const currentTab = this.tab();
    if (currentTab === 'online') {
      return `Trực tuyến — ${this.visible().length}`;
    }
    if (currentTab === 'blocked') {
      return `Đã chặn — ${this.visibleBlocked().length}`;
    }
    return `Tất cả bạn bè — ${this.visible().length}`;
  });

  protected readonly contextOpen = computed(() => this.contextView() !== null);
  protected readonly activityExpanded = computed(() => this.contextView() === 'activity');

  private previousIsMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  constructor() {
    effect(() => {
      // Khi chuyển tab, xóa feedback và lỗi của các thao tác trước để không rò rỉ sang tab khác
      this.tab();
      this.friendsStore.clearFeedback();
    });

    effect(() => {
      const mobile = this.isMobile();
      // Chỉ tự động đóng khi vừa chuyển từ desktop sang mobile (khi resize co nhỏ)
      if (mobile && !this.previousIsMobile) {
        untracked(() => {
          this.contextView.set(null);
        });
      }
      this.previousIsMobile = mobile;
    });
  }

  protected unblockUser(id: string): void {
    void this.friendsStore.unblockUser(id);
  }

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'pending' || tabParam === 'online' || tabParam === 'all' || tabParam === 'blocked' || tabParam === 'add') {
      this.tab.set(tabParam);
    }

    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab === 'pending' || tab === 'online' || tab === 'all' || tab === 'blocked' || tab === 'add') {
        this.tab.set(tab);
      }
    });

    void this.friendsStore.load();
    void this.friendsStore.loadBlocked();
    void this.invitationsStore.hydrateInvitations();
  }

  protected toggleActivity(): void {
    if (this.activityExpanded()) {
      this.closeContext();
      return;
    }
    this.contextView.set('activity');
  }

  protected closeContext(): void {
    this.contextView.set(null);
  }

  protected onSendRequest(targetUsername: string): void {
    void this.friendsStore.sendRequest(targetUsername);
  }

  protected onAccept(userId: string): void {
    void this.friendsStore.acceptRequest(userId);
  }

  protected onDecline(userId: string): void {
    void this.friendsStore.deleteRequest(userId, 'incoming');
  }

  protected onCancel(userId: string): void {
    void this.friendsStore.deleteRequest(userId, 'outgoing');
  }

  protected async onAcceptServerInvite(invitation: DirectServerInvitationDto): Promise<void> {
    this.processingInviteIds.update((s) => new Set(s).add(invitation.id));
    try {
      await this.invitationsStore.acceptInvitation(invitation.id);
    } finally {
      this.processingInviteIds.update((s) => {
        const next = new Set(s);
        next.delete(invitation.id);
        return next;
      });
    }
  }

  protected async onDeclineServerInvite(invitation: DirectServerInvitationDto): Promise<void> {
    this.processingInviteIds.update((s) => new Set(s).add(invitation.id));
    try {
      await this.invitationsStore.declineInvitation(invitation.id);
    } finally {
      this.processingInviteIds.update((s) => {
        const next = new Set(s);
        next.delete(invitation.id);
        return next;
      });
    }
  }

  protected onRemoveFriend(personId: string): void {
    void this.friendsStore.removeFriend(personId);
  }

  protected onRetry(): void {
    if (this.tab() === 'blocked') {
      void this.friendsStore.loadBlocked(true);
    } else {
      void this.friendsStore.load(true);
      void this.invitationsStore.hydrateInvitations();
    }
  }
}
