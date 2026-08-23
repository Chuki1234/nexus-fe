import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { PresenceStatus } from '../../../shared/dto/common';
import { AuthService } from '../auth/auth.service';

export interface ConversationParticipantProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  statusMessage: string | null;
  presence: PresenceStatus;
}

export interface ConversationResponseDto {
  id: string;
  type: 'dm' | 'group';
  name: string | null;
  iconUrl: string | null;
  recipient?: ConversationParticipantProfile;
  lastReadMessageId?: string | null;
  unreadCount: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConversationsApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/conversations`;

  /**
   * Tạo hoặc mở cuộc trò chuyện DM 1-1 giữa 2 người bạn.
   */
  async getOrCreateDm(recipientId: string): Promise<ConversationResponseDto> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<ConversationResponseDto>(
          `${this.baseUrl}/dm`,
          { recipientId },
          { headers },
        )
        .pipe(timeout(10000)),
    );
  }

  /**
   * Lấy danh sách tất cả các cuộc trò chuyện của user hiện tại.
   */
  async listConversations(): Promise<ConversationResponseDto[]> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .get<ConversationResponseDto[]>(this.baseUrl, {
          headers,
        })
        .pipe(timeout(10000)),
    );
  }

  /**
   * Lấy thông tin chi tiết một cuộc trò chuyện.
   */
  async getConversation(conversationId: string): Promise<ConversationResponseDto> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .get<ConversationResponseDto>(`${this.baseUrl}/${conversationId}`, {
          headers,
        })
        .pipe(timeout(10000)),
    );
  }

  private async getAuthHeaders(): Promise<HttpHeaders> {
    if (this.auth?.whenReady) {
      await this.auth.whenReady();
    }
    const token = this.auth.accessToken();
    if (!token) {
      throw new Error('Bạn cần đăng nhập để thực hiện thao tác này.');
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
