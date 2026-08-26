import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  OnInit,
  output,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { ChannelSummary } from '../../../../../core/servers/server.models';
import { AuthService } from '../../../../../core/auth/auth.service';
import {
  ChannelChatStore,
  type ChannelChatUiMessage,
} from '../../../../dashboard/services/channel-chat.store';
import { ChatScrollController } from '../../../../../core/utils/chat-scroll.controller';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { MessageActions } from '../../../../dashboard/components/message-actions/message-actions';
import {
  MessageComposer,
  type MessageComposerContext,
  type SendMessagePayload,
} from '../../../../dashboard/components/message-composer/message-composer';
import { ForwardMessageModal } from '../../../../dashboard/components/forward-message-modal/forward-message-modal';
import { GiphyMessageEmbedComponent } from '../../../../dashboard/components/giphy-message-embed/giphy-message-embed.component';
import {
  parseMessageContent,
  type MessageContentToken,
} from '../../../../dashboard/conversation/utils/message-content-parser';
import { formatMessageTimestamp } from '../../../../../core/utils/date-format.util';
import { InlineMessageEditor } from '../../../../dashboard/components/inline-message-editor/inline-message-editor';
import { MessageClockService } from '../../../../../core/utils/message-clock.service';
import { canEditMessage } from '../../../../../../shared/dto/messages.dto';
import { extractErrorMessage } from '../../../../../core/utils/error.util';

