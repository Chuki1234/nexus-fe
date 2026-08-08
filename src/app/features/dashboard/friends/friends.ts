import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { ConversationSummary } from '../../../core/api/shell-data';
import { ShellData } from '../../../core/api/shell-data';
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

/**
 * Trang đích của khu tin nhắn trực tiếp — `/channels/@me`.
 *
 * Chỉ lắp ráp và giữ trạng thái lọc; phần hiển thị nằm ở `components/`.
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
    SearchField,
    SectionLabel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  templateUrl: './friends.html',
  styleUrl: './friends.css',
})
export class FriendsPage {
  private readonly shell = inject(ShellData);
  private readonly themeService = inject(ThemeService);
  private readonly uiState = inject(DashboardUiState);

  protected readonly tab = signal<FriendsTab>('all');
  protected readonly query = signal('');
  protected readonly theme = this.themeService.mode;
  protected readonly demoEnabled = this.shell.demoEnabled;
  protected readonly pendingRequests = signal<ConversationSummary[]>([]);
  protected readonly contextOpen = signal(false);
  protected readonly blockingState = this.uiState.blockingState;
  protected readonly connectionState = this.uiState.connectionState;

  protected readonly onlineFriends = computed(() =>
    this.shell.conversations().filter((person) => person.presence !== 'offline'),
  );

  protected readonly visible = computed(() => {
    const needle = this.query().trim().toLowerCase();
    const people = this.tab() === 'online' ? this.onlineFriends() : this.shell.conversations();
    return people.filter((person) => !needle || person.name.toLowerCase().includes(needle));
  });

  protected readonly sectionLabel = computed(
    () => `${this.tab() === 'online' ? 'Trực tuyến' : 'Tất cả bạn bè'} — ${this.visible().length}`,
  );

  protected readonly activityExpanded = computed(() => this.contextOpen());

  protected toggleActivity(): void {
    if (this.activityExpanded()) {
      this.closeContext();
      return;
    }

    this.contextOpen.set(true);
  }

  protected toggleDemoData(): void {
    this.shell.toggleDemoData();
  }

  protected closeContext(): void {
    this.contextOpen.set(false);
  }

  protected removeRequest(id: string): void {
    this.pendingRequests.update((requests) => requests.filter((request) => request.id !== id));
  }

  protected clearUiState(): void {
    void this.uiState.clearPreview();
  }
}
