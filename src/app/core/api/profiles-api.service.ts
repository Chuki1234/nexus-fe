import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { OwnProfile, ProfileSummary, PublicProfile } from '../../../shared';
import { AuthService } from '../auth/auth.service';

/**
 * Mọi lời gọi tới `/api/profiles/*`.
 *
 * Tách khỏi `ProfileService` (chỉ trả lời "đã hoàn tất hồ sơ hay chưa" cho
 * guard): guard chạy ở mọi lần điều hướng nên không nên kéo theo cả tầng gọi
 * API của trang cá nhân.
 */
@Injectable({ providedIn: 'root' })
export class ProfilesApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly baseUrl = `${environment.apiUrl}/profiles`;

  /** Hồ sơ của chính mình, kèm cả trường không công khai. */
  async getOwn(): Promise<OwnProfile> {
    return firstValueFrom(
      this.http.get<OwnProfile>(`${this.baseUrl}/me`, { headers: await this.authHeaders() }),
    );
  }

  /** Hồ sơ của một người bất kỳ. Ném 404 khi không có username này. */
  async getByUsername(username: string): Promise<PublicProfile> {
    return firstValueFrom(
      this.http.get<PublicProfile>(`${this.baseUrl}/${encodeURIComponent(username)}`, {
        headers: await this.authHeaders(),
      }),
    );
  }

  /** Tìm người khác theo username hoặc tên hiển thị. */
  async search(query: string): Promise<ProfileSummary[]> {
    return firstValueFrom(
      this.http.get<ProfileSummary[]>(`${this.baseUrl}/search`, {
        params: { q: query },
        headers: await this.authHeaders(),
      }),
    );
  }

  /**
   * Phiên đăng nhập được khôi phục bất đồng bộ, nên phải chờ trước khi đọc
   * token — gọi sớm hơn sẽ gửi đi `Bearer ` rỗng và nhận về 401.
   */
  private async authHeaders(): Promise<HttpHeaders> {
    await this.auth.whenReady();
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.accessToken() ?? ''}` });
  }
}
