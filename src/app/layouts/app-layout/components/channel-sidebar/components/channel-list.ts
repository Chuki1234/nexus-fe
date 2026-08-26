import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
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
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import {
  ChannelSummary,
  ServerCategorySummary,
} from '../../../../../core/servers/server.models';
import { ServerCapabilitiesService } from '../../../../../core/servers/server-capabilities.service';
import { VoiceRoomService } from '../../../../../features/voice/services/voice-room.service';
import { ChatSocketService } from '../../../../../core/realtime/chat-socket.service';
import { ChannelSettingsModal } from '../../../../../features/settings/modals/channel-settings-modal/channel-settings-modal';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { UnreadBadge } from '../../../../../shared/ui/unread-badge/unread-badge';
import { OverflowMarquee } from '../../../../../shared/ui/overflow-marquee/overflow-marquee';
import { NgTemplateOutlet } from '@angular/common';
import { CreateChannelDialog } from './create-channel-dialog/create-channel-dialog';
import { InviteChannelDialog } from './invite-channel-dialog/invite-channel-dialog';
import { ServersStore } from '../../../../../core/servers/servers.store';
import { ServerVoiceStatesStore } from '../../../../../core/servers/server-voice-states.store';

export interface ChannelGroupViewModel {
  id: string;
  label: string;
  isPrivate?: boolean;
  channels: ChannelSummary[];
  isCategory?: boolean;
}

export interface SidebarRootChannelItem {
  kind: 'channel';
  channel: ChannelSummary;
}

export interface SidebarCategoryItem {
  kind: 'category';
  category: ServerCategorySummary;
  channels: ChannelSummary[];
  isCollapsed: boolean;
  mentionCount: number;
  hasUnread: boolean;
}

export type SidebarItemViewModel = SidebarRootChannelItem | SidebarCategoryItem;

export interface VoiceChannelMemberViewModel {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  isLocal: boolean;
}

