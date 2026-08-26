import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  OwnProfile,
  ProfileSummary,
  PublicProfile,
  UpdateProfileRequest,
} from '../../../shared';
import { AuthService } from '../auth/auth.service';

/** Hai loại ảnh hồ sơ — khớp `ProfileImageKind` bên nexus-be. */
export type ProfileImageKind = 'avatar' | 'banner';

/** Ảnh người dùng chọn, TRƯỚC khi backend resize. Khớp `MAX_UPLOAD_BYTES`. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

/** Giá trị cho thuộc tính `accept` của `<input type="file">`. */
export const IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(',');

/**
 * Kiểm nhanh phía client trước khi tốn băng thông tải lên.
 * Trả về câu lỗi, hoặc `null` nếu ảnh dùng được.
 */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Chỉ nhận ảnh JPEG, PNG, WebP, GIF hoặc AVIF.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Ảnh tối đa ${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`;
  }
  return null;
}

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

  /** Sửa phần chữ của hồ sơ. Bỏ trường đi = giữ nguyên, `null` = xoá. */
  async update(payload: UpdateProfileRequest): Promise<OwnProfile> {
    return firstValueFrom(
      this.http.patch<OwnProfile>(`${this.baseUrl}/me`, payload, {
        headers: await this.authHeaders(),
      }),
    );
  }

  /**
   * Gửi ảnh lên dạng multipart.
   *
   * Cố tình KHÔNG đặt `Content-Type`: trình duyệt phải tự sinh header kèm
   * `boundary` của riêng nó, đặt tay vào là request hỏng.
   */
  async uploadImage(kind: ProfileImageKind, file: File): Promise<OwnProfile> {
    const body = new FormData();
    body.append('file', file, file.name);

    return firstValueFrom(
      this.http.post<OwnProfile>(`${this.baseUrl}/me/${kind}`, body, {
        headers: await this.authHeaders(),
      }),
    );
  }

  async removeImage(kind: ProfileImageKind): Promise<OwnProfile> {
    return firstValueFrom(
      this.http.delete<OwnProfile>(`${this.baseUrl}/me/${kind}`, {
        headers: await this.authHeaders(),
      }),
    );
  }

  /**
   * Đổi ngày sinh — đường riêng, tách khỏi `update()` vì đây là dữ liệu kiểm
   * tra tuổi (khớp `SetBirthdateDto` bên backend), không phải thông tin
   * trang trí hồ sơ.
   */
  async setBirthdate(birthdate: string): Promise<OwnProfile> {
    return firstValueFrom(
      this.http.put<OwnProfile>(
        `${this.baseUrl}/me/birthdate`,
        { birthdate },
        { headers: await this.authHeaders() },
      ),
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
   * Ghi chú RIÊNG của mình về người này — không phải dữ liệu của hồ sơ họ,
   * nên đi API riêng thay vì nằm trong `getByUsername()`.
   */
  async getNote(username: string): Promise<{ text: string }> {
    return firstValueFrom(
      this.http.get<{ text: string }>(`${this.baseUrl}/${encodeURIComponent(username)}/note`, {
        headers: await this.authHeaders(),
      }),
    );
  }

  /** Lưu ghi chú. Chuỗi rỗng = xoá. */
  async setNote(username: string, text: string): Promise<{ text: string }> {
    return firstValueFrom(
      this.http.put<{ text: string }>(
        `${this.baseUrl}/${encodeURIComponent(username)}/note`,
        { text },
        { headers: await this.authHeaders() },
      ),
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