@Component({
  selector: 'app-voice-chat-drawer',
  imports: [
    FormsModule,
    Avatar,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MessageActions,
    MessageComposer,
    ForwardMessageModal,
    GiphyMessageEmbedComponent,
    InlineMessageEditor,
  ],
  providers: [ChannelChatStore, MessageClockService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './voice-chat-drawer.html',
  styleUrl: './voice-chat-drawer.css',
  host: {
    class: 'flex size-full min-h-0 flex-col overflow-hidden bg-surface border-l border-hairline',
  },
})
export class VoiceChatDrawer implements OnInit {
  readonly channelChat = inject(ChannelChatStore);
  readonly auth = inject(AuthService);
  readonly messageClock = inject(MessageClockService);
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly serverId = input.required<string>();
  readonly channel = input.required<ChannelSummary>();
  readonly closed = output<void>();

  readonly composerContext = signal<MessageComposerContext | null>(null);
  readonly forwardModalMessage = signal<ChannelChatUiMessage | null>(null);

  readonly editingMessageId = signal<string | null>(null);
  readonly editingSaving = signal<boolean>(false);
  readonly editingError = signal<string | null>(null);

  private readonly processedMessageIds = new Set<string>();

  protected readonly messageListContainer = viewChild<ElementRef<HTMLDivElement>>('messageListContainer');
  protected readonly messageContent = viewChild<ElementRef<HTMLDivElement>>('messageContent');

  readonly scrollController = new ChatScrollController({
    getContainer: () => this.messageListContainer()?.nativeElement,
    getContentWrapper: () =>
      this.messageContent()?.nativeElement ||
      (this.messageListContainer()?.nativeElement.firstElementChild as HTMLElement) ||
      this.messageListContainer()?.nativeElement,
    injector: this.injector,
    platformId: this.platformId,
    threshold: 120,
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.scrollController.destroy();
    });

    // Reactive Smart Scroll for Voice Chat Drawer
    effect(() => {
      const msgs = this.channelChat.allMessages();
      const isLoading = this.channelChat.loadingInitial();
      const isLoadingMore = this.channelChat.loadingMore();
      const sId = this.serverId();
      const ch = this.channel();
      const myId = this.auth.user()?.id;

      if (!sId || !ch || isLoading || isLoadingMore) {
        return;
      }

      const targetKey = `${sId}:${ch.id}`;

      untracked(() => {
        if (msgs.length === 0) {
          this.processedMessageIds.clear();
          return;
        }

        // 1. Initial history: thực hiện đúng 1 lần instant scroll
        if (!this.scrollController.hasScrolledInitial) {
          for (const m of msgs) {
            const k = m.id || m.clientNonce;
            if (k) this.processedMessageIds.add(k);
          }
          this.scrollController.handleInitialRender(
            targetKey,
            this.scrollController.generation,
          );
          return;
        }

        // 2. Realtime messages:
        const newMsgs: ChannelChatUiMessage[] = [];
        for (const m of msgs) {
          const k = m.id || m.clientNonce;
          if (k && !this.processedMessageIds.has(k)) {
            this.processedMessageIds.add(k);
            newMsgs.push(m);
          }
        }

        if (newMsgs.length === 0) return;

        const { wasNearBottom } = this.scrollController.capturePreMutationState();
        const hasOwnMessage = newMsgs.some((m) => m.authorId === myId);
        const inboundCount = newMsgs.filter(
          (m) => m.authorId !== myId && m.status === 'persisted',
        ).length;

        this.scrollController.handleRealtimeAppend(
          targetKey,
          this.scrollController.generation,
          {
            isMine: hasOwnMessage,
            wasNearBottom,
            count: inboundCount,
          },
        );
      });
    });
  }

  ngOnInit(): void {
    const sId = this.serverId();
    const ch = this.channel();
    if (sId && ch?.id) {
      const targetKey = `${sId}:${ch.id}`;
      this.scrollController.reset(targetKey);
      this.processedMessageIds.clear();
      void this.channelChat.loadInitial(sId, ch.id);
    }
  }

  protected onScroll(): void {
    const el = this.messageListContainer()?.nativeElement;
    if (!el) return;

    this.scrollController.onScroll();

    if (el.scrollTop < 80 && this.channelChat.hasMore() && !this.channelChat.loadingMore()) {
      const prevScrollHeight = el.scrollHeight;
      const prevScrollTop = el.scrollTop;
      const targetKey = `${this.serverId()}:${this.channel().id}`;
      const gen = this.scrollController.generation;

      void this.channelChat.loadMore().then(() => {
        this.scrollController.preserveScrollOnPrepend(
          prevScrollHeight,
          prevScrollTop,
          targetKey,
          gen,
        );
      });
    }
  }

  protected scrollToLatest(): void {
    this.scrollController.scrollToLatest('smooth');
    const msgs = this.channelChat.allMessages();
    const lastPersisted = [...msgs].reverse().find((m) => m.status === 'persisted' && m.id);
    if (lastPersisted?.id) {
      void this.channelChat.markAsRead(lastPersisted.id);
    }
  }

  protected parseContent(content: string | null | undefined, id: string): MessageContentToken[] {
    return parseMessageContent(content, `vch-${id}`);
  }

  protected async onSendMessage(payload: SendMessagePayload): Promise<void> {
    const context = this.composerContext();

    if (context?.kind === 'edit' && context.messageId) {
      await this.channelChat.editMessage(context.messageId, payload.content || '');
      this.composerContext.set(null);
      return;
    }

    const replyToId = context?.kind === 'reply' ? context.messageId : undefined;
    this.composerContext.set(null);

    await this.channelChat.sendMessage({
      content: payload.content,
      files: payload.files,
      replyToId,
      externalMedia: payload.externalMedia,
    });
    this.scrollController.scrollToBottom('smooth');
  }

  protected isMine(msg: ChannelChatUiMessage): boolean {
    const uid = this.auth.user()?.id;
    return Boolean(uid && msg.authorId === uid);
  }

  protected canEdit(msg: ChannelChatUiMessage): boolean {
    return canEditMessage(msg, this.auth.user()?.id, this.messageClock.now());
  }

  protected startEdit(msg: ChannelChatUiMessage): void {
    this.editingMessageId.set(msg.id);
    this.editingError.set(null);
  }

  protected cancelInlineEdit(): void {
    this.editingMessageId.set(null);
    this.editingError.set(null);
  }

  protected async saveInlineEdit(messageId: string, newContent: string): Promise<void> {
    try {
      this.editingSaving.set(true);
      this.editingError.set(null);
      await this.channelChat.editMessage(messageId, newContent);
      this.editingMessageId.set(null);
    } catch (err: unknown) {
      this.editingError.set(extractErrorMessage(err, 'Lỗi khi chỉnh sửa tin nhắn.'));
    } finally {
      this.editingSaving.set(false);
    }
  }

  protected onAction(event: MessageComposerContext): void {
    if (event.kind === 'edit' && event.messageId) {
      const msg = this.channelChat.allMessages().find((m) => m.id === event.messageId);
      if (msg) {
        this.startEdit(msg);
      }
      return;
    }
    if (event.kind === 'forward' && event.messageId) {
      const msg = this.channelChat.allMessages().find((m) => m.id === event.messageId);
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
    const msg = this.channelChat.allMessages().find((m) => m.id === messageId);
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

  protected formatMessageTime(dateStr: string | null | undefined): string {
    return formatMessageTimestamp(dateStr);
  }
}