/** Danh sách kênh của một server — nội dung cột 2 khi đang mở server. */
@Component({
  selector: 'app-channel-list',
  imports: [
    Avatar,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    CdkDragPreview,
    CdkDropList,
    CdkDropListGroup,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatTooltipModule,
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    UnreadBadge,
    OverflowMarquee,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './channel-list.html',
  styleUrl: './channel-list.css',
})
export class ChannelList implements OnDestroy {
  @ViewChild('categoryMenuTrigger') private readonly categoryMenuTrigger?: MatMenuTrigger;
  @ViewChild('channelMenuTrigger') private readonly channelMenuTrigger?: MatMenuTrigger;
  @ViewChild('memberMenuTrigger') private readonly memberMenuTrigger?: MatMenuTrigger;

  private readonly serversStore = inject(ServersStore);
  private readonly capabilitiesService = inject(ServerCapabilitiesService);
  private readonly voiceStatesStore = inject(ServerVoiceStatesStore);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly voiceRoom = inject(VoiceRoomService);

  readonly serverId = input.required<string>();

  /** Chiều rộng preview khi kéo — được đo từ container cha trước khi CDK tạo preview */
  protected dragPreviewWidth = 220;
  protected readonly channelDragPreviewSize = signal({ width: 220, height: 34 });

  /** Category đang được hover khi kéo channel vào */
  protected readonly activeHoverCategoryId = signal<string | null>(null);

  /** Trạng thái đang kéo channel */
  protected readonly isDraggingChannel = signal<boolean>(false);
  protected readonly dragStartDelay = { touch: 150, mouse: 0 };

  /** Thông báo hỗ trợ Screen Reader */
  protected readonly liveAnnouncement = signal<string>('');

  private dwellTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const id = this.serverId();
      if (id) {
        void this.voiceStatesStore.loadServerVoiceStates(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearDwellTimer();
  }

  /**
   * Đo chiều rộng thực của container trước khi CDK Drag bắt đầu tạo preview.
   */
  protected onPrepDrag(event: Event): void {
    const el = event.currentTarget as HTMLElement;
    const container = el.closest('.channel-drop-list') ?? el.closest('mat-nav-list') ?? el.closest('.channel-sidebar-root-list') ?? el.parentElement;
    if (container) {
      this.dragPreviewWidth = Math.round(container.getBoundingClientRect().width - 4);
    }
  }

  protected onPrepChannelDrag(event: Event): void {
    const row = event.currentTarget as HTMLElement;
    const container = (row.closest('.channel-drop-list') ?? row.closest('.channel-sidebar-root-list')) as HTMLElement | null;
    const rowRect = row.getBoundingClientRect();
    const containerStyle = container ? getComputedStyle(container) : null;
    const horizontalPadding = containerStyle
      ? parseFloat(containerStyle.paddingLeft || '0') + parseFloat(containerStyle.paddingRight || '0')
      : 0;
    const measuredWidth = container
      ? container.getBoundingClientRect().width - horizontalPadding
      : rowRect.width;

    this.channelDragPreviewSize.set({
      width: Math.max(160, Math.round(measuredWidth)),
      height: 34,
    });
  }

  protected onChannelDragStarted(): void {
    this.isDraggingChannel.set(true);
    this.announce('Bắt đầu kéo kênh.');
  }

  protected onChannelDragEnded(): void {
    this.isDraggingChannel.set(false);
    this.clearDwellTimer();
    this.activeHoverCategoryId.set(null);
  }

  protected onCategoryHeaderDropEntered(categoryId: string): void {
    if (!this.isDraggingChannel()) return;
    this.activeHoverCategoryId.set(categoryId);

    if (this.isGroupCollapsed(categoryId)) {
      this.clearDwellTimer();
      this.dwellTimeout = setTimeout(() => {
        if (this.activeHoverCategoryId() === categoryId && this.isDraggingChannel()) {
          this.collapsedGroups.update((current) => ({
            ...current,
            [categoryId]: false,
          }));
        }
      }, 600);
    }
  }

  protected onCategoryHeaderDropExited(categoryId: string): void {
    if (this.activeHoverCategoryId() === categoryId) {
      this.activeHoverCategoryId.set(null);
    }
    this.clearDwellTimer();
  }

  protected onCategoryHeaderMouseEnter(categoryId: string): void {
    if (this.isDraggingChannel()) {
      this.onCategoryHeaderDropEntered(categoryId);
    }
  }

  protected onCategoryHeaderMouseLeave(categoryId: string): void {
    this.onCategoryHeaderDropExited(categoryId);
  }

  protected onCategoryHeaderDrop(
    event: CdkDragDrop<any>,
    targetCategoryId: string,
  ): void {
    if (!this.canManageChannels()) return;
    this.onChannelDragEnded();

    const data = event.item.data as { kind?: string; channel?: ChannelSummary } | ChannelSummary;
    const channel = (data as any)?.channel ?? (('type' in (data as any)) ? data : null);
    if (!channel) return;

    const serverId = this.serverId();
    const targetCat = this.serversStore.categoriesOf(serverId).find((c) => c.id === targetCategoryId);
    const targetName = targetCat?.name ?? 'danh mục';

    this.serversStore.moveChannel(serverId, channel.id, targetCategoryId, 0);
    this.announce(`Đã chuyển kênh ${channel.name} vào danh mục ${targetName}.`);
  }

  private clearDwellTimer(): void {
    if (this.dwellTimeout !== null) {
      clearTimeout(this.dwellTimeout);
      this.dwellTimeout = null;
    }
  }

  private announce(message: string): void {
    this.liveAnnouncement.set('');
    setTimeout(() => {
      this.liveAnnouncement.set(message);
    }, 50);
  }

  protected readonly voiceConnectedChannelId = this.voiceRoom.currentChannelId;
  protected readonly voiceParticipants = this.voiceRoom.allParticipants;

  /**
   * Predicates để bảo đảm CDK DropList chỉ chấp nhận đúng loại dữ liệu kéo thả:
   */
  protected readonly isRootEnterPredicate = (drag: CdkDrag<unknown>): boolean => {
    const data = drag.data as { kind?: string; channel?: ChannelSummary; category?: ServerCategorySummary } | undefined;
    if (!data) return false;
    if (data.kind === 'category') return true;

    const isChannel = data.kind === 'channel'
      || ('type' in (data as any) && !('userId' in (data as any)));

    // A nested child list geometrically sits inside the root list. Reject its
    // channel here so the parent cannot steal the drag from the child. Root
    // channels may still sort in their own initial container.
    if (isChannel) {
      return drag.dropContainer?.id === 'channel-sidebar-root-list';
    }

    return false;
  };

  protected readonly isCategoryChildEnterPredicate = (drag: CdkDrag<unknown>): boolean => {
    const data = drag.data as { kind?: string; channel?: ChannelSummary; category?: ServerCategorySummary } | undefined;
    if (!data) return false;
    if (data.kind === 'category') return false;
    if (data.kind === 'channel') return true;
    if ('type' in (data as any) && !('userId' in (data as any))) return true;
    return false;
  };

  protected readonly isCategoryPredicate = (drag: CdkDrag<unknown>): boolean => {
    const data = drag.data as Record<string, unknown> | undefined;
    return !!data && (data['kind'] === 'category' || ('channels' in data && !('type' in data)));
  };

  protected readonly isChannelPredicate = (drag: CdkDrag<unknown>): boolean => {
    const data = drag.data as Record<string, unknown> | undefined;
    return !!data && (data['kind'] === 'channel' || ('type' in data && !('userId' in data)));
  };

  protected readonly isVoiceMemberPredicate = (drag: CdkDrag<unknown>): boolean => {
    const data = drag.data as Record<string, unknown> | undefined;
    return !!data && 'userId' in data;
  };

  /** Quản lý quyền hạn capabilities của server */
  protected readonly capabilities = computed(() => {
    const id = this.serverId();
    if (!id) return null;
    return this.capabilitiesService.capabilitiesMap().get(id) ?? null;
  });

  protected readonly isOwner = computed(() => this.capabilities()?.isOwner ?? false);
  protected readonly canManageChannels = computed(() => this.capabilities()?.canManageChannels ?? false);
  protected readonly canInviteMembers = computed(() => this.capabilities()?.canInviteMembers ?? false);

  /** Quản lý trạng thái thu gọn/mở rộng từng nhóm kênh */
  protected readonly collapsedGroups = signal<Record<string, boolean>>({});

  /** Tọa độ hiển thị Context Menu tại vị trí con trỏ chuột */
  protected readonly contextMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  /** Nhóm, Kênh hoặc Thành viên thoại đang được chọn bởi chuột phải */
  protected readonly selectedGroup = signal<ChannelGroupViewModel | null>(null);
  protected readonly selectedChannel = signal<ChannelSummary | null>(null);
  protected readonly selectedMember = signal<VoiceChannelMemberViewModel | null>(null);
  protected readonly selectedMemberChannel = signal<ChannelSummary | null>(null);

  protected readonly allVoiceChannels = computed(() =>
    this.serversStore.channelsOf(this.serverId()).filter((c) => c.type === 'voice'),
  );

  protected otherVoiceChannels(channelId?: string): ChannelSummary[] {
    return this.allVoiceChannels().filter((c) => c.id !== channelId);
  }

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

  /**
   * Danh sách phần tử cấp gốc (Category hoặc Root Channel) theo đúng thứ tự canonical layout.
   */
  protected readonly rootItems = computed<SidebarItemViewModel[]>(() => {
    const srvId = this.serverId();
    if (!srvId) return [];

    const layout = this.serversStore.getServerLayout(srvId);
    const channels = this.serversStore.channelsOf(srvId);
    const channelMap = new Map(channels.map((c) => [c.id, c]));
    const categories = this.serversStore.categoriesOf(srvId);
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const result: SidebarItemViewModel[] = [];

    for (const item of layout.rootItems) {
      if (item.kind === 'channel') {
        const ch = channelMap.get(item.id);
        if (ch) {
          result.push({
            kind: 'channel',
            channel: ch,
          });
        }
      } else if (item.kind === 'category') {
        const cat = catMap.get(item.id);
        if (cat) {
          const childIds = layout.categoryChannels[item.id] ?? [];
          const childChannels: ChannelSummary[] = [];
          for (const chId of childIds) {
            const ch = channelMap.get(chId);
            if (ch) {
              childChannels.push(ch);
            }
          }

          const isCollapsed = this.isGroupCollapsed(cat.id);
          const mentionCount = childChannels.reduce((acc, c) => acc + (c.mentionCount || 0), 0);
          const hasUnread = childChannels.some((c) => c.unread || (c.mentionCount || 0) > 0);

          result.push({
            kind: 'category',
            category: cat,
            channels: childChannels,
            isCollapsed,
            mentionCount,
            hasUnread,
          });
        }
      }
    }

    return result;
  });

  /**
   * CDK resolves connected drop lists in declaration order. Because the root
   * list geometrically contains every category list, channel targets are
   * connected explicitly and root insertion uses dedicated, visible slots.
   */
  protected readonly channelDropListConnections = computed<string[]>(() => {
    const categoryIds = this.rootItems()
      .filter((item): item is Extract<SidebarItemViewModel, { kind: 'category' }> => item.kind === 'category')
      .map((item) => item.category.id);

    return [
      ...categoryIds.map((id) => `channel-group-${id}`),
      ...categoryIds.map((id) => `category-header-drop-${id}`),
      ...Array.from(
        { length: this.rootItems().length + 1 },
        (_, index) => `root-channel-drop-slot-${index}`,
      ),
    ];
  });

  /** Kênh chưa phân loại (giữ để tương thích ngược với code cũ nếu có) */
  protected readonly uncategorizedGroup = computed<ChannelGroupViewModel | null>(() => {
    const uncatChannels = this.rootItems()
      .filter((i): i is SidebarRootChannelItem => i.kind === 'channel')
      .map((i) => i.channel);

    if (uncatChannels.length === 0) return null;
    return {
      id: 'cat-uncategorized',
      label: '',
      channels: uncatChannels,
      isCategory: false,
    };
  });

  /** Danh sách category groups (tương thích ngược) */
  protected readonly categoryGroups = computed<ChannelGroupViewModel[]>(() => {
    return this.rootItems()
      .filter((i): i is SidebarCategoryItem => i.kind === 'category')
      .map((i) => ({
        id: i.category.id,
        label: i.category.name,
        isPrivate: i.category.isPrivate,
        channels: i.channels,
        isCategory: true,
      }));
  });

  /** Nhóm kênh toàn diện (tương thích ngược) */
  protected readonly groups = computed<ChannelGroupViewModel[]>(() => {
    const items = this.rootItems();
    const res: ChannelGroupViewModel[] = [];
    for (const item of items) {
      if (item.kind === 'category') {
        res.push({
          id: item.category.id,
          label: item.category.name,
          isPrivate: item.category.isPrivate,
          channels: item.channels,
          isCategory: true,
        });
      } else {
        res.push({
          id: item.channel.id,
          label: item.channel.name,
          channels: [item.channel],
          isCategory: false,
        });
      }
    }
    return res;
  });

  /**
   * Tính danh sách kênh hiển thị:
   * Khi Category đóng, ẩn toàn bộ kênh con.
   */
  protected visibleChannelsOf(group: ChannelGroupViewModel | SidebarCategoryItem): ChannelSummary[] {
    const groupId = 'category' in group ? group.category.id : group.id;
    const isCollapsed = this.isGroupCollapsed(groupId);
    if (isCollapsed) {
      return [];
    }
    return group.channels;
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

  protected toggleGroup(groupId: string, forceState?: boolean): void {
    this.collapsedGroups.update((current) => ({
      ...current,
      [groupId]: forceState !== undefined ? forceState : !current[groupId],
    }));
  }

  protected getGroupMentionCount(group: ChannelGroupViewModel | SidebarCategoryItem): number {
    return group.channels.reduce((acc, ch) => acc + (ch.mentionCount || 0), 0);
  }

  protected getGroupHasUnread(group: ChannelGroupViewModel | SidebarCategoryItem): boolean {
    return group.channels.some((ch) => ch.unread || (ch.mentionCount || 0) > 0);
  }

  protected getVoiceChannelMembers(channelId: string): VoiceChannelMemberViewModel[] {
    const serverId = this.serverId();
    const states = this.voiceStatesStore.getChannelVoiceMembers(serverId, channelId);
    const isCurrentlyConnected = this.voiceConnectedChannelId() === channelId;
    const localPart = isCurrentlyConnected ? this.voiceRoom.localParticipant() : null;
    const remotes = isCurrentlyConnected ? this.voiceRoom.remoteParticipants() : [];

    if (isCurrentlyConnected && (localPart || remotes.length > 0)) {
      const liveList: VoiceChannelMemberViewModel[] = [];
      if (localPart) {
        liveList.push({
          userId: localPart.identity,
          name: localPart.name,
          avatarUrl: localPart.avatarUrl ?? null,
          isMuted: localPart.isMuted,
          isCameraOn: localPart.isCameraOn,
          isScreenSharing: localPart.isScreenSharing,
          isSpeaking: localPart.isSpeaking,
          isLocal: true,
        });
      }
      for (const r of remotes) {
        liveList.push({
          userId: r.identity,
          name: r.name,
          avatarUrl: r.avatarUrl ?? null,
          isMuted: r.isMuted,
          isCameraOn: r.isCameraOn,
          isScreenSharing: r.isScreenSharing,
          isSpeaking: r.isSpeaking,
          isLocal: false,
        });
      }
      return liveList;
    }

    return states.map((s) => ({
      userId: s.userId,
      name: s.displayName || s.name || s.username,
      avatarUrl: s.avatarUrl,
      isMuted: s.isMuted,
      isCameraOn: s.isCameraOn,
      isScreenSharing: s.isScreenSharing,
      isSpeaking: false,
      isLocal: false,
    }));
  }

  protected onWatchStream(
    event: Event,
    channel: ChannelSummary,
    _member: VoiceChannelMemberViewModel,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    void this.router.navigate(['/channels', this.serverId(), channel.id]);
    if (this.voiceConnectedChannelId() !== channel.id) {
      void this.voiceRoom.joinRoom(this.serverId(), channel.id, channel.name);
    }
  }

  protected openCreateChannelDialog(group?: ChannelGroupViewModel | SidebarCategoryItem | 'text' | 'voice', event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    let defaultType: 'text' | 'voice' = 'text';
    let categoryId: string | undefined;
    let categoryName: string | undefined;

    if (typeof group === 'string') {
      defaultType = group;
      categoryId = group === 'voice' ? 'cat-voice' : 'cat-text';
    } else if (group && 'category' in group) {
      categoryId = group.category.id;
      categoryName = group.category.name;
      defaultType = group.category.id === 'cat-voice' ? 'voice' : 'text';
    } else if (group && 'id' in group) {
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
    group: ChannelGroupViewModel | SidebarCategoryItem,
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

    const vm: ChannelGroupViewModel = 'category' in group
      ? {
          id: group.category.id,
          label: group.category.name,
          isPrivate: group.category.isPrivate,
          channels: group.channels,
          isCategory: true,
        }
      : group;

    this.selectedGroup.set(vm);
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
    for (const item of this.rootItems()) {
      if (item.kind === 'category') {
        allCollapsed[item.category.id] = true;
      }
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
  }

  protected markChannelAsRead(channel?: ChannelSummary | null): void {
    const target = channel ?? this.selectedChannel();
    if (!target) return;
  }

  protected createChannelOfSameType(channel?: ChannelSummary | null): void {
    const target = channel ?? this.selectedChannel();
    const type = target?.type === 'voice' ? 'voice' : 'text';
    const categoryId = target?.categoryId ?? (type === 'voice' ? 'cat-voice' : 'cat-text');
    this.openCreateChannelDialog({ id: categoryId, label: type === 'voice' ? 'Kênh thoại' : 'Kênh chữ', channels: [] });
  }

  protected onActionSeam(action: string, target?: unknown): void {}

  /**
   * Xử lý thả phần tử tại cấp Root (Category hoặc Root Channel).
   */
  protected onRootDrop(
    event: CdkDragDrop<any>,
  ): void {
    if (!this.canManageChannels()) return;
    this.onChannelDragEnded();

    const data = event.item.data as { kind?: string; channel?: ChannelSummary; category?: ServerCategorySummary } | ChannelSummary | ChannelGroupViewModel;
    const serverId = this.serverId();

    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) return;
      this.serversStore.moveRootItem(serverId, event.previousIndex, event.currentIndex);
      const name = (data as any)?.category?.name ?? (data as any)?.channel?.name ?? (data as any)?.name ?? 'phần tử';
      this.announce(`Đã đổi vị trí ${name}.`);
      return;
    }

    // Kéo từ category ra root list
    const channel = (data as any)?.channel ?? (('type' in (data as any)) ? data : null);
    if (channel) {
      this.serversStore.moveChannel(serverId, channel.id, null, event.currentIndex, event.currentIndex);
      this.announce(`Đã đưa kênh ${channel.name} ra cấp máy chủ.`);
    }
  }

  /**
   * Places a channel between root items without letting the geometrically
   * larger root list intercept drags that belong to nested category lists.
   */
  protected onRootChannelSlotDrop(
    event: CdkDragDrop<any>,
    targetRootIndex: number,
  ): void {
    if (!this.canManageChannels()) return;
    this.onChannelDragEnded();

    const data = event.item.data as { kind?: string; channel?: ChannelSummary } | ChannelSummary;
    const channel = (data as any)?.channel ?? (('type' in (data as any)) ? data : null);
    if (!channel) return;

    const serverId = this.serverId();
    const layout = this.serversStore.getServerLayout(serverId);
    const sourceRootIndex = layout.rootItems.findIndex(
      (item) => item.kind === 'channel' && item.id === channel.id,
    );
    const adjustedTargetIndex = sourceRootIndex >= 0 && sourceRootIndex < targetRootIndex
      ? targetRootIndex - 1
      : targetRootIndex;

    this.serversStore.moveChannel(
      serverId,
      channel.id,
      null,
      adjustedTargetIndex,
      adjustedTargetIndex,
    );
    this.announce(`Đã đưa kênh ${channel.name} ra cấp máy chủ.`);
  }

  /**
   * Xử lý thả kênh vào danh mục (sắp xếp con hoặc chuyển danh mục).
   */
  protected onCategoryChildDrop(
    event: CdkDragDrop<any>,
    targetCategoryId: string,
  ): void {
    if (!this.canManageChannels()) return;
    this.onChannelDragEnded();

    const data = event.item.data as { kind?: string; channel?: ChannelSummary } | ChannelSummary;
    const channel = (data as any)?.channel ?? (('type' in (data as any)) ? data : null);
    if (!channel) return;

    const serverId = this.serverId();
    const targetCat = this.serversStore.categoriesOf(serverId).find((c) => c.id === targetCategoryId);
    const targetName = targetCat?.name ?? 'danh mục';

    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) return;
      this.serversStore.reorderCategoryChildren(serverId, targetCategoryId, event.previousIndex, event.currentIndex);
      this.announce(`Đã đổi vị trí kênh ${channel.name} trong danh mục ${targetName}.`);
      return;
    }

    this.serversStore.moveChannel(serverId, channel.id, targetCategoryId, event.currentIndex);
    this.announce(`Đã chuyển kênh ${channel.name} vào danh mục ${targetName}.`);
  }

  /**
   * Tương thích ngược với onCategoryDrop
   */
  protected onCategoryDrop(
    event: CdkDragDrop<ChannelGroupViewModel[], ChannelGroupViewModel[], ChannelGroupViewModel>,
  ): void {
    if (!this.canManageChannels()) return;
    if (event.previousIndex === event.currentIndex) return;

    this.serversStore.moveRootItem(this.serverId(), event.previousIndex, event.currentIndex);
  }

  /**
   * Tương thích ngược với onChannelDrop
   */
  protected onChannelDrop(
    event: CdkDragDrop<ChannelGroupViewModel, ChannelGroupViewModel, ChannelSummary>,
  ): void {
    if (!this.canManageChannels()) return;
    const channel = event.item.data;
    if (!channel) return;

    const targetGroup = event.container.data;
    const targetCategoryId = !targetGroup || targetGroup.id === 'cat-uncategorized' || targetGroup.isCategory === false
      ? null
      : targetGroup.id;

    this.serversStore.moveChannel(this.serverId(), channel.id, targetCategoryId, event.currentIndex);
  }

  /**
   * Mở Context Menu khi click chuột phải vào thành viên thoại.
   */
  protected onMemberContextMenu(
    event: MouseEvent | KeyboardEvent,
    member: VoiceChannelMemberViewModel,
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
      const rect = target?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    this.selectedMember.set(member);
    this.selectedMemberChannel.set(channel);
    this.contextMenuPosition.set({ x, y });
    this.memberMenuTrigger?.openMenu();
  }

  protected onMoveMemberToChannel(targetUserId: string, targetChannelId: string): void {
    this.chatSocket.moveVoiceMember(this.serverId(), targetUserId, targetChannelId);
  }

  protected onKickVoiceMember(targetUserId: string): void {
    this.chatSocket.kickVoiceMember(this.serverId(), targetUserId);
  }

  protected onToggleServerMute(targetUserId: string, currentMuted: boolean): void {
    this.chatSocket.serverMuteVoiceMember(this.serverId(), targetUserId, !currentMuted);
  }

  protected onMemberVolumeChange(userId: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.voiceRoom.setUserVolume(userId, parseFloat(target.value));
    }
  }

  protected onViewMemberProfile(member: VoiceChannelMemberViewModel): void {}

  /**
   * Kéo thả thành viên sang kênh thoại khác (Dành cho Chủ Server / Admin).
   */
  protected onVoiceMemberDrop(
    event: CdkDragDrop<ChannelSummary, ChannelSummary, VoiceChannelMemberViewModel>,
    targetChannel: ChannelSummary,
  ): void {
    if (!this.isOwner() || targetChannel.type !== 'voice') {
      return;
    }

    const member = event.item.data;
    if (!member) return;

    const sourceChannel = event.previousContainer.data;
    if (sourceChannel?.id === targetChannel.id) {
      return;
    }

    this.chatSocket.moveVoiceMember(this.serverId(), member.userId, targetChannel.id);
  }
}



