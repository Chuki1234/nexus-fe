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
import { ChannelSummary, ShellData } from '../../../../../core/api/shell-data';
import { VoiceRoomService } from '../../../../../features/voice/services/voice-room.service';
import { ChannelSettingsModal } from '../../../../../features/settings/modals/channel-settings-modal/channel-settings-modal';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { UnreadBadge } from '../../../../../shared/ui/unread-badge/unread-badge';
import { CreateChannelDialog } from './create-channel-dialog/create-channel-dialog';
import { InviteChannelDialog } from './invite-channel-dialog/invite-channel-dialog';

/** Nhãn nhóm theo loại kênh. Thứ tự trong mảng là thứ tự hiển thị. */
const GROUPS = [
  { type: 'text' as const, label: 'Kênh chữ', icon: 'tag' },
  { type: 'forum' as const, label: 'Kênh bài đăng', icon: 'forum' },
  { type: 'voice' as const, label: 'Kênh thoại', icon: 'volume_up' },
];

/** Danh sách kênh của một server — nội dung cột 2 khi đang mở server. */
@Component({
  selector: 'app-channel-list',
  imports: [
    Avatar,
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

  private readonly shell = inject(ShellData);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly voiceRoom = inject(VoiceRoomService);

  readonly serverId = input.required<string>();

  protected readonly voiceConnectedChannelId = this.voiceRoom.currentChannelId;
  protected readonly voiceParticipants = this.voiceRoom.allParticipants;

  /** Quản lý trạng thái thu gọn/mở rộng từng nhóm kênh */
  protected readonly collapsedGroups = signal<Record<string, boolean>>({});

  /** Tọa độ hiển thị Context Menu tại vị trí con trỏ chuột */
  protected readonly contextMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  /** Nhóm hoặc Kênh đang được chọn bởi chuột phải */
  protected readonly selectedGroup = signal<{ type: string; label: string; icon: string } | null>(null);
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
    () => this.shell.serverOf(this.serverId())?.name ?? 'Máy chủ',
  );

  /** Bỏ nhóm rỗng để không hiện tiêu đề khi danh sách kênh hoàn toàn rỗng */
  protected readonly groups = computed(() => {
    const channels = this.shell.channelsOf(this.serverId());
    return GROUPS.map((group) => ({
      ...group,
      channels: channels.filter((channel) => channel.type === group.type),
    })).filter((group) => group.channels.length > 0);
  });

  /**
   * Tính danh sách kênh hiển thị:
   * - Nếu nhóm mở: hiện tất cả kênh trong nhóm.
   * - Nếu nhóm thu gọn: chỉ hiện duy nhất kênh mà người dùng đang mở (nếu thuộc nhóm này).
   */
  protected visibleChannelsOf(group: { type: string; channels: ChannelSummary[] }): ChannelSummary[] {
    const isCollapsed = this.isGroupCollapsed(group.type);
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


  protected isGroupCollapsed(type: string): boolean {
    return !!this.collapsedGroups()[type];
  }

  protected toggleGroup(type: string): void {
    this.collapsedGroups.update((current) => ({
      ...current,
      [type]: !current[type],
    }));
  }

  protected openCreateChannelDialog(type: 'text' | 'voice', event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.dialog.open(CreateChannelDialog, {
      data: {
        serverId: this.serverId(),
        serverName: this.serverName(),
        defaultType: type,
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
    group: { type: string; label: string; icon: string },
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
    for (const group of GROUPS) {
      allCollapsed[group.type] = true;
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

  protected markGroupAsRead(group?: { type: string } | null): void {
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
    this.openCreateChannelDialog(type);
  }

  protected onActionSeam(action: string, target?: unknown): void {
    // Integration seam cho các tính năng nâng cao (Ghim, Trùng lặp, Xóa, Tắt âm, Thông báo)
  }
}


