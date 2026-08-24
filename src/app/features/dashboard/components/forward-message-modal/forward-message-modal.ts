import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ConversationResponseDto,
  ConversationsApiService,
} from '../../../../core/api/conversations-api.service';
import {
  MessageResponseDto,
  MessagesApiService,
} from '../../../../core/api/messages-api.service';
import { ServersStore } from '../../../../core/servers/servers.store';
import { extractErrorMessage } from '../../../../core/utils/error.util';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { ChatUiMessage } from '../../services/active-chat.store';
import type { PresenceStatus } from '../../../../../shared/dto/common';

export interface ForwardTargetItem {
  id: string;
  type: 'conversation' | 'channel';
  name: string;
  subtitle?: string;
  icon?: string;
  avatarName?: string;
  avatarUrl?: string | null;
  presence?: PresenceStatus | null;
}

@Component({
  selector: 'app-forward-message-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    Avatar,
  ],
  templateUrl: './forward-message-modal.html',
  styleUrl: './forward-message-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'forward-dialog-title',
  },
})
export class ForwardMessageModal implements OnInit {
  private readonly conversationsApi = inject(ConversationsApiService);
  private readonly messagesApi = inject(MessagesApiService);
  private readonly serversStore = inject(ServersStore);

  readonly message = input.required<ChatUiMessage | MessageResponseDto>();
  readonly currentConversationId = input<string | null>(null);
  readonly currentChannelId = input<string | null>(null);

  readonly close = output<void>();
  readonly forwardSuccess = output<MessageResponseDto>();

  readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly targets = signal<ForwardTargetItem[]>([]);
  readonly searchQuery = signal<string>('');
  readonly selectedTarget = signal<ForwardTargetItem | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.isSubmitting()) {
      this.close.emit();
    }
  }

  async ngOnInit(): Promise<void> {
    await this.loadTargets();
    setTimeout(() => {
      this.searchInputRef()?.nativeElement?.focus();
    }, 50);
  }

  async loadTargets(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const items: ForwardTargetItem[] = [];

      // 1. Direct Messages
      try {
        const convList = await this.conversationsApi.listConversations();
        const currentConv = this.currentConversationId();
        for (const c of convList) {
          if (c.id === currentConv) continue;
          items.push({
            id: c.id,
            type: 'conversation',
            name: c.recipient?.displayName || c.recipient?.username || c.name || 'Tin nhắn riêng',
            subtitle: c.recipient?.username ? `@${c.recipient.username}` : undefined,
            avatarName: c.recipient?.displayName || c.recipient?.username || c.name || 'Hội thoại',
            avatarUrl: c.recipient?.avatarUrl || c.iconUrl || null,
            presence: (c.recipient?.presence as PresenceStatus) || null,
          });
        }
      } catch {}

      // 2. Server Channels
      const servers = this.serversStore.servers();
      const currentChan = this.currentChannelId();
      for (const s of servers) {
        const channels = this.serversStore.channelsOf(s.id);
        for (const ch of channels) {
          if (ch.id === currentChan || ch.type === 'voice') continue;
          items.push({
            id: ch.id,
            type: 'channel',
            name: `#${ch.name}`,
            subtitle: s.name,
            icon: 'tag',
          });
        }
      }

      this.targets.set(items);
    } catch (err: unknown) {
      this.errorMessage.set(
        extractErrorMessage(
          err,
          'Không thể tải danh sách đích chuyển tiếp. Vui lòng thử lại.',
        ),
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  get filteredTargets(): ForwardTargetItem[] {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.targets();
    if (!q) return list;

    return list.filter((t) => {
      const name = t.name.toLowerCase();
      const sub = (t.subtitle || '').toLowerCase();
      return name.includes(q) || sub.includes(q);
    });
  }

  selectTarget(target: ForwardTargetItem): void {
    if (this.isSubmitting()) return;
    this.selectedTarget.set(target);
    this.errorMessage.set(null);
  }

  async submitForward(): Promise<void> {
    const target = this.selectedTarget();
    const srcMsg = this.message();
    const srcConvId = this.currentConversationId() || srcMsg.conversationId;
    const srcChanId = this.currentChannelId() || srcMsg.channelId;

    if (!target || (!srcConvId && !srcChanId) || !srcMsg.id || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      const clientNonce = crypto.randomUUID();
      let res: MessageResponseDto;

      if (srcChanId) {
        // Forward from Channel
        res = await this.messagesApi.forwardChannelMessage(srcChanId, srcMsg.id, {
          targetConversationId: target.type === 'conversation' ? target.id : undefined,
          targetChannelId: target.type === 'channel' ? target.id : undefined,
          clientNonce,
        });
      } else {
        // Forward from DM
        res = await this.messagesApi.forwardMessage(srcConvId!, srcMsg.id, {
          targetConversationId: target.type === 'conversation' ? target.id : undefined,
          targetChannelId: target.type === 'channel' ? target.id : undefined,
          clientNonce,
        });
      }

      this.forwardSuccess.emit(res);
      this.close.emit();
    } catch (err: unknown) {
      this.errorMessage.set(
        extractErrorMessage(
          err,
          'Chuyển tiếp tin nhắn thất bại. Vui lòng thử lại.',
        ),
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  getAttachmentSummary(): string | null {
    const msg = this.message();
    const atts = msg.attachments;
    if (!atts || atts.length === 0) return null;

    const count = atts.length;
    const hasGif = atts.some((a) => a.mimeType === 'image/gif');
    const hasImage = atts.some(
      (a) => a.mimeType.startsWith('image/') && a.mimeType !== 'image/gif',
    );
    const hasDoc = atts.some((a) => !a.mimeType.startsWith('image/'));

    const types: string[] = [];
    if (hasGif) types.push('GIF');
    if (hasImage) types.push('ảnh');
    if (hasDoc) types.push('tệp đính kèm');

    return `${count} ${types.join(', ')}`;
  }
}
