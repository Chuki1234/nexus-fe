import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

export interface VoiceTokenResponse {
  serverUrl: string;
  participantToken: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
}

@Injectable({
  providedIn: 'root',
})
export class VoiceApiService {
  private readonly auth = inject(AuthService);

  /**
   * Xin token LiveKit từ backend NestJS.
   */
  async getVoiceToken(
    serverId: string,
    channelId: string,
    displayName?: string,
    avatarUrl?: string | null,
  ): Promise<VoiceTokenResponse> {
    const token = this.auth.accessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${environment.apiUrl}/voice/channels/${encodeURIComponent(channelId)}/token`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        serverId,
        channelId,
        displayName,
        avatarUrl: avatarUrl ?? undefined,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(
        errorData.message ||
          `Không thể kết nối phòng thoại (mã lỗi HTTP ${response.status}). Vui lòng kiểm tra cấu hình LiveKit trên máy chủ.`,
      );
    }

    return (await response.json()) as VoiceTokenResponse;
  }
}
