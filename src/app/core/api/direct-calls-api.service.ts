import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import type {
  AnswerDirectCallRequestDto,
  AnswerDirectCallResponseDto,
  CreateDirectCallRequestDto,
  DirectCallDto,
  DirectCallTokenRequestDto,
  DirectCallTokenResponseDto,
  EndDirectCallRequestDto,
  GetActiveDirectCallResponseDto,
} from '../../../shared/dto/direct-calls.dto';

@Injectable({
  providedIn: 'root',
})
export class DirectCallsApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/direct-calls`;

  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.accessToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  /**
   * POST /api/direct-calls
   * Khởi tạo cuộc gọi thoại hoặc video 1-1
   */
  async startCall(dto: CreateDirectCallRequestDto): Promise<DirectCallDto> {
    const headers = this.getAuthHeaders();
    return firstValueFrom(
      this.http.post<DirectCallDto>(this.baseUrl, dto, { headers }).pipe(timeout(10000)),
    );
  }

  /**
   * POST /api/direct-calls/:id/answer
   * Chấp nhận cuộc gọi
   */
  async answerCall(
    callId: string,
    dto: AnswerDirectCallRequestDto,
  ): Promise<AnswerDirectCallResponseDto> {
    const headers = this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<AnswerDirectCallResponseDto>(`${this.baseUrl}/${encodeURIComponent(callId)}/answer`, dto, {
          headers,
        })
        .pipe(timeout(10000)),
    );
  }

  /**
   * POST /api/direct-calls/:id/decline
   * Từ chối cuộc gọi đang đổ chuông (Callee)
   */
  async declineCall(callId: string): Promise<DirectCallDto> {
    const headers = this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<DirectCallDto>(`${this.baseUrl}/${encodeURIComponent(callId)}/decline`, {}, { headers })
        .pipe(timeout(10000)),
    );
  }

  /**
   * POST /api/direct-calls/:id/cancel
   * Hủy cuộc gọi đang đổ chuông (Caller)
   */
  async cancelCall(callId: string): Promise<DirectCallDto> {
    const headers = this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<DirectCallDto>(`${this.baseUrl}/${encodeURIComponent(callId)}/cancel`, {}, { headers })
        .pipe(timeout(10000)),
    );
  }

  /**
   * POST /api/direct-calls/:id/end
   * Kết thúc cuộc gọi
   */
  async endCall(callId: string, dto: EndDirectCallRequestDto = {}): Promise<DirectCallDto> {
    const headers = this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<DirectCallDto>(`${this.baseUrl}/${encodeURIComponent(callId)}/end`, dto, { headers })
        .pipe(timeout(10000)),
    );
  }

  /**
   * GET /api/direct-calls/active
   * Lấy cuộc gọi active của user (phục vụ F5 / Reconnect)
   */
  async getActiveCall(clientSessionId?: string): Promise<GetActiveDirectCallResponseDto> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams();
    if (clientSessionId) {
      params = params.set('clientSessionId', clientSessionId);
    }
    return firstValueFrom(
      this.http
        .get<GetActiveDirectCallResponseDto>(`${this.baseUrl}/active`, { headers, params })
        .pipe(timeout(10000)),
    );
  }

  /**
   * POST /api/direct-calls/:id/token
   * Lấy LiveKit token
   */
  async getToken(
    callId: string,
    dto: DirectCallTokenRequestDto,
  ): Promise<DirectCallTokenResponseDto> {
    const headers = this.getAuthHeaders();
    return firstValueFrom(
      this.http
        .post<DirectCallTokenResponseDto>(`${this.baseUrl}/${encodeURIComponent(callId)}/token`, dto, {
          headers,
        })
        .pipe(timeout(10000)),
    );
  }

  /**
   * GET /api/direct-calls/history
   * Lấy lịch sử cuộc gọi trong cuộc trò chuyện DM
   */
  async getHistory(conversationId: string): Promise<DirectCallDto[]> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams().set('conversationId', conversationId);
    return firstValueFrom(
      this.http
        .get<DirectCallDto[]>(`${this.baseUrl}/history`, { headers, params })
        .pipe(timeout(10000)),
    );
  }
}
