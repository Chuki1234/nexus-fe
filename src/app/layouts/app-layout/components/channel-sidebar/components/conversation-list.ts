import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  ConversationsApiService,
  type ConversationResponseDto,
} from '../../../../../core/api/conversations-api.service';
import { PRESENCE_LABEL, type PresenceStatus } from '../../../../../../shared/dto/common';
import type { DisplayConversation } from '../../../../../core/conversations/conversation.models';
export type { DisplayConversation };
import { AuthService } from '../../../../../core/auth/auth.service';
import { ChatSocketService } from '../../../../../core/realtime/chat-socket.service';
import { NotificationStore } from '../../../../../core/notification/notification-store';
import { PresenceService } from '../../../../../core/presence/presence.service';
import { DirectCallCoordinatorService } from '../../../../../core/calls/direct-call-coordinator.service';
import { UserSettingsService } from '../../../../../features/settings/services/user-settings.service';
import { ActiveChatStore } from '../../../../../features/dashboard/services/active-chat.store';
import { ServerInvitationsStore } from '../../../../../core/servers/server-invitations.store';
import { FriendsStore } from '../../../../../features/dashboard/friends/services/friends-store';
import { FriendNoteDialog } from '../../../../../features/dashboard/friends/components/friend-note-dialog/friend-note-dialog';
import { BlockUserConfirmDialog } from '../../../../../features/dashboard/friends/components/block-user-confirm-dialog/block-user-confirm-dialog';
import { ProfileAvatar } from '../../../../../features/profile/components/profile-avatar/profile-avatar';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { SectionLabel } from '../../../../../shared/ui/section-label/section-label';
import { UnreadBadge } from '../../../../../shared/ui/unread-badge/unread-badge';
import { OverflowMarquee } from '../../../../../shared/ui/overflow-marquee/overflow-marquee';

/**
 * Danh sách tin nhắn riêng — nội dung cột 2 khi ở khu `/channels/@me`.
 *
 * Tải dữ liệu thật từ ConversationsApiService và đồng bộ realtime qua Socket.IO.
 */
