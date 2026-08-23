import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ShellData } from '../../../core/api/shell-data';
import { PresenceService } from '../../../core/presence/presence.service';
import { ThemeService } from '../../../core/theme/theme.service';
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

type FriendsContextView = 'activity';

/**
 * Trang đích của khu tin nhắn trực tiếp — `/channels/@me`.
 *
 * Chỉ lắp ráp và giữ trạng thái lọc; dữ liệu thật nằm trong `FriendsStore`.
 */
@Component({
  selector: 'app-friends-page',
  imports: [
    ActivityPanel,
    AddFriendForm,
    ContextPanel,
    DashboardState,
    EmptyState,
    FriendRequestItem,
    FriendRow,
    FriendsToolbar,
    MatButtonModule,
    MatIconModule,
    SearchField,
    SectionLabel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  templateUrl: './friends.html',
  styleUrl: './friends.css',
})
export class FriendsPage implements OnInit {
  private readonly shell = inject(ShellData);
  private readonly themeService = inject(ThemeService);
  private readonly uiState = inject(DashboardUiState);
  private readonly friendsStore = inject(FriendsStore);
  private readonly presenceService = inject(PresenceService);

  protected readonly tab = signal<FriendsTab>('all');
  protected readonly query = signal('');
  protected readonly theme = this.themeService.mode;
  protected readonly demoEnabled = this.shell.demoEnabled;
  protected readonly contextView = signal<FriendsContextView | null>('activity');
  protected readonly blockingState = this.uiState.blockingState;
  protected readonly connectionState = this.uiState.connectionState;
  protected readonly friendsLoading = this.friendsStore.loading;
  protected readonly friendsError = this.friendsStore.error;
  protected readonly friendFeedback = this.friendsStore.feedback;
  protected readonly sendingRequest = this.friendsStore.sending;
  protected readonly busyIds = this.friendsStore.busyIds;
  protected readonly incomingRequests = this.friendsStore.incomingRequests;
  protected readonly outgoingRequests = this.friendsStore.outgoingRequests;

  protected readonly allFriends = computed<readonly FriendListPerson[]>(() =>
    this.demoEnabled()
      ? this.shell.conversations()
      : this.friendsStore.friends(),
  );

  protected readonly onlineFriends = computed(() =>
    this.allFriends().filter((person) => {
      const presence = this.demoEnabled()
        ? person.presence
        : this.presenceService.getPresence(person.id)();
      return presence !== 'offline';
    }),
  );

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

  protected readonly pendingCount = computed(
    () => this.incomingRequests().length + this.outgoingRequests().length,
  );

  protected readonly sectionLabel = computed(
    () => `${this.tab() === 'online' ? 'Trực tuyến' : 'Tất cả bạn bè'} — ${this.visible().length}`,
  );

  protected readonly contextOpen = computed(() => this.contextView() !== null);
  protected readonly activityExpanded = computed(() => this.contextView() === 'activity');

  ngOnInit(): void {
    void this.friendsStore.load();
  }

  protected toggleActivity(): void {
    if (this.activityExpanded()) {
      this.closeContext();
      return;
    }
    this.contextView.set('activity');
  }

  protected toggleDemoData(): void {
    const wasDemo = this.demoEnabled();
    this.shell.toggleDemoData();
    this.friendsStore.clearFeedback();
    if (wasDemo) {
      void this.friendsStore.load(true);
    }
  }

  protected closeContext(): void {
    this.contextView.set(null);
  }

  protected retryFriends(): void {
    void this.friendsStore.load(true);
  }

  protected sendFriendRequest(username: string): void {
    if (this.demoEnabled()) return;
    void this.friendsStore.sendRequest(username);
  }

  protected acceptRequest(userId: string): void {
    void this.friendsStore.acceptRequest(userId);
  }

  protected deleteRequest(
    request: FriendRequestPerson,
  ): void {
    void this.friendsStore.deleteRequest(request.id, request.direction);
  }

  protected removeFriend(userId: string): void {
    if (this.demoEnabled()) return;
    void this.friendsStore.removeFriend(userId);
  }

  protected clearUiState(): void {
    void this.uiState.clearPreview();
  }
}
