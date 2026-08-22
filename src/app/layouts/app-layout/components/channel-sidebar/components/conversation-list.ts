import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { ShellData } from '../../../../../core/api/shell-data';
import {
  ConversationsApiService,
  type ConversationResponseDto,
} from '../../../../../core/api/conversations-api.service';
import type { PresenceStatus } from '../../../../../../shared/dto/common';
import { ChatSocketService } from '../../../../../core/realtime/chat-socket.service';
import { Avatar } from '../../../../../shared/ui/avatar/avatar';
import { SectionLabel } from '../../../../../shared/ui/section-label/section-label';
import { UnreadBadge } from '../../../../../shared/ui/unread-badge/unread-badge';

export interface DisplayConversation {
  id: string;
  name: string;
  avatarUrl: string | null;
  presence: 'online' | 'idle' | 'dnd' | 'offline';
  statusMessage: string | null;
  unread: boolean;
  unreadCount: number;
}

/**
 * Danh sách tin nhắn riêng — nội dung cột 2 khi ở khu `/channels/@me`.
 *
 * Tải dữ liệu thật từ ConversationsApiService khi ở chế độ thật,
 * hoặc dùng dữ liệu ShellData khi bật chế độ demo.
 */
@Component({
  selector: 'app-conversation-list',
  imports: [
    Avatar,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    RouterLink,
    RouterLinkActive,
    SectionLabel,
    UnreadBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './conversation-list.html',
  styleUrl: './conversation-list.css',
})
export class ConversationList implements OnInit, OnDestroy {
  private readonly shell = inject(ShellData);
  private readonly conversationsApi = inject(ConversationsApiService);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly subs = new Subscription();

  readonly query = input('');

  readonly realConversations = signal<ConversationResponseDto[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  protected readonly hasQuery = computed(() => this.normalize(this.query()).length > 0);

  protected readonly conversations = computed<DisplayConversation[]>(() => {
    const query = this.normalize(this.query());

    let list: DisplayConversation[];
    if (this.shell.demoEnabled()) {
      list = this.shell.conversations().map((c) => ({
        id: c.id,
        name: c.name,
        avatarUrl: null,
        presence: c.presence,
        statusMessage: c.statusMessage ?? null,
        unread: Boolean(c.unread),
        unreadCount: c.unread ? 1 : 0,
      }));
    } else {
      list = this.realConversations().map((c) => {
        const name =
          c.recipient?.displayName ||
          c.recipient?.username ||
          c.name ||
          'Người dùng';
        return {
          id: c.id,
          name,
          avatarUrl: c.recipient?.avatarUrl || c.iconUrl || null,
          presence: (c.recipient?.presence as PresenceStatus) || 'offline',
          statusMessage: c.recipient?.statusMessage || null,
          unread: c.unreadCount > 0,
          unreadCount: c.unreadCount,
        };
      });
    }

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
    if (!this.shell.demoEnabled()) {
      void this.loadRealConversations();
      this.setupRealtimeListeners();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  async loadRealConversations(): Promise<void> {
    try {
      const list = await this.conversationsApi.listConversations();
      this.realConversations.set(list ?? []);
      this.error.set(null);
    } catch {
      this.realConversations.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private setupRealtimeListeners(): void {
    // Khi có tin nhắn mới hoặc đọc tin nhắn, cập nhật unreadCount
    this.subs.add(
      this.chatSocket.messageCreated$.subscribe(({ message }) => {
        if (!message.conversationId) return;
        this.realConversations.update((list) =>
          list.map((conv) =>
            conv.id === message.conversationId
              ? { ...conv, unreadCount: conv.unreadCount + 1 }
              : conv,
          ),
        );
      }),
    );

    this.subs.add(
      this.chatSocket.messageRead$.subscribe(({ conversationId }) => {
        this.realConversations.update((list) =>
          list.map((conv) =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv,
          ),
        );
      }),
    );
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLocaleLowerCase('vi')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
