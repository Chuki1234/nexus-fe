import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  QueryList,
  signal,
  ViewChild,
  ViewChildren,
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
  type CdkDragStart,
} from '@angular/cdk/drag-drop';
import { ChannelSummary, ServerCategorySummary } from '../../../../../core/servers/server.models';
import { ServerCapabilitiesService } from '../../../../../core/servers/server-capabilities.service';
import { VoiceRoomService } from '../../../../../features/voice/services/voice-room.service';
import { ChatSocketService } from '../../../../../core/realtime/chat-socket.service';
import { ProfileDialogService } from '../../../../../features/profile/profile-dialog.service';
import { ChannelSettingsModal } from '../../../../../features/settings/modals/channel-settings-modal/channel-settings-modal';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { UnreadBadge } from '../../../../../shared/ui/unread-badge/unread-badge';
import { OverflowMarquee } from '../../../../../shared/ui/overflow-marquee/overflow-marquee';
import { CreateChannelDialog } from './create-channel-dialog/create-channel-dialog';
import { InviteChannelDialog } from './invite-channel-dialog/invite-channel-dialog';
import { ServersStore } from '../../../../../core/servers/servers.store';
import { NotificationStore } from '../../../../../core/notification/notification-store';
import { ServerVoiceStatesStore } from '../../../../../core/servers/server-voice-states.store';
import { UserSettingsService } from '../../../../../features/settings/services/user-settings.service';
import { ServerChannelStructureSyncService } from '../../../../../core/servers/server-channel-structure-sync.service';

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
  isDeafened?: boolean;
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
  @ViewChildren(CdkDropList) private readonly dropLists?: QueryList<CdkDropList>;

  private readonly serversStore = inject(ServersStore);
  private readonly notificationStore = inject(NotificationStore);
  private readonly capabilitiesService = inject(ServerCapabilitiesService);
  private readonly voiceStatesStore = inject(ServerVoiceStatesStore);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly profileDialog = inject(ProfileDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly userSettings = inject(UserSettingsService);
  private readonly structureSync = inject(ServerChannelStructureSyncService);
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
  private hoverClearTimeout: ReturnType<typeof setTimeout> | null = null;
  private justFinishedDragging = false;
  private lastDragPointer: { x: number; y: number } | null = null;
  private pointerTrackerCleanup: (() => void) | null = null;
  private clickSuppressorCleanup: (() => void) | null = null;

  /**
   * Category mà kênh đang kéo XUẤT PHÁT (null nếu kéo từ cấp root). Dùng để phân
   * biệt "đưa kênh vào category khác" (nest → highlight cả khối) với "sắp xếp lại
   * trong cùng category" (chỉ hiện khe chèn/placeholder).
   */
  private dragSourceCategoryId: string | null = null;

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
    this.clearHoverClearTimer();
    this.stopPointerTracking();
    this.clickSuppressorCleanup?.();
    this.clickSuppressorCleanup = null;
  }

  /**
   * Đo chiều rộng thực của container trước khi CDK Drag bắt đầu tạo preview.
   */
  protected onPrepDrag(event: Event): void {
    const el = event.currentTarget as HTMLElement;
    const container =
      el.closest('.channel-drop-list') ??
      el.closest('mat-nav-list') ??
      el.closest('.channel-sidebar-root-list') ??
      el.parentElement;
    if (container) {
      this.dragPreviewWidth = Math.round(container.getBoundingClientRect().width - 4);
    }
  }

  protected onPrepChannelDrag(event: Event): void {
    const row = event.currentTarget as HTMLElement;
    const container = (row.closest('.channel-drop-list') ??
      row.closest('.channel-sidebar-root-list')) as HTMLElement | null;
    const rowRect = row.getBoundingClientRect();
    const containerStyle = container ? getComputedStyle(container) : null;
    const horizontalPadding = containerStyle
      ? parseFloat(containerStyle.paddingLeft || '0') +
        parseFloat(containerStyle.paddingRight || '0')
      : 0;
    const measuredWidth = container
      ? container.getBoundingClientRect().width - horizontalPadding
      : rowRect.width;

    this.channelDragPreviewSize.set({
      width: Math.max(160, Math.round(measuredWidth)),
      height: 34,
    });
  }

  protected onChannelDragStarted(event?: CdkDragStart): void {
    this.isDraggingChannel.set(true);
    this.justFinishedDragging = false;
    this.dragSourceCategoryId = this.categoryIdOfContainer(event?.source?.dropContainer?.id);
    this.startPointerTracking();
    this.startClickSuppression();
    this.announce('Bắt đầu kéo kênh.');
  }

  /** Suy ra categoryId từ id của một CdkDropList (null nếu là root list). */
  private categoryIdOfContainer(containerId: string | undefined): string | null {
    if (!containerId) return null;
    const prefix = 'channel-group-';
    return containerId.startsWith(prefix) ? containerId.slice(prefix.length) : null;
  }

  protected onChannelDragEnded(): void {
    this.isDraggingChannel.set(false);
    this.justFinishedDragging = true;
    setTimeout(() => {
      this.justFinishedDragging = false;
    }, 150);
    this.stopPointerTracking();
    this.stopClickSuppression();
    this.clearDwellTimer();
    this.clearHoverClearTimer();
    this.dragSourceCategoryId = null;
    this.activeHoverCategoryId.set(null);
  }

  /**
   * Sau khi kéo, trình duyệt vẫn phát `click` trên thẻ `<a>` của kênh và
   * `RouterLink` sẽ điều hướng. Không thể chặn bằng handler `(click)` của
   * template: `cdkDragEnded`/`cdkDropListDropped` được phát BẤT ĐỒNG BỘ sau khi
   * preview chạy xong animation, tức là muộn hơn cả sự kiện click.
   *
   * Vì vậy chặn ngay từ lúc kéo bắt đầu, bằng listener ở pha capture trên
   * document nên luôn chạy trước listener của RouterLink.
   */
  private startClickSuppression(): void {
    if (this.clickSuppressorCleanup || typeof document === 'undefined') return;
    const block = (event: Event): void => {
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener('click', block, true);
    this.clickSuppressorCleanup = () => document.removeEventListener('click', block, true);
  }

  private stopClickSuppression(): void {
    const cleanup = this.clickSuppressorCleanup;
    if (!cleanup) return;
    this.clickSuppressorCleanup = null;
    // Gỡ ở macrotask kế tiếp để vẫn nuốt cú click phát ra ngay sau mouseup.
    setTimeout(cleanup, 0);
  }

  /**
   * Dự phòng vị trí con trỏ cho `isRootEnterPredicate`. Nguồn chính là
   * `DragRef._lastKnownPointerPosition` (được gán ngay trước khi CDK gọi
   * enterPredicate nên luôn tươi); listener này chỉ để không phụ thuộc tuyệt đối
   * vào một field nội bộ của CDK.
   */
  private startPointerTracking(): void {
    if (this.pointerTrackerCleanup || typeof document === 'undefined') return;
    const track = (event: MouseEvent | TouchEvent): void => {
      const point = 'touches' in event ? event.touches[0] : event;
      if (point) {
        this.lastDragPointer = { x: point.clientX, y: point.clientY };
      }
    };
    document.addEventListener('mousemove', track, true);
    document.addEventListener('touchmove', track, true);
    this.pointerTrackerCleanup = () => {
      document.removeEventListener('mousemove', track, true);
      document.removeEventListener('touchmove', track, true);
    };
  }

  private stopPointerTracking(): void {
    this.pointerTrackerCleanup?.();
    this.pointerTrackerCleanup = null;
    this.lastDragPointer = null;
  }

  /**
   * CDK cache DOMRect của các drop list nhận drop đúng một lần lúc bắt đầu kéo và
   * chỉ tự cache lại khi có scroll. Nhưng mỗi lần placeholder đổi vị trí thì mọi
   * thứ bên dưới dịch chuyển, khiến rect cũ lệch khỏi DOM thật — đo được: kéo
   * root channel lên trên một category làm category đó tụt 36px, con trỏ đứng
   * trên header nhưng `_canReceive()` vẫn trượt vì `elementFromPoint` không còn
   * nằm trong container.
   *
   * Vì vậy đo lại hình học ngay khi thứ tự thật sự thay đổi. Đây chính là việc
   * CDK tự làm cho sibling đang nhận drop khi có scroll.
   */
  protected onDropListSorted(): void {
    this.dropLists?.forEach((list) => {
      const ref = list._dropListRef as unknown as {
        isReceiving?: () => boolean;
        _cacheParentPositions?: () => void;
      };
      if (typeof ref?._cacheParentPositions === 'function' && ref.isReceiving?.()) {
        ref._cacheParentPositions();
      }
    });
  }

  /**
   * Trình duyệt vẫn phát `click` trên chính thẻ `<a>` sau khi thả chuột, nên vừa
   * kéo xong sẽ điều hướng ngoài ý muốn. `RouterLink` lắng nghe trên cùng phần
   * tử và không kiểm tra `defaultPrevented`, vì vậy phải chặn bằng
   * `stopImmediatePropagation()` chứ không chỉ `preventDefault()`.
   */
  protected onChannelClick(event: MouseEvent): void {
    if (this.justFinishedDragging) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
    }
  }

  /**
   * Con trỏ (đang kéo kênh) đi vào một bề mặt drop của category — header HOẶC
   * thân danh sách kênh con. Cả hai gọi chung hàm này để highlight sáng toàn bộ
   * khối category, cho người dùng biết "thả ở đây là đưa kênh vào danh mục này"
   * mà không cần mở/đóng để kiểm tra.
   *
   * Chỉ highlight khi là thao tác ĐƯA VÀO (kênh xuất phát từ category khác hoặc
   * từ root). Sắp xếp lại trong cùng category dùng khe chèn/placeholder, không
   * cần highlight cả khối để tránh gây nhiễu.
   */
  protected onCategoryHeaderDropEntered(categoryId: string): void {
    if (!this.isDraggingChannel()) return;
    if (this.dragSourceCategoryId === categoryId) return;

    // Con trỏ vẫn đang trong phạm vi category này → hủy lệnh xóa highlight đang
    // chờ (phát sinh khi đi từ header sang thân list hoặc ngược lại).
    this.clearHoverClearTimer();
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
    this.clearDwellTimer();

    // Không xóa ngay: header và thân list là hai drop-list riêng của cùng một
    // category, di chuyển giữa chúng phát exit rồi mới enter. Hoãn một nhịp ngắn
    // để enter kịp hủy, tránh highlight nhấp nháy.
    this.clearHoverClearTimer();
    this.hoverClearTimeout = setTimeout(() => {
      if (this.activeHoverCategoryId() === categoryId) {
        this.activeHoverCategoryId.set(null);
      }
    }, 60);
  }

  protected onCategoryHeaderMouseEnter(categoryId: string): void {
    if (this.isDraggingChannel()) {
      this.onCategoryHeaderDropEntered(categoryId);
    }
  }

  protected onCategoryHeaderMouseLeave(categoryId: string): void {
    this.onCategoryHeaderDropExited(categoryId);
  }

  private clearHoverClearTimer(): void {
    if (this.hoverClearTimeout !== null) {
      clearTimeout(this.hoverClearTimeout);
      this.hoverClearTimeout = null;
    }
  }

  protected onCategoryHeaderDrop(event: CdkDragDrop<any>, targetCategoryId: string): void {
    if (!this.canManageChannels()) return;
    this.onChannelDragEnded();
    if (this.isDropOutsideSidebar(event)) {
      this.announce('Đã hủy kéo thả vì thả ra ngoài vùng hợp lệ.');
      return;
    }

    const data = event.item.data as { kind?: string; channel?: ChannelSummary } | ChannelSummary;
    const channel = (data as any)?.channel ?? ('type' in (data as any) ? data : null);
    if (!channel) return;

    const serverId = this.serverId();
    const targetCat = this.serversStore
      .categoriesOf(serverId)
      .find((c) => c.id === targetCategoryId);
    const targetName = targetCat?.name ?? 'danh mục';

    this.serversStore.moveChannel(serverId, channel.id, targetCategoryId, 0);
    this.persistStructure(serverId);
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
   * Predicates để bảo đảm CDK DropList chỉ chấp nhận đúng loại dữ liệu kéo thả.
   *
   * Root list chấp nhận cả Category lẫn Channel (kéo kênh từ category ra cấp máy
   * chủ), nhưng CHỈ khi con trỏ không nằm trong cây con của một category.
   *
   * Bounding box của root bao trọn mọi category list, và
   * `DropListRef._getSiblingContainerFromPosition()` chỉ duyệt các sibling —
   * container ban đầu bị loại khỏi danh sách đó. Nếu root chấp nhận vô điều kiện
   * thì ngay khi kéo trong chính category của mình, root sẽ khớp trước và cướp
   * drop (đo được: kéo ch-c trong cat-A phát `cdkDropListDropped` trên root).
   * Chặn theo vị trí con trỏ giữ cho mỗi cấp chỉ nhận drop trong vùng của nó.
   */
  protected readonly isRootEnterPredicate = (drag: CdkDrag<unknown>): boolean => {
    const data = drag.data as { kind?: string } | undefined;
    if (!data) return false;
    if (data.kind === 'category') return true;
    if (!this.isChannelData(data)) return false;
    return !this.isPointerInsideCategorySubtree(drag);
  };

  /**
   * Con trỏ của thao tác kéo hiện tại có đang nằm trong một `.channel-group`
   * (header + danh sách kênh con của một category) hay không.
   *
   * `DropListRef._startReceiving()` gọi enterPredicate ĐÚNG MỘT LẦN lúc bắt đầu
   * kéo và chỉ cache `_domRect` khi predicate trả về true — trả về false ở thời
   * điểm đó sẽ vô hiệu hóa container suốt cả thao tác. Lúc nhấc kênh lên thì con
   * trỏ đương nhiên đang nằm trong category của nó, nên pha kích hoạt phải được
   * bỏ qua: `lastDragPointer` chỉ có giá trị từ lần `mousemove` sau khi kéo đã
   * thực sự bắt đầu (listener được đăng ký trong chính lần dispatch đó nên không
   * nhận được event hiện tại).
   */
  private isPointerInsideCategorySubtree(drag: CdkDrag<unknown>): boolean {
    if (!this.lastDragPointer || typeof document === 'undefined') return false;

    // Ưu tiên vị trí CDK vừa ghi ngay trước khi hỏi predicate (không bị trễ một
    // event như listener của chính component).
    const pointer =
      (drag as unknown as { _dragRef?: { _lastKnownPointerPosition?: { x: number; y: number } } })
        ._dragRef?._lastKnownPointerPosition ?? this.lastDragPointer;

    const element = document.elementFromPoint(pointer.x, pointer.y);
    // Chỉ header và danh sách con mới là "lãnh thổ" của category. Dải padding
    // trên/dưới của `.channel-group` vẫn thuộc root để còn chèn được root
    // channel vào giữa hai category.
    return !!element?.closest('.category-header-drop, .category-child-list');
  }

  protected readonly isCategoryChildEnterPredicate = (drag: CdkDrag<unknown>): boolean => {
    const data = drag.data as { kind?: string } | undefined;
    if (!data) return false;
    if (data.kind === 'category') return false;
    return this.isChannelData(data);
  };

  /** Một payload kéo thả là channel khi nó là ChannelSummary hoặc wrapper kind: 'channel'. */
  private isChannelData(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const record = data as Record<string, unknown>;
    if (record['kind'] === 'channel') return true;
    return 'type' in record && !('userId' in record);
  }

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
  protected readonly canManageChannels = computed(
    () => this.capabilities()?.canManageChannels ?? false,
  );
  protected readonly canInviteMembers = computed(
    () => this.capabilities()?.canInviteMembers ?? false,
  );

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

    // Đọc các signal phản ứng để tính toán lại ngay khi trạng thái tắt âm hoặc toggle ẩn thay đổi
    const hideMuted = this.userSettings.isHideMutedChannels(srvId);
    this.userSettings.hideMutedChannelsMap();
    this.userSettings.channelNotificationSettingsMap();

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
          const isMuted = this.userSettings.isChannelExplicitlyMuted(ch.id);
          if (hideMuted && isMuted) {
            continue;
          }
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
          const isCategoryMuted = this.userSettings.isChannelExplicitlyMuted(cat.id);

          for (const chId of childIds) {
            const ch = channelMap.get(chId);
            if (ch) {
              const isChannelMuted = this.userSettings.isChannelExplicitlyMuted(ch.id) || isCategoryMuted;
              if (hideMuted && isChannelMuted) {
                continue;
              }
              childChannels.push(ch);
            }
          }

          // Khi bật ẩn kênh đã tắt thông báo: nếu category có kênh nhưng toàn bộ đều bị tắt âm, ẩn luôn category
          if (hideMuted && childChannels.length === 0 && childIds.length > 0) {
            continue;
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
   * Thứ tự kết nối drop list — đây là điểm mấu chốt của kiến trúc lồng nhau.
   *
   * `DragRef._updateActiveDropContainer()` gọi
   * `initialContainer._getSiblingContainerFromPosition()`, hàm này trả về
   * `_siblings.find(s => s._canReceive(...))` — tức container khớp ĐẦU TIÊN
   * thắng. Root list bao trọn bounding box của mọi category list, nên nếu root
   * đứng trước thì nó sẽ luôn nuốt drop của list con.
   *
   * Vì vậy thứ tự bắt buộc là: category list → category header → root list.
   * `CdkDropList` ghép `connectedTo` (tường minh, giữ nguyên thứ tự) rồi mới nối
   * thêm các thành viên `cdkDropListGroup` chưa có, và tự loại bỏ chính nó — nên
   * danh sách dùng chung này an toàn cho mọi drop list kênh.
   */
  protected readonly channelDropListConnections = computed<string[]>(() => {
    const categoryIds = this.rootItems()
      .filter((item): item is SidebarCategoryItem => item.kind === 'category')
      .map((item) => item.category.id);

    return [
      ...categoryIds.map((id) => `channel-group-${id}`),
      ...categoryIds.map((id) => `category-header-drop-${id}`),
      'channel-sidebar-root-list',
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
  protected visibleChannelsOf(
    group: ChannelGroupViewModel | SidebarCategoryItem,
  ): ChannelSummary[] {
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

  /** Số tin chưa đọc của đúng kênh — dùng chung cho kênh chữ và chat kênh thoại. */
  protected channelUnreadCount(channelId: string): number {
    return this.notificationStore.channelUnreadCount(channelId);
  }

  /** Kênh có tin chưa đọc (để in đậm / hiện chấm). */
  protected channelHasUnread(channelId: string): boolean {
    return this.notificationStore.channelHasUnread(channelId);
  }

  /** Tổng số tin chưa đọc của category khi category đang thu gọn. */
  protected getGroupUnreadCount(group: ChannelGroupViewModel | SidebarCategoryItem): number {
    return group.channels.reduce(
      (acc, ch) => acc + this.notificationStore.channelUnreadCount(ch.id),
      0,
    );
  }

  protected getVoiceChannelMembers(channelId: string): VoiceChannelMemberViewModel[] {
    const serverId = this.serverId();
    const states = this.voiceStatesStore.getChannelVoiceMembers(serverId, channelId);
    const isCurrentlyConnected = this.voiceConnectedChannelId() === channelId;
    const localPart = isCurrentlyConnected ? this.voiceRoom.localParticipant() : null;
    const remotes = isCurrentlyConnected ? this.voiceRoom.remoteParticipants() : [];

    // Redis là presence canonical cho sidebar; LiveKit bổ sung speaking/media realtime.
    // Không thay thế toàn bộ snapshot vì participant event của LiveKit có thể đến trễ.
    const members = new Map<string, VoiceChannelMemberViewModel>();
    for (const s of states) {
      members.set(s.userId, {
        userId: s.userId,
        name: s.displayName || s.name || s.username,
        avatarUrl: s.avatarUrl,
        isMuted: s.isMuted,
        isDeafened: s.isDeafened,
        isCameraOn: s.isCameraOn,
        isScreenSharing: s.isScreenSharing,
        isSpeaking: false,
        isLocal: false,
      });
    }

    if (isCurrentlyConnected) {
      if (localPart) {
        const fromState = members.get(localPart.identity);
        members.set(localPart.identity, {
          userId: localPart.identity,
          name: localPart.name,
          avatarUrl: localPart.avatarUrl ?? fromState?.avatarUrl ?? null,
          isMuted: localPart.isMuted,
          isDeafened: localPart.isDeafened,
          isCameraOn: localPart.isCameraOn,
          isScreenSharing: localPart.isScreenSharing,
          isSpeaking: localPart.isSpeaking,
          isLocal: true,
        });
      }
      for (const r of remotes) {
        const fromState = members.get(r.identity);
        members.set(r.identity, {
          userId: r.identity,
          name: r.name,
          avatarUrl: r.avatarUrl ?? fromState?.avatarUrl ?? null,
          isMuted: r.isMuted,
          isDeafened: r.isDeafened,
          isCameraOn: r.isCameraOn,
          isScreenSharing: r.isScreenSharing,
          isSpeaking: r.isSpeaking,
          isLocal: false,
        });
      }
    }

    return [...members.values()];
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

  /** True nếu kênh voice có ít nhất 1 người đang tham gia. */
  protected voiceChannelIsActive(channelId: string): boolean {
    return this.voiceStatesStore.getChannelVoiceMembers(this.serverId(), channelId).length > 0;
  }

  protected voiceChannelMemberCount(channelId: string): number {
    return this.voiceStatesStore.getChannelVoiceMembers(this.serverId(), channelId).length;
  }

  protected voiceChannelHasScreenShare(channelId: string): boolean {
    return this.voiceStatesStore
      .getChannelVoiceMembers(this.serverId(), channelId)
      .some((m) => m.isScreenSharing);
  }

  protected voiceChannelHasCamera(channelId: string): boolean {
    return this.voiceStatesStore
      .getChannelVoiceMembers(this.serverId(), channelId)
      .some((m) => m.isCameraOn);
  }

  protected openCreateChannelDialog(
    group?: ChannelGroupViewModel | SidebarCategoryItem | 'text' | 'voice',
    event?: Event,
  ): void {
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
      panelClass: 'nexus-dialog-overlay',
      maxWidth: '92vw',
      maxHeight: '88vh',
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

    const vm: ChannelGroupViewModel =
      'category' in group
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

  protected onChannelContextMenu(event: MouseEvent | KeyboardEvent, channel: ChannelSummary): void {
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
    this.openCreateChannelDialog({
      id: categoryId,
      label: type === 'voice' ? 'Kênh thoại' : 'Kênh chữ',
      channels: [],
    });
  }

  protected onActionSeam(action: string, target?: unknown): void {
    const item = (target ?? this.selectedChannel() ?? this.selectedGroup()) as
      | { id?: string; channels?: ChannelSummary[] }
      | undefined;
    if (!item) return;

    const channelIds: string[] = [];
    if (Array.isArray(item.channels) && item.channels.length > 0) {
      channelIds.push(...item.channels.map((c) => c.id));
    } else if (item.id) {
      channelIds.push(item.id);
    }

    if (channelIds.length === 0) return;

    if (action.startsWith('mute-')) {
      const duration = action.replace('mute-', '');
      let durationMs: number | null = null;
      if (duration === '15m') durationMs = 15 * 60 * 1000;
      else if (duration === '1h') durationMs = 60 * 60 * 1000;
      else if (duration === '8h') durationMs = 8 * 60 * 60 * 1000;
      else if (duration === '24h') durationMs = 24 * 60 * 60 * 1000;
      else if (duration === 'until-on') durationMs = null;

      for (const chId of channelIds) {
        this.userSettings.setChannelMuted(chId, true, durationMs);
      }
    } else if (action === 'unmute') {
      for (const chId of channelIds) {
        this.userSettings.setChannelMuted(chId, false);
      }
    } else if (action.startsWith('notify-')) {
      const level = action.replace('notify-', '') as 'default' | 'all' | 'mentions' | 'nothing';
      for (const chId of channelIds) {
        this.userSettings.setChannelNotificationLevel(chId, level);
      }
    }
  }

  /**
   * Thả ra ngoài vùng sidebar là thao tác bị hủy: không mutate layout, CDK tự
   * đưa item về chỗ cũ. Dùng `dropPoint` so với hình học thật của component thay
   * vì `isPointerOverContainer` — cờ đó còn bật/tắt theo rect đã cache của riêng
   * drop container nên sẽ hủy nhầm cả những cú thả sát mép hợp lệ.
   */
  private isDropOutsideSidebar(event: CdkDragDrop<unknown>): boolean {
    const point = event.dropPoint;
    const element = this.host?.nativeElement as HTMLElement | undefined;
    if (!point || !element?.getBoundingClientRect) return false;

    const rect = element.getBoundingClientRect();
    return (
      point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom
    );
  }

  /**
   * Xử lý thả phần tử tại cấp Root (Category hoặc Root Channel).
   */
  protected onRootDrop(event: CdkDragDrop<any>): void {
    if (!this.canManageChannels()) return;
    this.onChannelDragEnded();
    if (this.isDropOutsideSidebar(event)) {
      this.announce('Đã hủy kéo thả vì thả ra ngoài vùng hợp lệ.');
      return;
    }

    const data = event.item.data as
      | { kind?: string; channel?: ChannelSummary; category?: ServerCategorySummary }
      | ChannelSummary
      | ChannelGroupViewModel;
    const serverId = this.serverId();

    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) return;
      this.serversStore.moveRootItem(serverId, event.previousIndex, event.currentIndex);
      this.persistStructure(serverId);
      const name =
        (data as any)?.category?.name ??
        (data as any)?.channel?.name ??
        (data as any)?.name ??
        'phần tử';
      this.announce(`Đã đổi vị trí ${name}.`);
      return;
    }

    // Kéo từ category ra root list
    const channel = (data as any)?.channel ?? ('type' in (data as any) ? data : null);
    if (channel) {
      this.serversStore.moveChannel(
        serverId,
        channel.id,
        null,
        event.currentIndex,
        event.currentIndex,
      );
      this.persistStructure(serverId);
      this.announce(`Đã đưa kênh ${channel.name} ra cấp máy chủ.`);
    }
  }

  /**
   * Xử lý thả kênh vào danh mục (sắp xếp con hoặc chuyển danh mục).
   */
  protected onCategoryChildDrop(event: CdkDragDrop<any>, targetCategoryId: string): void {
    if (!this.canManageChannels()) return;
    this.onChannelDragEnded();
    if (this.isDropOutsideSidebar(event)) {
      this.announce('Đã hủy kéo thả vì thả ra ngoài vùng hợp lệ.');
      return;
    }

    const data = event.item.data as { kind?: string; channel?: ChannelSummary } | ChannelSummary;
    const channel = (data as any)?.channel ?? ('type' in (data as any) ? data : null);
    if (!channel) return;

    const serverId = this.serverId();
    const targetCat = this.serversStore
      .categoriesOf(serverId)
      .find((c) => c.id === targetCategoryId);
    const targetName = targetCat?.name ?? 'danh mục';

    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) return;
      this.serversStore.reorderCategoryChildren(
        serverId,
        targetCategoryId,
        event.previousIndex,
        event.currentIndex,
      );
      this.persistStructure(serverId);
      this.announce(`Đã đổi vị trí kênh ${channel.name} trong danh mục ${targetName}.`);
      return;
    }

    this.serversStore.moveChannel(serverId, channel.id, targetCategoryId, event.currentIndex);
    this.persistStructure(serverId);
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
    this.persistStructure(this.serverId());
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
    const targetCategoryId =
      !targetGroup || targetGroup.id === 'cat-uncategorized' || targetGroup.isCategory === false
        ? null
        : targetGroup.id;

    this.serversStore.moveChannel(
      this.serverId(),
      channel.id,
      targetCategoryId,
      event.currentIndex,
    );
    this.persistStructure(this.serverId());
  }

  private persistStructure(serverId: string): void {
    void this.structureSync.save(serverId).catch(() => undefined);
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
    if (member.name) {
      this.profileDialog.open(member.name);
    }
  }

  protected toggleSelfMute(): void {
    void this.voiceRoom.toggleMicrophone();
  }

  protected toggleSelfDeafen(): void {
    void this.voiceRoom.toggleDeafen();
  }

  protected openProfileSettings(): void {
    this.userSettings.openUserSettings('profile');
  }

  protected onMoveSelfToChannel(targetChannelId: string): void {
    const srvId = this.serverId();
    const currentChannel = this.selectedMemberChannel();
    if (currentChannel?.id === targetChannelId) return;

    const targetChannel = this.serversStore.channelsOf(srvId).find((c) => c.id === targetChannelId);
    const targetName = targetChannel?.name || 'Kênh thoại';

    void this.voiceRoom.joinRoom(srvId, targetChannelId, targetName);
    this.chatSocket.moveVoiceMember(
      srvId,
      this.voiceRoom.localParticipant()?.identity || '',
      targetChannelId,
    );
    void this.router.navigate(['/channels', srvId, targetChannelId]);
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
