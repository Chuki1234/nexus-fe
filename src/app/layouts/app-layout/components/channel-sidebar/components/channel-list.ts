import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  ViewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter, map } from 'rxjs';
import {
  CdkDrag,
  type CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import {
  ChannelSummary,
  ServerCategorySummary,
} from '../../../../../core/servers/server.models';
import { ServerCapabilitiesService } from '../../../../../core/servers/server-capabilities.service';
import { VoiceRoomService } from '../../../../../features/voice/services/voice-room.service';
import { ChannelSettingsModal } from '../../../../../features/settings/modals/channel-settings-modal/channel-settings-modal';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { UnreadBadge } from '../../../../../shared/ui/unread-badge/unread-badge';
import { CreateChannelDialog } from './create-channel-dialog/create-channel-dialog';
import { InviteChannelDialog } from './invite-channel-dialog/invite-channel-dialog';
import { ServersStore } from '../../../../../core/servers/servers.store';

export interface ChannelGroupViewModel {
  id: string;
  label: string;
  isPrivate?: boolean;
  channels: ChannelSummary[];
}

/** Danh sách kênh của một server — nội dung cột 2 khi đang mở server. */
@Component({
  selector: 'app-channel-list',
  imports: [
    Avatar,
    CdkDrag,
    CdkDragPlaceholder,
    CdkDropList,
    CdkDropListGroup,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatTooltipModule,
    RouterLink,
    RouterLinkActive,
    UnreadBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './channel-list.html',
  styleUrl: './channel-list.css',
})
export class ChannelList {
  @ViewChild('categoryMenuTrigger') private readonly categoryMenuTrigger?: MatMenuTrigger;
  @ViewChild('channelMenuTrigger') private readonly channelMenuTrigger?: MatMenuTrigger;

  private readonly serversStore = inject(ServersStore);
  private readonly capabilitiesService = inject(ServerCapabilitiesService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly voiceRoom = inject(VoiceRoomService);

  readonly serverId = input.required<string>();

  protected readonly voiceConnectedChannelId = this.voiceRoom.currentChannelId;
  protected readonly voiceParticipants = this.voiceRoom.allParticipants;

  /** Quản lý quyền hạn capabilities của server */
  protected readonly capabilities = computed(() => {
    const id = this.serverId();
    if (!id) return null;
    return this.capabilitiesService.capabilitiesMap().get(id) ?? null;
  });

  protected readonly canManageChannels = computed(() => this.capabilities()?.canManageChannels ?? false);
  protected readonly canInviteMembers = computed(() => this.capabilities()?.canInviteMembers ?? false);

  /** Quản lý trạng thái thu gọn/mở rộng từng nhóm kênh */
  protected readonly collapsedGroups = signal<Record<string, boolean>>({});

  /** Tọa độ hiển thị Context Menu tại vị trí con trỏ chuột */
  protected readonly contextMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  /** Nhóm hoặc Kênh đang được chọn bởi chuột phải */
  protected readonly selectedGroup = signal<ChannelGroupViewModel | null>(null);
  protected readonly selectedChannel = signal<ChannelSummary | null>(null);

  /** Lắng nghe route để xác định kênh đang mở hiện tại */
  private readonly routeChannelId = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.readChannelId()),
    ),
    { initialValue: this.readChannelId() },
  );

  protected readonly activeChannelId = computed(() => {
    const fromSignal = this.routeChannelId();
    if (fromSignal) {
      return fromSignal;
    }
    return this.readChannelId();
  });

  protected readonly serverName = computed(
    () => this.serversStore.serverOf(this.serverId())?.name ?? 'Máy chủ',
  );

  /** Nhóm kênh theo danh mục thật của server (hỗ trợ cả text và voice trong cùng 1 danh mục) */
  protected readonly groups = computed<ChannelGroupViewModel[]>(() => {
    const serverId = this.serverId();
    const channels = this.serversStore.channelsOf(serverId);
    const customCategories = this.serversStore.categoriesOf(serverId);

    const defaultCategories: ServerCategorySummary[] = [
      { id: 'cat-text', name: 'Kênh chữ' },
      { id: 'cat-voice', name: 'Kênh thoại' },
    ];

    const allCategories: ServerCategorySummary[] =
      customCategories.length > 0 ? customCategories : defaultCategories;

    const result: ChannelGroupViewModel[] = [];

    for (const cat of allCategories) {
      const catChannels = channels.filter((c) => {
        if (c.categoryId) {
          return c.categoryId === cat.id;
        }
        if (cat.id === 'cat-voice') {
          return c.type === 'voice';
        }
        if (cat.id === 'cat-text') {
          return c.type !== 'voice';
        }
        return false;
      });

      result.push({
        id: cat.id,
        label: cat.name,
        isPrivate: cat.isPrivate,
        channels: catChannels,
      });
    }

    const accountedIds = new Set(result.flatMap((g) => g.channels.map((c) => c.id)));
    const orphaned = channels.filter((c) => !accountedIds.has(c.id));
    if (orphaned.length > 0) {
      result.push({
        id: 'cat-other',
        label: 'Kênh khác',
        channels: orphaned,
      });
    }

    if (customCategories.length === 0) {
      return result.filter((g) => g.channels.length > 0);
    }

    return result;
  });

  /**
   * Tính danh sách kênh hiển thị:
   * - Nếu nhóm mở: hiện tất cả kênh trong nhóm.
   * - Nếu nhóm thu gọn: chỉ hiện duy nhất kênh mà người dùng đang mở (nếu thuộc nhóm này).
   */
  protected visibleChannelsOf(group: ChannelGroupViewModel): ChannelSummary[] {
    const isCollapsed = this.isGroupCollapsed(group.id);
    if (!isCollapsed) {
      return group.channels;
    }
    const activeId = this.activeChannelId();
    if (!activeId) {
      return [];
    }
    return group.channels.filter((c) => c.id === activeId);
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
    const url = this.router.url;
    const match = url?.match(/\/channels\/[^/]+\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  protected isGroupCollapsed(groupId: string): boolean {
    return !!this.collapsedGroups()[groupId];
  }

  protected toggleGroup(groupId: string): void {
    this.collapsedGroups.update((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }

  protected openCreateChannelDialog(group?: ChannelGroupViewModel | 'text' | 'voice', event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    let defaultType: 'text' | 'voice' = 'text';
    let categoryId: string | undefined;
    let categoryName: string | undefined;

    if (typeof group === 'string') {
      defaultType = group;
      categoryId = group === 'voice' ? 'cat-voice' : 'cat-text';
    } else if (group) {
      categoryId = group.id;
      categoryName = group.label;
      defaultType = group.id === 'cat-voice' ? 'voice' : 'text';
    }

    this.dialog.open(CreateChannelDialog, {
      data: {
        serverId: this.serverId(),
        serverName: this.serverName(),
        defaultType,
        categoryId,
        categoryName,
      },
      panelClass: 'nexus-dialog-overlay',
      autoFocus: false,
    });
  }

  protected onInvite(event: Event, channel: ChannelSummary): void {
    event.preventDefault();
    event.stopPropagation();

    this.dialog.open(InviteChannelDialog, {
      data: {
        serverId: this.serverId(),
        serverName: this.serverName(),
        channelName: channel.name,
        channelId: channel.id,
      },
      panelClass: 'nexus-dialog-overlay',
      autoFocus: false,
    });
  }

  protected onChannelSettings(event: Event, channel: ChannelSummary): void {
    event.preventDefault();
    event.stopPropagation();

    this.dialog.open(ChannelSettingsModal, {
      data: {
        serverId: this.serverId(),
        channel,
      },
      panelClass: 'nexus-fullscreen-dialog-overlay',
      maxWidth: '100vw',
      maxHeight: '100vh',
      width: '100vw',
      height: '100vh',
      autoFocus: false,
    });
  }

  protected onOpenVoiceChat(event: Event, channel: ChannelSummary): void {
    event.preventDefault();
    event.stopPropagation();

    this.voiceRoom.openChatDrawer();
    void this.router.navigate(['/channels', this.serverId(), channel.id], {
      queryParams: { chat: 'open' },
    });
  }

  protected onCategoryContextMenu(
    event: MouseEvent | KeyboardEvent,
    group: ChannelGroupViewModel,
  ): void {
    event.preventDefault();
    event.stopPropagation();

    let x = 0;
    let y = 0;
    if (event instanceof MouseEvent) {
      x = event.clientX;
      y = event.clientY;
    } else {
      const target = event.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    this.selectedGroup.set(group);
    this.contextMenuPosition.set({ x, y });
    this.categoryMenuTrigger?.openMenu();
  }

  protected onChannelContextMenu(
    event: MouseEvent | KeyboardEvent,
    channel: ChannelSummary,
  ): void {
    event.preventDefault();
    event.stopPropagation();

    let x = 0;
    let y = 0;
    if (event instanceof MouseEvent) {
      x = event.clientX;
      y = event.clientY;
    } else {
      const target = event.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    this.selectedChannel.set(channel);
    this.contextMenuPosition.set({ x, y });
    this.channelMenuTrigger?.openMenu();
  }

  protected collapseAllGroups(): void {
    const allCollapsed: Record<string, boolean> = {};
    for (const group of this.groups()) {
      allCollapsed[group.id] = true;
    }
    this.collapsedGroups.set(allCollapsed);
  }

  protected copyChannelLink(channel?: ChannelSummary | null): void {
    const target = channel ?? this.selectedChannel();
    if (!target) return;

    const url = `${window.location.origin}/channels/${this.serverId()}/${target.id}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => undefined);
    }
  }

  protected markGroupAsRead(group?: { id?: string; label?: string } | null): void {
    const target = group ?? this.selectedGroup();
    if (!target) return;
    // Integration seam: Đánh dấu đã đọc toàn bộ kênh trong nhóm
  }

  protected markChannelAsRead(channel?: ChannelSummary | null): void {
    const target = channel ?? this.selectedChannel();
    if (!target) return;
    // Integration seam: Đánh dấu đã đọc kênh
  }

  protected createChannelOfSameType(channel?: ChannelSummary | null): void {
    const target = channel ?? this.selectedChannel();
    const type = target?.type === 'voice' ? 'voice' : 'text';
    const categoryId = target?.categoryId ?? (type === 'voice' ? 'cat-voice' : 'cat-text');
    this.openCreateChannelDialog({ id: categoryId, label: type === 'voice' ? 'Kênh thoại' : 'Kênh chữ', channels: [] });
  }

  protected onActionSeam(action: string, target?: unknown): void {
    // Integration seam cho các tính năng nâng cao (Ghim, Trùng lặp, Xóa, Tắt âm, Thông báo)
  }

  /**
   * Xử lý khi người dùng thả kênh (sắp xếp vị trí hoặc chuyển sang danh mục khác).
   */
  protected onChannelDrop(
    event: CdkDragDrop<ChannelGroupViewModel, ChannelGroupViewModel, ChannelSummary>,
  ): void {
    if (!this.canManageChannels()) {
      return;
    }

    const channel = event.item.data;
    if (!channel) return;

    const sourceGroup = event.previousContainer.data;
    const targetGroup = event.container.data;

    // Nếu cùng danh mục và cùng vị trí thì bỏ qua
    if (
      sourceGroup.id === targetGroup.id &&
      event.previousIndex === event.currentIndex
    ) {
      return;
    }

    this.serversStore.moveChannel(
      this.serverId(),
      channel.id,
      targetGroup.id,
      event.currentIndex,
    );
  }
}


