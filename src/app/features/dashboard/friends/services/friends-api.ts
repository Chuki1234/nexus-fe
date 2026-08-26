import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { PresenceStatus, BlockedUserDto } from '../../../../../shared';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/auth/auth.service';

export interface FriendProfileResponse {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  statusMessage: string | null;
  presence: PresenceStatus;
}

export interface FriendResponse extends FriendProfileResponse {
  friendsSince: string;
}

export interface FriendRequestResponse extends FriendProfileResponse {
  requestedAt: string;
}

export interface FriendRequestsResponse {
  incoming: FriendRequestResponse[];
  outgoing: FriendRequestResponse[];
}

export function formatFriendsApiError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const backendMessage =
      error.error && typeof error.error === 'object' && 'message' in error.error
        ? error.error.message
        : typeof error.error === 'string'
          ? error.error
          : null;
    const message = Array.isArray(backendMessage)
      ? backendMessage.join(', ')
      : typeof backendMessage === 'string'
        ? backendMessage
        : null;

    if (message) return message;
    if (error.status === 0) {
      return 'Không thể kết nối tới NexusCord. Hãy kiểm tra backend và thử lại.';
    }
    if (error.status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Không thể hoàn tất thao tác bạn bè. Vui lòng thử lại.';
}

@Injectable({
  providedIn: 'root',
})
export class FriendsApi {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/friends`;

  listFriends(): Promise<FriendResponse[]> {
    return firstValueFrom(
      this.http.get<FriendResponse[]>(this.baseUrl, {
        headers: this.authHeaders(),
      }),
    );
  }

  listRequests(): Promise<FriendRequestsResponse> {
    return firstValueFrom(
      this.http.get<FriendRequestsResponse>(`${this.baseUrl}/requests`, {
        headers: this.authHeaders(),
      }),
    );
  }

  sendRequest(username: string): Promise<FriendRequestResponse> {
    return firstValueFrom(
      this.http.post<FriendRequestResponse>(
        `${this.baseUrl}/requests`,
        { username: username.trim().toLowerCase() },
        { headers: this.authHeaders() },
      ),
    );
  }

  acceptRequest(userId: string): Promise<FriendResponse> {
    return firstValueFrom(
      this.http.patch<FriendResponse>(
        `${this.baseUrl}/requests/${userId}/accept`,
        {},
        { headers: this.authHeaders() },
      ),
    );
  }

  deleteRequest(userId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/requests/${userId}`, {
        headers: this.authHeaders(),
      }),
    );
  }

  removeFriend(userId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/${userId}`, {
        headers: this.authHeaders(),
      }),
    );
  }

  listBlocked(): Promise<BlockedUserDto[]> {
    return firstValueFrom(
      this.http.get<BlockedUserDto[]>(`${this.baseUrl}/blocked`, {
        headers: this.authHeaders(),
      }),
    );
  }

  blockUser(userId: string): Promise<BlockedUserDto> {
    return firstValueFrom(
      this.http.post<BlockedUserDto>(
        `${this.baseUrl}/${userId}/block`,
        {},
        { headers: this.authHeaders() },
      ),
    );
  }

  unblockUser(userId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/${userId}/block`, {
        headers: this.authHeaders(),
      }),
    );
  }

  private authHeaders(): HttpHeaders {
    const token = this.auth.accessToken();
    if (!token) {
      throw new Error('Bạn cần đăng nhập để sử dụng tính năng kết bạn.');
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
