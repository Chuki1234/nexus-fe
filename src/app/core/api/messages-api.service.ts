import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { GiphyMediaDto } from '../../../shared/dto/messages.dto';

export interface MessageAuthorDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface AttachmentResponseDto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  signedUrl: string | null;
  isAvailable?: boolean;
}

export interface ReactionSummaryDto {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface MessageResponseDto {
  id: string;
  channelId: string | null;
  conversationId: string | null;
  authorId: string | null;
  author?: MessageAuthorDto;
  type: 'default' | 'system_join' | 'system_leave';
  content: string | null;
  replyToId: string | null;
  clientNonce: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  isForwarded: boolean;
  externalMedia: GiphyMediaDto | null;
  attachments?: AttachmentResponseDto[];
  reactions?: ReactionSummaryDto[];
  /** Thời điểm được ghim (null/vắng nếu chưa ghim). */
  pinnedAt?: string | null;
  /** Người ghim (null/vắng nếu chưa ghim). */
  pinnedBy?: string | null;
  createdAt: string;
}

export interface MessagesPaginationResponseDto {
  messages: MessageResponseDto[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface ChannelMessagesResponseDto extends MessagesPaginationResponseDto {
  lastReadMessageId?: string | null;
}

export interface ChannelSearchResponseDto {
  messages: MessageResponseDto[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface SendMessageDto {
  content?: string;
  clientNonce?: string;
  replyToId?: string;
  files?: File[];
  externalMedia?: GiphyMediaDto;
}

export interface EditMessageDto {
  content: string;
}

export interface ForwardMessageDto {
  targetConversationId?: string;
  targetChannelId?: string;
  clientNonce: string;
}

export interface SetReactionDto {
  emoji: string;
  reacted: boolean;
  clientMutationId?: string;
}

export interface SetReactionResponseDto {
  messageId: string;
  conversationId?: string | null;
  channelId?: string | null;
  clientMutationId?: string;
  reactions: ReactionSummaryDto[];
}

export interface GetMessagesQueryDto {
  limit?: number;
  before?: string;
  after?: string;
}

@Injectable({
  providedIn: 'root',
})
export class MessagesApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = environment.apiUrl;

  // ---------------------------------------------------------------------------
  // Conversation (DM) API
  // ---------------------------------------------------------------------------

  /**
   * Tải lịch sử tin nhắn trong cuộc trò chuyện (Cursor Pagination).
   */
  async getMessages(
    conversationId: string,
    query?: GetMessagesQueryDto,
  ): Promise<MessagesPaginationResponseDto> {
    let params = new HttpParams();
    if (query?.limit != null) {
      params = params.set('limit', query.limit.toString());
    }
    if (query?.before) {
      params = params.set('before', query.before);
    }
    if (query?.after) {
      params = params.set('after', query.after);
    }

    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .get<MessagesPaginationResponseDto>(
          `${this.baseUrl}/conversations/${conversationId}/messages`,
          {
            headers,
            params,
          },
        )
        .pipe(timeout(15000)),
    );
  }

  /**
   * Gửi tin nhắn mới vào cuộc trò chuyện (hỗ trợ text và file đính kèm).
   */
  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const headers = await this.getAuthHeaders();
    if (dto.files && dto.files.length > 0) {
      const formData = new FormData();
      if (dto.content) {
        formData.append('content', dto.content);
      }
      if (dto.clientNonce) {
        formData.append('clientNonce', dto.clientNonce);
      }
      if (dto.replyToId) {
        formData.append('replyToId', dto.replyToId);
      }
      if (dto.externalMedia) {
        formData.append('externalMedia', JSON.stringify(dto.externalMedia));
      }
      for (const file of dto.files) {
        formData.append('files', file);
      }
      return firstValueFrom(
        this.http
          .post<MessageResponseDto>(
            `${this.baseUrl}/conversations/${conversationId}/messages`,
            formData,
            { headers },
          )
          .pipe(timeout(15000)),
      );
    }

    return firstValueFrom(
      this.http
        .post<MessageResponseDto>(
          `${this.baseUrl}/conversations/${conversationId}/messages`,
          dto,
          { headers },
        )
        .pipe(timeout(15000)),
    );
  }

  /**
   * Tải lại signed URL mới cho attachment khi URL cũ hết hạn (401/403) trong cuộc trò chuyện.
   */
  async getAttachmentSignedUrl(
    conversationId: string,
    attachmentId: string,
  ): Promise<{ signedUrl: string }> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .get<{ signedUrl: string }>(
          `${this.baseUrl}/conversations/${conversationId}/attachments/${attachmentId}/signed-url`,
          { headers },
        )
        .pipe(timeout(15000)),
    );
  }

