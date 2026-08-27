import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  BackupCodesResponse,
  TotpEnrollResponse,
  TotpStatusResponse,
} from '../../../../shared/dto/auth';

/**
 * Service quản lý 2FA (TOTP) trong Settings.
 *
 * Tách khỏi UserSettingsService để giữ file đó không phình thêm.
 * Inject vào AccountTab khi cần.
 * Token được tự động gắn bởi authInterceptor — không cần truyền tay.
 */
@Injectable({ providedIn: 'root' })
export class TwoFactorService {
  private readonly http = inject(HttpClient);

  /** Trạng thái 2FA — null nghĩa là chưa load. */
  readonly status = signal<TotpStatusResponse | null>(null);
  /** Đang tải trạng thái. */
  readonly statusLoading = signal(false);

  /** Thông tin enroll đang diễn ra (chưa xác nhận). */
  readonly enrollData = signal<TotpEnrollResponse | null>(null);
  /** Backup codes vừa được tạo (hiện một lần). */
  readonly newBackupCodes = signal<string[] | null>(null);
  /** Đang xử lý một action. */
  readonly processing = signal(false);
  /** Lỗi hiện tại. */
  readonly error = signal<string | null>(null);

  private get apiBase(): string {
    return `${environment.apiUrl}/auth/2fa`;
  }

  /** Tải trạng thái 2FA của user hiện tại. */
  async loadStatus(): Promise<void> {
    this.statusLoading.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get<TotpStatusResponse>(`${this.apiBase}/status`),
      );
      this.status.set(data);
    } catch {
      this.status.set({ enabled: false, factorId: null });
    } finally {
      this.statusLoading.set(false);
    }
  }

  /**
   * Bắt đầu enroll TOTP — trả QR code URI và secret.
   * Lưu kết quả vào enrollData() để wizard hiển thị.
   */
  async startEnroll(): Promise<void> {
    this.processing.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.post<TotpEnrollResponse>(`${this.apiBase}/enroll`, {}),
      );
      this.enrollData.set(data);
    } catch (err) {
      this.error.set(this.extractMessage(err));
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * Xác nhận mã 6 số sau khi quét QR — kích hoạt 2FA.
   * Trả backup codes (chỉ hiện một lần).
   */
  async verifyEnroll(code: string): Promise<string[] | null> {
    const enroll = this.enrollData();
    if (!enroll) return null;

    this.processing.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.post<BackupCodesResponse & { accessToken: string; refreshToken: string; expiresAt: number | null }>(
          `${this.apiBase}/verify-enroll`,
          { factorId: enroll.factorId, code },
        ),
      );

      this.newBackupCodes.set(data.codes);
      this.enrollData.set(null);
      this.status.set({ enabled: true, factorId: enroll.factorId });
      return data.codes;
    } catch (err) {
      this.error.set(this.extractMessage(err));
      return null;
    } finally {
      this.processing.set(false);
    }
  }

  /** Tắt 2FA với mã xác thực từ Google Authenticator hoặc mã dự phòng. */
  async unenroll(code: string): Promise<boolean> {
    const factorId = this.status()?.factorId;
    if (!factorId) return false;

    this.processing.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.http.post(`${this.apiBase}/unenroll`, { factorId, code }),
      );
      this.status.set({ enabled: false, factorId: null });
      this.newBackupCodes.set(null);
      return true;
    } catch (err) {
      this.error.set(this.extractMessage(err));
      return false;
    } finally {
      this.processing.set(false);
    }
  }

  /** Tạo lại bộ backup codes mới. */
  async regenerateBackupCodes(): Promise<string[] | null> {
    this.processing.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.post<BackupCodesResponse>(
          `${this.apiBase}/regenerate-backup-codes`,
          {},
        ),
      );
      this.newBackupCodes.set(data.codes);
      return data.codes;
    } catch (err) {
      this.error.set(this.extractMessage(err));
      return null;
    } finally {
      this.processing.set(false);
    }
  }

  /** Xoá backup codes khỏi memory (sau khi user đã lưu). */
  clearBackupCodes(): void {
    this.newBackupCodes.set(null);
  }

  /** Reset wizard về trạng thái ban đầu. */
  resetWizard(): void {
    this.enrollData.set(null);
    this.newBackupCodes.set(null);
    this.error.set(null);
  }

  private extractMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = err as { error?: { message?: string | string[] } };
      if (Array.isArray(e.error?.message)) {
        return e.error.message.join('. ');
      }
      return typeof e.error?.message === 'string'
        ? e.error.message
        : 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }
    return 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
}
