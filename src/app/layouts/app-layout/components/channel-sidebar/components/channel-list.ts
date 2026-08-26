import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
export class ChannelList {
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

  constructor() {
    effect(() => {
      const id = this.serverId();
      if (id) {
        void this.voiceStatesStore.loadServerVoiceStates(id);
      }
    });
  }

  /**
   * Đo chiều rộng thực của container channel-drop-list (bị giới hạn bởi sidebar)
   * trước khi CDK Drag bắt đầu tạo preview.
   * pointerdown/mousedown fires TRƯỚC cdkDragStarted → binding đã có giá trị đúng.
   */
  protected onPrepDrag(event: Event): void {
    const el = event.currentTarget as HTMLElement;
    const container = el.closest('.channel-drop-list') ?? el.closest('mat-nav-list') ?? el.parentElement;
    if (container) {
      this.dragPreviewWidth = Math.round(container.getBoundingClientRect().width - 4);
    }
  }
  protected onPrepChannelDrag(event: Event): void {
    const row = event.currentTarget as HTMLElement;
    const container = row.closest('.channel-drop-list') as HTMLElement | null;
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

  protected readonly voiceConnectedChannelId = this.voiceRoom.currentChannelId;
  protected readonly voiceParticipants = this.voiceRoom.allParticipants;

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

  /** Kênh chưa phân loại (không thuộc danh mục nào) — luôn nằm ở ĐẦU TIÊN trên cùng (trên cả danh mục đầu tiên) */
  protected readonly uncategorizedGroup = computed<ChannelGroupViewModel | null>(() => {
    const serverId = this.serverId();
    const channels = this.serversStore.channelsOf(serverId);
    const customCategories = this.serversStore.categoriesOf(serverId);

    let uncategorizedChannels: ChannelSummary[] = [];

    if (customCategories.length > 0) {
      const customCategoryIds = new Set(customCategories.map((c) => c.id));
      uncategorizedChannels = channels.filter(
        (c) => !c.categoryId || !customCategoryIds.has(c.categoryId),
      );
    } else {
      // Khi server chỉ có các danh mục mặc định (Kênh chữ & Kênh thoại):
      // Chỉ những kênh được đánh dấu 'cat-uncategorized' mới tách riêng lên top
      uncategorizedChannels = channels.filter(
        (c) => c.categoryId === 'cat-uncategorized',
      );
    }

    if (uncategorizedChannels.length === 0) {
      return null;
    }

    return {
      id: 'cat-uncategorized',
      label: '',
      channels: uncategorizedChannels,
      isCategory: false,
    };
  });

  /** Danh sách các danh mục (Categories) của server — hỗ trợ kéo thả sắp xếp thứ tự */
  protected readonly categoryGroups = computed<ChannelGroupViewModel[]>(() => {
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
        if (c.categoryId === 'cat-uncategorized') {
          return false;
        }
        if (c.categoryId) {
          return c.categoryId === cat.id;
        }
        if (customCategories.length === 0) {
          if (cat.id === 'cat-voice') {
            return c.type === 'voice';
          }
          if (cat.id === 'cat-text') {
            return c.type !== 'voice';
          }
        }
        return false;
      });

      result.push({
        id: cat.id,
        label: cat.name,
        isPrivate: cat.isPrivate,
        channels: catChannels,
        isCategory: true,
      });
    }

    if (customCategories.length === 0) {
      return result.filter((g) => g.channels.length > 0);
    }

    return result;
  });

  /** Nhóm kênh toàn diện (Kênh không có danh mục ở đầu + các Danh mục bên dưới) */
  protected readonly groups = computed<ChannelGroupViewModel[]>(() => {
    const uncat = this.uncategorizedGroup();
    const cats = this.categoryGroups();
    return uncat ? [uncat, ...cats] : cats;
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

  protected getGroupMentionCount(group: ChannelGroupViewModel): number {
    return group.channels.reduce((acc, ch) => acc + (ch.mentionCount || 0), 0);
  }

  protected getGroupHasUnread(group: ChannelGroupViewModel): boolean {
    return group.channels.some((ch) => ch.unread || (ch.mentionCount || 0) > 0);
  }

  protected getVoiceChannelMembers(channelId: string): VoiceChannelMemberViewModel[] {
    const serverId = this.serverId();
    const states = this.voiceStatesStore.getChannelVoiceMembers(serverId, channelId);
    const isCurrentlyConnected = this.voiceConnectedChannelId() === channelId;
    const localPart = isCurrentlyConnected ? this.voiceRoom.localParticipant() : null;
    const remotes = isCurrentlyConnected ? this.voiceRoom.remoteParticipants() : [];

    // Nếu đang kết nối trực tiếp vào kênh này, lấy thông tin realtime từ LiveKit (kèm trạng thái speaking)
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

    // Nếu đứng bên ngoài (chưa join kênh này), lấy từ voiceStatesStore
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

  /**
   * Xem stream trực tiếp của thành viên đang chia sẻ màn hình
   */
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
   * Xử lý khi người dùng kéo thả sắp xếp lại vị trí của các danh mục.
   * Tất cả các kênh con của danh mục đó đương nhiên đi theo danh mục đó.
   */
  protected onCategoryDrop(
    event: CdkDragDrop<ChannelGroupViewModel[], ChannelGroupViewModel[], ChannelGroupViewModel>,
  ): void {
    if (!this.canManageChannels()) {
      return;
    }

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const serverId = this.serverId();
    const customCategories = this.serversStore.categoriesOf(serverId);
    const defaultCategories: ServerCategorySummary[] = [
      { id: 'cat-text', name: 'Kênh chữ' },
      { id: 'cat-voice', name: 'Kênh thoại' },
    ];

    const currentCats: ServerCategorySummary[] =
      customCategories.length > 0
        ? [...customCategories]
        : defaultCategories.map((d) => ({ ...d }));

    moveItemInArray(currentCats, event.previousIndex, event.currentIndex);
    this.serversStore.setCategories(serverId, currentCats);
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

    const targetCategoryId =
      targetGroup.id === 'cat-uncategorized' || targetGroup.isCategory === false
        ? null
        : targetGroup.id;

    this.serversStore.moveChannel(
      this.serverId(),
      channel.id,
      targetCategoryId,
      event.currentIndex,
    );
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

  protected onViewMemberProfile(member: VoiceChannelMemberViewModel): void {
    // Có thể trigger profile card
  }

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


