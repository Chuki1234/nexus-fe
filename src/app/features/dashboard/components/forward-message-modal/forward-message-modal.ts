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
import { extractErrorMessage } from '../../../../core/utils/error.util';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { ChatUiMessage } from '../../services/active-chat.store';

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

  readonly message = input.required<ChatUiMessage | MessageResponseDto>();
  readonly currentConversationId = input<string | null>(null);

  readonly close = output<void>();
  readonly forwardSuccess = output<MessageResponseDto>();

  readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly conversations = signal<ConversationResponseDto[]>([]);
  readonly searchQuery = signal<string>('');
  readonly selectedConversationId = signal<string | null>(null);
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
    await this.loadConversations();
    setTimeout(() => {
      this.searchInputRef()?.nativeElement?.focus();
    }, 50);
  }

  async loadConversations(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const list = await this.conversationsApi.listConversations();
      // Lọc bỏ cuộc trò chuyện hiện tại
      const currentId = this.currentConversationId();
      const filtered = list.filter((c) => c.id !== currentId);
      this.conversations.set(filtered);
    } catch (err: unknown) {
      this.errorMessage.set(
        extractErrorMessage(
          err,
          'Không thể tải danh sách cuộc trò chuyện. Vui lòng thử lại.',
        ),
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  get filteredConversations(): ConversationResponseDto[] {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.conversations();
    if (!q) return list;

    return list.filter((c) => {
      const displayName = (c.recipient?.displayName || '').toLowerCase();
      const username = (c.recipient?.username || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      return (
        displayName.includes(q) || username.includes(q) || name.includes(q)
      );
    });
  }

  selectConversation(convId: string): void {
    if (this.isSubmitting()) return;
    this.selectedConversationId.set(convId);
    this.errorMessage.set(null);
  }

  async submitForward(): Promise<void> {
    const targetId = this.selectedConversationId();
    const srcMsg = this.message();
    const srcConvId = this.currentConversationId() || srcMsg.conversationId;

    if (!targetId || !srcConvId || !srcMsg.id || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      const clientNonce = crypto.randomUUID();
      const res = await this.messagesApi.forwardMessage(srcConvId, srcMsg.id, {
        targetConversationId: targetId,
        clientNonce,
      });

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