@Component({
  selector: 'app-conversation-list',
  imports: [
    Avatar,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ProfileAvatar,
    RouterLink,
    RouterLinkActive,
    SectionLabel,
    UnreadBadge,
    OverflowMarquee,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './conversation-list.html',
  styleUrl: './conversation-list.css',
})
export class ConversationList implements OnInit, OnDestroy {
  private readonly conversationsApi = inject(ConversationsApiService);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly notificationStore = inject(NotificationStore);
  private readonly presenceService = inject(PresenceService);
  private readonly auth = inject(AuthService);
  private readonly activeChatStore = inject(ActiveChatStore);
  private readonly router = inject(Router);
  private readonly directCallCoordinator = inject(DirectCallCoordinatorService, { optional: true });
  private readonly userSettingsService = inject(UserSettingsService, { optional: true });
  private readonly dialog = inject(MatDialog);
  protected readonly invitationsStore = inject(ServerInvitationsStore);
  protected readonly friendsStore = inject(FriendsStore);
  private readonly subs = new Subscription();

  @ViewChild('contextMenuTrigger', { read: MatMenuTrigger })
  protected contextMenuTrigger?: MatMenuTrigger;

  readonly query = input('');

  protected readonly selectedConversation = signal<DisplayConversation | null>(null);
  protected readonly contextMenuPosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  protected readonly pendingFriendRequestsCount = computed(
    () => this.friendsStore.incomingRequests().length + this.invitationsStore.pendingCount(),
  );

  readonly realConversations = signal<ConversationResponseDto[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  protected readonly hasQuery = computed(() => this.normalize(this.query()).length > 0);

  protected readonly conversations = computed<DisplayConversation[]>(() => {
    const query = this.normalize(this.query());

    const list: DisplayConversation[] = this.realConversations().map((c) => {
      const name =
        c.recipient?.displayName ||
        c.recipient?.username ||
        c.name ||
        'Người dùng';
      const presence = c.recipient?.id
        ? this.presenceService.resolvePresence(c.recipient.id)
        : ((c.recipient?.presence as PresenceStatus) || 'offline');
      return {
        id: c.id,
        recipientId: c.recipient?.id ?? null,
        username: c.recipient?.username ?? null,
        name,
        avatarUrl: c.recipient?.avatarUrl || c.iconUrl || null,
        presence,
        statusMessage: c.recipient?.statusMessage || null,
        // Số chưa đọc lấy từ NotificationStore toàn cục (không bị mất khi đổi
        // server/route). Store đã được seed từ REST bên dưới.
        unread: this.notificationStore.dmUnread(c.id) > 0,
        unreadCount: this.notificationStore.dmUnread(c.id),
      };
    });

    if (!query) {
      return list;
    }

    return list.filter((conversation) =>
      this.normalize(`${conversation.name} ${conversation.statusMessage ?? ''}`).includes(query),
    );
  });

  protected readonly sectionTitle = computed(() =>
    this.hasQuery() ? `Kết quả · ${this.conversations().length}` : 'Tin nhắn trực tiếp',
  );

  ngOnInit(): void {
    void this.loadRealConversations();
    void this.invitationsStore.hydrateInvitations();
    this.setupRealtimeListeners();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  async loadRealConversations(): Promise<void> {
    try {
      const list = await this.conversationsApi.listConversations();
      this.realConversations.set(list ?? []);
      this.notificationStore.seedDmUnread(
        (list ?? []).map((c) => ({ id: c.id, unreadCount: c.unreadCount })),
      );
      this.error.set(null);
    } catch {
      this.realConversations.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private setupRealtimeListeners(): void {
    // 1. Số chưa đọc DM do NotificationStore (root) sở hữu và cộng dồn — ở đây chỉ
    //    cần phát hiện DM MỚI chưa có trong sidebar để tải lại danh sách.
    if (this.chatSocket.conversationUpdated$) {
      this.subs.add(
        this.chatSocket.conversationUpdated$.subscribe(({ conversationId, senderId }) => {
          if (senderId === this.auth.user()?.id) return;
          const exists = this.realConversations().some((c) => c.id === conversationId);
          if (!exists) {
            void this.loadRealConversations();
          }
        }),
      );
    }

    // 2. Conversation deleted: xóa khỏi sidebar và điều hướng an toàn nếu đang ở trong đoạn chat đó
    if (this.chatSocket.conversationDeleted$) {
      this.subs.add(
        this.chatSocket.conversationDeleted$.subscribe(({ conversationId, friendId }) => {
          this.realConversations.update((list) =>
            list.filter(
              (c) =>
                c.id !== conversationId &&
                (!friendId || c.recipient?.id !== friendId),
            ),
          );

          const activeConvId = this.activeChatStore.conversationId();
          if (
            activeConvId === conversationId ||
            this.router.url.includes(`/channels/@me/${conversationId}`)
          ) {
            void this.router.navigate(['/channels/@me']);
          }
        }),
      );
    }
  }

  protected onConversationContextMenu(event: MouseEvent, conv: DisplayConversation): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedConversation.set(conv);
    this.contextMenuPosition.set({ x: event.clientX, y: event.clientY });
    this.contextMenuTrigger?.openMenu();
  }

  protected onStartAudioCall(conv: DisplayConversation): void {
    void this.directCallCoordinator?.startCall(conv.id, 'audio');
    void this.router.navigate(['/channels/@me', conv.id]);
  }

  protected onStartVideoCall(conv: DisplayConversation): void {
    void this.directCallCoordinator?.startCall(conv.id, 'video');
    void this.router.navigate(['/channels/@me', conv.id]);
  }

  protected isMuted(conv: DisplayConversation): boolean {
    if (!conv.recipientId || !this.userSettingsService) return false;
    return this.userSettingsService.isFriendMuted(conv.recipientId);
  }

  protected onToggleMute(conv: DisplayConversation): void {
    if (conv.recipientId && this.userSettingsService) {
      this.userSettingsService.toggleMuteFriend(conv.recipientId);
    }
  }

  protected onViewProfile(conv: DisplayConversation): void {
    const target = conv.username || conv.name || conv.recipientId;
    if (target) {
      void this.router.navigate(['/u', target]);
    }
  }

  protected onEditNote(conv: DisplayConversation): void {
    if (!conv.recipientId || !this.dialog || !this.userSettingsService) return;
    const currentNote = this.userSettingsService.getFriendNote(conv.recipientId) || '';
    const dialogRef = this.dialog.open(FriendNoteDialog, {
      data: {
        friendId: conv.recipientId,
        friendName: conv.name,
        initialNote: currentNote,
      },
      panelClass: 'nexus-dialog-surface',
      hasBackdrop: true,
    });

    dialogRef.afterClosed().subscribe((result: string | null | undefined) => {
      if (typeof result === 'string' && conv.recipientId) {
        this.userSettingsService?.setFriendNote(conv.recipientId, result);
      }
    });
  }

  protected onRemoveFriend(conv: DisplayConversation): void {
    if (conv.recipientId) {
      void this.friendsStore.removeFriend(conv.recipientId);
    }
  }

  protected onBlockUser(conv: DisplayConversation): void {
    if (conv.recipientId) {
      const dialogRef = this.dialog.open(BlockUserConfirmDialog, {
        data: {
          userId: conv.recipientId,
          username: conv.username || conv.name,
          displayName: conv.name,
        },
        panelClass: 'nexus-dialog-surface',
        hasBackdrop: true,
      });

      dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
        if (confirmed && conv.recipientId) {
          void this.friendsStore.blockUser(conv.recipientId);
        }
      });
    }
  }

  protected presenceLabel(presence: PresenceStatus): string {
    return PRESENCE_LABEL[presence] || 'Ngoại tuyến';
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLocaleLowerCase('vi')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
