import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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
  getMessages(
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

    return firstValueFrom(
      this.http.get<MessagesPaginationResponseDto>(
        `${this.baseUrl}/conversations/${conversationId}/messages`,
        {
          headers: this.authHeaders(),
          params,
        },
      ),
    );
  }

  /**
   * Gửi tin nhắn mới vào cuộc trò chuyện (hỗ trợ text và file đính kèm).
   */
  sendMessage(
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
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
        this.http.post<MessageResponseDto>(
          `${this.baseUrl}/conversations/${conversationId}/messages`,
          formData,
          { headers: this.authHeaders() },
        ),
      );
    }

    return firstValueFrom(
      this.http.post<MessageResponseDto>(
        `${this.baseUrl}/conversations/${conversationId}/messages`,
        dto,
        { headers: this.authHeaders() },
      ),
    );
  }

  /**
   * Chỉnh sửa tin nhắn của chính mình.
   */
  editMessage(
    messageId: string,
    dto: EditMessageDto,
  ): Promise<MessageResponseDto> {
    return firstValueFrom(
      this.http.patch<MessageResponseDto>(
        `${this.baseUrl}/messages/${messageId}`,
        dto,
        { headers: this.authHeaders() },
      ),
    );
  }

  /**
   * Xoá tin nhắn của chính mình (soft delete).
   */
  deleteMessage(
    messageId: string,
  ): Promise<{ id: string; deleted: boolean }> {
    return firstValueFrom(
      this.http.delete<{ id: string; deleted: boolean }>(
        `${this.baseUrl}/messages/${messageId}`,
        { headers: this.authHeaders() },
      ),
    );
  }

  /**
   * Tải lại signed URL mới cho attachment khi URL cũ hết hạn (401/403).
   */
  getAttachmentSignedUrl(
    conversationId: string,
    attachmentId: string,
  ): Promise<{ signedUrl: string }> {
    return firstValueFrom(
      this.http.get<{ signedUrl: string }>(
        `${this.baseUrl}/conversations/${conversationId}/attachments/${attachmentId}/signed-url`,
        { headers: this.authHeaders() },
      ),
    );
  }

  /**
   * Đánh dấu đã đọc tin nhắn trong cuộc trò chuyện.
   */
  markAsRead(
    conversationId: string,
    messageId: string,
  ): Promise<{ success: boolean; updated?: boolean; lastReadMessageId?: string }> {
    return firstValueFrom(
      this.http.post<{ success: boolean; updated?: boolean; lastReadMessageId?: string }>(
        `${this.baseUrl}/conversations/${conversationId}/read`,
        { messageId },
        { headers: this.authHeaders() },
      ),
    );
  }

  private authHeaders(): HttpHeaders {
    const token = this.auth.accessToken();
    if (!token) {
      throw new Error('Bạn cần đăng nhập để thực hiện thao tác tin nhắn.');
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
