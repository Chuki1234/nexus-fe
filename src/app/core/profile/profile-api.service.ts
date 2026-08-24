import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  OwnProfile,
  Profile,
  ProfileSummary,
  UpdateProfilePayload,
} from './profile.models';

/** Hai loại ảnh hồ sơ — khớp `ProfileImageKind` bên backend. */
export type ProfileImageKind = 'avatar' | 'banner';

/**
 * Mọi lời gọi tới /api/profiles.
 *
 * Tách khỏi `ProfileService` (chỉ trả lời "đã có hồ sơ hay chưa" cho guard) để
 * guard không phải kéo theo cả tầng gọi API.
 */
@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/profiles`;

  /** Hồ sơ của chính mình, gồm cả trường không công khai. */
  async getOwn(): Promise<OwnProfile> {
    return firstValueFrom(
      this.http.get<OwnProfile>(`${this.baseUrl}/me`, { headers: await this.authHeaders() }),
    );
  }

  /** Hồ sơ của một người bất kỳ. Ném lỗi 404 khi không có username này. */
  async getByUsername(username: string): Promise<Profile> {
    return firstValueFrom(
      this.http.get<Profile>(`${this.baseUrl}/${encodeURIComponent(username)}`, {
        headers: await this.authHeaders(),
      }),
    );
  }

  async update(payload: UpdateProfilePayload): Promise<OwnProfile> {
    return firstValueFrom(
      this.http.patch<OwnProfile>(`${this.baseUrl}/me`, payload, {
        headers: await this.authHeaders(),
      }),
    );
  }

  /**
   * Gửi ảnh lên dạng multipart. Cố tình KHÔNG đặt Content-Type: trình duyệt phải
   * tự sinh header kèm boundary, đặt tay vào là request hỏng.
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
   * Phiên đăng nhập được khôi phục bất đồng bộ, nên phải chờ trước khi đọc token
   * — gọi sớm hơn sẽ gửi đi `Bearer ` rỗng và nhận 401.
   */
  private async authHeaders(): Promise<Record<string, string>> {
    await this.auth.whenReady();
    return { Authorization: `Bearer ${this.auth.accessToken() ?? ''}` };
  }
}

/**
 * Kiểm tra nhanh phía client trước khi tốn băng thông tải ảnh lên.
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

/** Biến lỗi HTTP thành câu hiển thị được cho người dùng. */
export function toProfileErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 0:
        return 'Không kết nối được máy chủ. Kiểm tra backend đang chạy rồi thử lại.';
      case 401:
        return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      case 404:
        return serverMessage(error) ?? 'Không tìm thấy người dùng này.';
      case 413:
        return `Ảnh vượt quá ${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`;
      case 415:
        return serverMessage(error) ?? 'Định dạng ảnh không được hỗ trợ.';
      case 400:
      case 409:
        return serverMessage(error) ?? 'Thông tin không hợp lệ.';
    }
  }
  return 'Không lưu được hồ sơ. Vui lòng thử lại.';
}

/**
 * NestJS trả `message` là chuỗi, hoặc mảng chuỗi khi ValidationPipe gom nhiều lỗi.
 * Lấy câu đầu tiên là đủ — form đã tự đánh dấu từng ô sai.
 */
function serverMessage(error: HttpErrorResponse): string | null {
  const message: unknown = error.error?.message;
  if (typeof message === 'string' && message) {
    return message;
  }
  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message[0];
  }
  return null;
}
