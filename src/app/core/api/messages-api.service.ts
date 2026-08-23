import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

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
  attachments?: AttachmentResponseDto[];
  reactions?: ReactionSummaryDto[];
  createdAt: string;
}

export interface MessagesPaginationResponseDto {
  messages: MessageResponseDto[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface SendMessageDto {
  content?: string;
  clientNonce?: string;
  replyToId?: string;
  files?: File[];
}

export interface EditMessageDto {
  content: string;
}

export interface SetReactionDto {
  emoji: string;
  reacted: boolean;
  clientMutationId?: string;
}

export interface SetReactionResponseDto {
  messageId: string;
  conversationId: string;
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
   * Xoá tin nhắn của chính mình (soft delete).
   */
  async deleteMessage(
    messageId: string,
  ): Promise<{ id: string; deleted: boolean }> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .delete<{ id: string; deleted: boolean }>(
          `${this.baseUrl}/messages/${messageId}`,
          { headers },
        )
        .pipe(timeout(15000)),
    );
  }

  /**
   * Tải lại signed URL mới cho attachment khi URL cũ hết hạn (401/403).
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
   * Thêm hoặc xóa reaction cho tin nhắn theo desired state (Idempotent).
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
