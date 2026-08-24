import { DatePipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatToolbar } from '../components/chat-toolbar/chat-toolbar';
import { ContextPanel } from '../components/context-panel/context-panel';
import {
  MessageComposer,
  type MessageComposerContext,
  type SendMessagePayload,
} from '../components/message-composer/message-composer';
import { MessageActions } from '../components/message-actions/message-actions';
import { DashboardState } from '../components/dashboard-state/dashboard-state';
import { DashboardUiState } from '../services/dashboard-ui-state';
import { AuthService } from '../../../core/auth/auth.service';
import {
  ServersApiService,
  type ServerMemberDto,
} from '../../../core/api/servers-api.service';
import {
  ChannelChatStore,
  type ChannelChatUiMessage,
  compareMessageIds,
} from '../services/channel-chat.store';
import { ServersStore } from '../../../core/servers/servers.store';
import { PresenceService } from '../../../core/presence/presence.service';
import type { PresenceStatus } from '../../../../shared/dto/common';
import { Avatar } from '../../../shared/ui/avatar/avatar';
import { EmptyState } from '../../../shared/ui/empty-state/empty-state';
import { ChannelSettingsModal } from '../../settings/modals/channel-settings-modal/channel-settings-modal';
import { ForwardMessageModal } from '../components/forward-message-modal/forward-message-modal';
import { LightboxGalleryService } from '../../../shared/ui/lightbox-gallery/lightbox-gallery.service';
import type { LightboxMediaItem } from '../../../shared/ui/lightbox-gallery/lightbox-gallery.types';
import { VoiceRoom } from '../../voice/voice-room/voice-room';
import { ShellData } from '../../../core/api/shell-data';
import {
  parseMessageContent,
  type MessageContentToken,
} from '../conversation/utils/message-content-parser';
import {
  getMessagePresentationVariant,
  formatDateDividerLabel,
  getLocalDateKey,
  isSameCalendarDay,
  parseTimestamp,
  type MessagePresentationVariant,
} from '../conversation/conversation';
import type { AttachmentResponseDto } from '../../../core/api/messages-api.service';