  /**
   * Thêm hoặc xóa reaction cho tin nhắn theo desired state (Idempotent) trong DM.
   */
  async setReaction(
    conversationId: string,
    messageId: string,
    dto: SetReactionDto,
  ): Promise<SetReactionResponseDto> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<SetReactionResponseDto>(
          `${this.baseUrl}/conversations/${conversationId}/messages/${messageId}/reactions`,
          dto,
          { headers },
        )
        .pipe(timeout(15000)),
    );
  }

  /**
   * Chuyển tiếp tin nhắn từ cuộc trò chuyện.
   */
  async forwardMessage(
    conversationId: string,
    messageId: string,
    dto: ForwardMessageDto,
  ): Promise<MessageResponseDto> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<MessageResponseDto>(
          `${this.baseUrl}/conversations/${conversationId}/messages/${messageId}/forward`,
          dto,
          { headers },
        )
        .pipe(timeout(20000)),
    );
  }

  /**
   * Đánh dấu đã đọc tin nhắn trong cuộc trò chuyện.
   */
  async markAsRead(
    conversationId: string,
    messageId: string,
  ): Promise<{ success: boolean; updated?: boolean; lastReadMessageId?: string }> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<{ success: boolean; updated?: boolean; lastReadMessageId?: string }>(
          `${this.baseUrl}/conversations/${conversationId}/read`,
          { messageId },
          { headers },
        )
        .pipe(timeout(15000)),
    );
  }

  // ---------------------------------------------------------------------------
  // Server Channel API
  // ---------------------------------------------------------------------------

  /**
   * Tải lịch sử tin nhắn trong kênh máy chủ (Cursor Pagination + lastReadMessageId).
   */
  async getChannelMessages(
    channelId: string,
    query?: GetMessagesQueryDto,
  ): Promise<ChannelMessagesResponseDto> {
    let params = new HttpParams();
    if (query?.limit != null) {
      params = params.set('limit', query.limit.toString());
    }
    if (query?.before) {
      params = params.set('before', query.before);
    }
    if (query?.after) {
      params = params.set('after', query.after);
    }

    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .get<ChannelMessagesResponseDto>(
          `${this.baseUrl}/channels/${channelId}/messages`,
          {
            headers,
            params,
          },
        )
        .pipe(timeout(15000)),
    );
  }

  /**
   * Gửi tin nhắn mới vào kênh máy chủ (hỗ trợ text và file đính kèm).
   */
  async sendChannelMessage(
    channelId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const headers = await this.getAuthHeaders();
    if (dto.files && dto.files.length > 0) {
      const formData = new FormData();
      if (dto.content) {
        formData.append('content', dto.content);
      }
      if (dto.clientNonce) {
        formData.append('clientNonce', dto.clientNonce);
      }
      if (dto.replyToId) {
        formData.append('replyToId', dto.replyToId);
      }
      if (dto.externalMedia) {
        formData.append('externalMedia', JSON.stringify(dto.externalMedia));
      }
      for (const file of dto.files) {
        formData.append('files', file);
      }
      return firstValueFrom(
        this.http
          .post<MessageResponseDto>(
            `${this.baseUrl}/channels/${channelId}/messages`,
            formData,
            { headers },
          )
          .pipe(timeout(15000)),
      );
    }

    return firstValueFrom(
      this.http
        .post<MessageResponseDto>(
          `${this.baseUrl}/channels/${channelId}/messages`,
          dto,
          { headers },
        )
        .pipe(timeout(15000)),
    );
  }

  /**
   * Tải lại signed URL mới cho attachment trong kênh máy chủ khi URL cũ hết hạn.
   */
  async getChannelAttachmentSignedUrl(
    channelId: string,
    attachmentId: string,
  ): Promise<{ signedUrl: string }> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .get<{ signedUrl: string }>(
          `${this.baseUrl}/channels/${channelId}/attachments/${attachmentId}/signed-url`,
          { headers },
        )
        .pipe(timeout(15000)),
    );
  }

  /**
   * Thêm hoặc xóa reaction cho tin nhắn trong kênh máy chủ.
   */
  async setChannelReaction(
    channelId: string,
    messageId: string,
    dto: SetReactionDto,
  ): Promise<SetReactionResponseDto> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<SetReactionResponseDto>(
          `${this.baseUrl}/channels/${channelId}/messages/${messageId}/reactions`,
          dto,
          { headers },
        )
        .pipe(timeout(15000)),
    );
  }

  /**
   * Chuyển tiếp tin nhắn từ kênh máy chủ.
   */
  async forwardChannelMessage(
    channelId: string,
    messageId: string,
    dto: ForwardMessageDto,
  ): Promise<MessageResponseDto> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<MessageResponseDto>(
          `${this.baseUrl}/channels/${channelId}/messages/${messageId}/forward`,
          dto,
          { headers },
        )
        .pipe(timeout(20000)),
    );
  }

  /**
   * Đánh dấu đã đọc tin nhắn trong kênh máy chủ.
   */
  async markChannelAsRead(
    channelId: string,
    messageId: string,
  ): Promise<{ success: boolean; updated?: boolean; lastReadMessageId?: string }> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<{ success: boolean; updated?: boolean; lastReadMessageId?: string }>(
          `${this.baseUrl}/channels/${channelId}/read`,
          { messageId },
          { headers },
        )
        .pipe(timeout(15000)),
    );
  }

  // ---------------------------------------------------------------------------
  // Message Common API
  // ---------------------------------------------------------------------------

  /**
   * Tìm kiếm tin nhắn (nội dung + tên file) trong phạm vi một kênh.
   */
  async searchChannelMessages(
    channelId: string,
    query: string,
    opts?: { limit?: number; before?: string },
  ): Promise<ChannelSearchResponseDto> {
    let params = new HttpParams().set('q', query);
    if (opts?.limit != null) {
      params = params.set('limit', opts.limit.toString());
    }
    if (opts?.before) {
      params = params.set('before', opts.before);
    }
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .get<ChannelSearchResponseDto>(
          `${this.baseUrl}/channels/${channelId}/messages/search`,
          { headers, params },
        )
        .pipe(timeout(15000)),
    );
  }

  /**
   * Danh sách tin nhắn đã ghim của một kênh.
   */
  async getChannelPins(channelId: string): Promise<MessageResponseDto[]> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .get<MessageResponseDto[]>(`${this.baseUrl}/channels/${channelId}/pins`, {
          headers,
        })
        .pipe(timeout(15000)),
    );
  }

  /**
   * Ghim một tin nhắn trong kênh.
   */
  async pinMessage(messageId: string): Promise<MessageResponseDto> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<MessageResponseDto>(
          `${this.baseUrl}/messages/${messageId}/pin`,
          {},
          { headers },
        )
        .pipe(timeout(15000)),
    );
  }

  /**
   * Bỏ ghim một tin nhắn trong kênh.
   */
  async unpinMessage(messageId: string): Promise<MessageResponseDto> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .delete<MessageResponseDto>(`${this.baseUrl}/messages/${messageId}/pin`, {
          headers,
        })
        .pipe(timeout(15000)),
    );
  }

  /**
   * Chỉnh sửa tin nhắn của chính mình.
   */
  async editMessage(
    messageId: string,
    dto: EditMessageDto,
  ): Promise<MessageResponseDto> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .patch<MessageResponseDto>(
          `${this.baseUrl}/messages/${messageId}`,
          dto,
          { headers },
        )
        .pipe(timeout(15000)),
    );
  }

  /**
   * Ẩn tin nhắn chỉ riêng ở phía người dùng (Hide for Me).
   */
  async hideMessage(
    messageId: string,
  ): Promise<{ id: string; hidden: boolean; scope: 'for_me'; conversationId: string | null; channelId: string | null }> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<{ id: string; hidden: boolean; scope: 'for_me'; conversationId: string | null; channelId: string | null }>(
          `${this.baseUrl}/messages/${messageId}/hide`,
          {},
          { headers },
        )
        .pipe(timeout(15000)),
    );
  }

  /**
   * Thu hồi tin nhắn đối với tất cả mọi người trong cuộc trò chuyện (Recall for Everyone).
   */
  async recallMessage(
    messageId: string,
  ): Promise<{ id: string; deleted: boolean; scope: 'everyone'; conversationId: string | null; channelId: string | null }> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<{ id: string; deleted: boolean; scope: 'everyone'; conversationId: string | null; channelId: string | null }>(
          `${this.baseUrl}/messages/${messageId}/recall`,
          {},
          { headers },
        )
        .pipe(timeout(15000)),
    );
  }

  /**
   * Xoá / Thu hồi tin nhắn (hỗ trợ scope: 'for_me' | 'everyone').
   */
  async deleteMessage(
    messageId: string,
    scope: 'for_me' | 'everyone' = 'for_me',
  ): Promise<{ id: string; deleted?: boolean; hidden?: boolean; scope: 'for_me' | 'everyone'; conversationId: string | null; channelId: string | null }> {
    const headers = await this.getAuthHeaders();
    const params = new HttpParams().set('scope', scope);
    return firstValueFrom(
      this.http
        .delete<{ id: string; deleted?: boolean; hidden?: boolean; scope: 'for_me' | 'everyone'; conversationId: string | null; channelId: string | null }>(
          `${this.baseUrl}/messages/${messageId}`,
          { headers, params },
        )
        .pipe(timeout(15000)),
    );
  }

  private async getAuthHeaders(): Promise<HttpHeaders> {
    if (this.auth?.whenReady) {
      await this.auth.whenReady();
    }
    const token = this.auth.accessToken();
    if (!token) {
      throw new Error('Bạn cần đăng nhập để thực hiện thao tác tin nhắn.');
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
