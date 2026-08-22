import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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
  getOrCreateDm(recipientId: string): Promise<ConversationResponseDto> {
    return firstValueFrom(
      this.http.post<ConversationResponseDto>(
        `${this.baseUrl}/dm`,
        { recipientId },
        { headers: this.authHeaders() },
      ),
    );
  }

  /**
   * Lấy danh sách tất cả các cuộc trò chuyện của user hiện tại.
   */
  listConversations(): Promise<ConversationResponseDto[]> {
    return firstValueFrom(
      this.http.get<ConversationResponseDto[]>(this.baseUrl, {
        headers: this.authHeaders(),
      }),
    );
  }

  /**
   * Lấy thông tin chi tiết một cuộc trò chuyện.
   */
  getConversation(conversationId: string): Promise<ConversationResponseDto> {
    return firstValueFrom(
      this.http.get<ConversationResponseDto>(`${this.baseUrl}/${conversationId}`, {
        headers: this.authHeaders(),
      }),
    );
  }

  private authHeaders(): HttpHeaders {
    const token = this.auth.accessToken();
    if (!token) {
      throw new Error('Bạn cần đăng nhập để thực hiện thao tác này.');
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