/** Kênh trong server — `/channels/:serverId/:channelId`. */
@Component({
  selector: 'app-channel-page',
  imports: [
    Avatar,
    ChatToolbar,
    ContextPanel,
    DashboardState,
    DatePipe,
    EmptyState,
    ForwardMessageModal,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MessageActions,
    MessageComposer,
    VoiceRoom,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  templateUrl: './channel.html',
  styleUrl: './channel.css',
})
export class ChannelPage implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly serversStore = inject(ServersStore, { optional: true });
  private readonly serversApi = inject(ServersApiService, { optional: true });
  private readonly shell = inject(ShellData, { optional: true });
  readonly channelChat = inject(ChannelChatStore, { optional: true }) ?? inject(ChannelChatStore);
  protected readonly auth = inject(AuthService, { optional: true }) ?? inject(AuthService);
  private readonly presenceService = inject(PresenceService, { optional: true }) ?? inject(PresenceService);
  private readonly dialog = inject(MatDialog);
  private readonly lightbox = inject(LightboxGalleryService);
  private readonly uiState = inject(DashboardUiState);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly demoEnabled = computed(() => this.shell?.demoEnabled() ?? false);

  protected readonly chatViewportRef = viewChild<ElementRef<HTMLDivElement>>('chatViewport');
  protected readonly chatHistoryRef = viewChild<ElementRef<HTMLDivElement>>('chatHistory');

  // UI state signals
  protected readonly detailsOpen = signal<boolean>(false);
  protected readonly composerContext = signal<MessageComposerContext | null>(null);
  protected readonly forwardModalMessage = signal<ChannelChatUiMessage | null>(null);
  protected readonly serverMembers = signal<ServerMemberDto[]>([]);
  protected readonly loadingMembers = signal<boolean>(false);
  protected readonly showScrollDownButton = signal<boolean>(false);
  protected readonly highlightedMessageId = signal<string | null>(null);

  protected readonly blockingState = this.uiState.blockingState;
  protected readonly connectionState = this.uiState.connectionState;

  private readonly params = toSignal(
    this.route.paramMap.pipe(
      map((params) => ({
        serverId: params.get('serverId'),
        channelId: params.get('channelId'),
      })),
    ),
    { initialValue: { serverId: null, channelId: null } },
  );

  protected readonly serverId = computed(() => this.params().serverId || '');
  protected readonly channelId = computed(() => this.params().channelId || '');

  protected readonly server = computed(() => {
    const sId = this.serverId();
    return sId ? this.serversStore?.serverOf(sId) : undefined;
  });

  protected readonly channel = computed(() => {
    const sId = this.serverId();
    const cId = this.channelId();
    if (!sId || !cId) return undefined;
    const storeChan = this.serversStore?.channelsOf(sId).find((c) => c.id === cId);
    if (storeChan) return storeChan;
    return this.shell?.channelOf(sId, cId);
  });

  protected readonly permissions = this.channelChat.permissions;
  protected readonly messages = this.channelChat.allMessages;
  protected readonly typingUserIds = this.channelChat.typingUserIds;

  // Thành viên server kèm live presence
  protected readonly membersWithPresence = computed(() => {
    const raw = this.serverMembers();
    const presenceMap = this.presenceService.presences();
    return raw.map((m) => {
      const livePres = presenceMap.get(m.userId);
      return {
        ...m,
        presence: (livePres?.status || 'offline') as PresenceStatus,
      };
    });
  });

  protected readonly onlineMembers = computed(() =>
    this.membersWithPresence().filter((m) => m.presence !== 'offline'),
  );

  protected readonly offlineMembers = computed(() =>
    this.membersWithPresence().filter((m) => m.presence === 'offline'),
  );

  constructor() {
    // Tự động load channel khi params thay đổi
    effect(() => {
      const sId = this.serverId();
      const cId = this.channelId();
      if (sId && cId) {
        untracked(() => {
          void this.initChannel(sId, cId);
        });
      }
    });

    // Smart scroll on new messages
    effect(() => {
      const msgs = this.messages();
      if (msgs.length > 0) {
        untracked(() => {
          this.handleMessagesChanged();
        });
      }
    });
  }

  async ngOnInit(): Promise<void> {
    if (this.serversStore && this.serversApi) {
      await this.serversStore.ensureHydrated(this.serversApi);
    }
  }

  ngAfterViewInit(): void {
    this.scrollToBottom('instant');
  }

  private async initChannel(serverId: string, channelId: string): Promise<void> {
    this.composerContext.set(null);
    this.forwardModalMessage.set(null);
    this.serversStore?.setActive(serverId, channelId);

    // Ensure hydration
    if (this.serversStore && this.serversApi) {
      await this.serversStore.ensureHydrated(this.serversApi);
    }

    // Load channel messages & permissions
    if (this.channelChat) {
      await this.channelChat.loadInitial(serverId, channelId);
    }

    // Load server members
    void this.loadMembers(serverId);

    // Scroll to bottom on initial load
    setTimeout(() => {
      this.scrollToBottom('instant');
    }, 50);
  }

  private async loadMembers(serverId: string): Promise<void> {
    if (!this.serversApi) return;
    this.loadingMembers.set(true);
    try {
      const members = await this.serversApi.getServerMembers(serverId);
      this.serverMembers.set(members);
    } catch {
      this.serverMembers.set([]);
    } finally {
      this.loadingMembers.set(false);
    }
  }

  protected clearUiState(): void {
    void this.uiState.clearPreview();
  }

  // --- Date and Unread Divider Helpers ---

  protected shouldShowDateDivider(index: number): boolean {
    const list = this.messages();
    if (index === 0) return true;
    const prev = list[index - 1];
    const curr = list[index];
    const dPrev = parseTimestamp(prev.createdAt);
    const dCurr = parseTimestamp(curr.createdAt);
    return !isSameCalendarDay(dPrev, dCurr);
  }

  protected getDateDividerLabel(index: number): string {
    const list = this.messages();
    const curr = list[index];
    return formatDateDividerLabel(curr.createdAt);
  }

  protected isUnreadDivider(index: number): boolean {
    const list = this.messages();
    const curr = list[index];
    const lastRead = this.channelChat.lastReadMessageId();
    if (!lastRead || curr.status !== 'persisted') return false;

    // Hiển thị divider ngay trước message đầu tiên chưa đọc
    const prev = index > 0 ? list[index - 1] : null;
    const isCurrUnread = compareMessageIds(curr.id, lastRead) > 0;
    const isPrevRead = !prev || prev.status !== 'persisted' || compareMessageIds(prev.id, lastRead) <= 0;

    return isCurrUnread && isPrevRead;
  }

  protected getPresentationVariant(msg: ChannelChatUiMessage): MessagePresentationVariant {
    return getMessagePresentationVariant(msg);
  }

  protected parseContent(content: string | null | undefined, id: string): MessageContentToken[] {
    return parseMessageContent(content, `ch-${id}`);
  }

  protected isCompact(index: number): boolean {
    const list = this.messages();
    if (index === 0) return false;
    const prev = list[index - 1];
    const curr = list[index];

    if (prev.authorId !== curr.authorId) return false;
    if (this.shouldShowDateDivider(index)) return false;
    if (this.isUnreadDivider(index)) return false;
    if (curr.replyToId) return false;

    const tPrev = parseTimestamp(prev.createdAt)?.getTime() ?? 0;
    const tCurr = parseTimestamp(curr.createdAt)?.getTime() ?? 0;
    return Math.abs(tCurr - tPrev) < 5 * 60 * 1000; // Trong vòng 5 phút
  }

  // --- Chat Actions ---

  protected async onSendMessage(payload: SendMessagePayload): Promise<void> {
    const context = this.composerContext();

    if (context?.kind === 'edit' && context.messageId) {
      await this.channelChat.editMessage(context.messageId, payload.content || '');
      this.composerContext.set(null);
      return;
    }

    const replyToId = context?.kind === 'reply' ? context.messageId : undefined;
    this.composerContext.set(null);

    await this.channelChat.sendMessage(payload.content, payload.files, replyToId);
    this.scrollToBottom('smooth');
  }

  protected onAction(event: MessageComposerContext): void {
    if (event.kind === 'forward' && event.messageId) {
      const msg = this.messages().find((m) => m.id === event.messageId);
      if (msg) {
        this.forwardModalMessage.set(msg);
      }
      return;
    }
    if (event.kind === 'delete' && event.messageId) {
      void this.onDeleteMessage(event.messageId);
      return;
    }
    this.composerContext.set(event);
  }

  protected async onDeleteMessage(messageId: string): Promise<void> {
    if (confirm('Bạn có chắc chắn muốn xóa tin nhắn này không?')) {
      await this.channelChat.deleteMessage(messageId);
    }
  }

  protected async onToggleReaction(messageId: string, emoji: string): Promise<void> {
    const msg = this.messages().find((m) => m.id === messageId);
    const reaction = msg?.reactions?.find((r) => r.emoji === emoji);
    const reactedByMe = reaction?.reactedByMe ?? false;
    await this.channelChat.setReaction(messageId, emoji, !reactedByMe);
  }

  protected onComposerTyping(): void {
    this.channelChat.startTyping();
  }

  protected onRetry(clientNonce: string): void {
    void this.channelChat.retrySendMessage(clientNonce);
  }

  protected onCancel(clientNonce: string): void {
    this.channelChat.cancelOptimisticMessage(clientNonce);
  }

  protected openSettings(): void {
    const ch = this.channel();
    const sId = this.serverId();
    if (!ch || !sId) return;

    const ref = this.dialog.open(ChannelSettingsModal, {
      data: { channel: ch, serverId: sId },
      width: '900px',
      maxWidth: '96vw',
      height: '620px',
      maxHeight: '92vh',
      panelClass: 'channel-settings-dialog-panel',
    });

    ref.afterClosed().subscribe((res) => {
      if (res?.deleted) {
        const remaining = this.serversStore?.channelsOf(sId) || [];
        const next = remaining.find((c) => c.type === 'text') || remaining[0];
        if (next) {
          void this.router.navigate(['/channels', sId, next.id]);
        } else {
          void this.router.navigate(['/channels', sId]);
        }
      }
    });
  }

  protected openLightbox(msg: ChannelChatUiMessage, att: AttachmentResponseDto): void {
    if (!att.signedUrl) return;
    const allAttachments = (msg.attachments || []).filter((a) => a.mimeType?.startsWith('image/'));
    const items: LightboxMediaItem[] = allAttachments.map((a) => ({
      messageId: msg.id,
      attachmentId: a.id,
      filename: a.filename,
      mimeType: a.mimeType || 'image/png',
      url: a.signedUrl || '',
      sizeBytes: a.sizeBytes,
    }));

    const initialActiveId = { messageId: msg.id, attachmentId: att.id };
    this.lightbox.open({
      items,
      initialActiveId,
    });
  }

  protected jumpToMessage(messageId: string): void {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.highlightedMessageId.set(messageId);
      setTimeout(() => {
        this.highlightedMessageId.set(null);
      }, 2000);
    }
  }

  // --- Scroll & Pagination ---

  protected onScrollHistory(): void {
    const el = this.chatHistoryRef()?.nativeElement;
    if (!el) return;

    // Load more when scrolled to top
    if (el.scrollTop < 80 && this.channelChat.hasMore() && !this.channelChat.loadingMore()) {
      const prevScrollHeight = el.scrollHeight;
      const prevScrollTop = el.scrollTop;

      void this.channelChat.loadMore().then(() => {
        setTimeout(() => {
          if (el) {
            el.scrollTop = el.scrollHeight - prevScrollHeight + prevScrollTop;
          }
        }, 0);
      });
    }

    // Check if scrolled up
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    this.showScrollDownButton.set(!isNearBottom);

    // Mark as read if near bottom
    if (isNearBottom) {
      const msgs = this.messages();
      const lastPersisted = [...msgs].reverse().find((m) => m.status === 'persisted');
      if (lastPersisted) {
        void this.channelChat.markAsRead(lastPersisted.id);
      }
    }
  }

  protected scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    const el = this.chatHistoryRef()?.nativeElement;
    if (el) {
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ top: el.scrollHeight, behavior });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    }
  }

  private handleMessagesChanged(): void {
    const el = this.chatHistoryRef()?.nativeElement;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 180;
    if (isNearBottom) {
      setTimeout(() => {
        this.scrollToBottom('smooth');
      }, 30);
    }
  }
}
