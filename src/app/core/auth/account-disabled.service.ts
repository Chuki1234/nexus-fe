import { Injectable, signal } from '@angular/core';

export interface DisabledAccountInfo {
  userId?: string;
  email?: string;
  username?: string;
  displayName?: string;
  disabledAt: number;
  disabledUntil: number | null; // null = vô thời hạn
  durationMinutes: number | null;
  durationLabel: string;
  has2fa?: boolean;
  reason?: string;
}

export type AccountDisabledInfo = DisabledAccountInfo;

const STORAGE_KEY = 'nexus_disabled_account_v1';

@Injectable({ providedIn: 'root' })
export class AccountDisabledService {
  private readonly disabledState = signal<DisabledAccountInfo | null>(this.readFromStorage());

  readonly currentDisabled = this.disabledState.asReadonly();

  /** Thiết lập tạm vô hiệu hóa tài khoản và lưu vào bộ nhớ. */
  disableAccount(params: {
    userId?: string;
    email?: string;
    username?: string;
    displayName?: string;
    durationMinutes: number | null;
    durationLabel: string;
    has2fa?: boolean;
    reason?: string;
  }): DisabledAccountInfo {
    const now = Date.now();
    const disabledUntil = params.durationMinutes !== null ? now + params.durationMinutes * 60 * 1000 : null;

    const info: DisabledAccountInfo = {
      userId: params.userId,
      email: params.email,
      username: params.username,
      displayName: params.displayName,
      disabledAt: now,
      disabledUntil,
      durationMinutes: params.durationMinutes,
      durationLabel: params.durationLabel,
      has2fa: params.has2fa ?? false,
      reason: params.reason || 'Người dùng tạm ngưng sử dụng tài khoản',
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
      } catch {
        // Bỏ qua lỗi truy cập storage
      }
    }

    this.disabledState.set(info);
    return info;
  }

  /**
   * Kiểm tra thông tin tài khoản bị vô hiệu hóa.
   * Nếu đã hết thời gian khóa thì tự động dọn dẹp và trả về null.
   */
  getDisabledAccount(identifier?: string): DisabledAccountInfo | null {
    const current = this.readFromStorage();
    if (!current) {
      this.disabledState.set(null);
      return null;
    }

    // Nếu thời gian khóa đã trôi qua
    if (current.disabledUntil !== null && Date.now() >= current.disabledUntil) {
      this.reactivateAccount();
      return null;
    }

    // Nếu có truyền identifier (email/username), kiểm tra khớp nếu có dữ liệu
    if (identifier && (current.email || current.username)) {
      const idClean = identifier.trim().toLowerCase();
      const emailClean = (current.email || '').toLowerCase();
      const userClean = (current.username || '').toLowerCase();
      if (emailClean && emailClean !== idClean && userClean && userClean !== idClean) {
        // Không trùng khớp tài khoản đang bị khóa
        return null;
      }
    }

    this.disabledState.set(current);
    return current;
  }

  /** Mở khóa / kích hoạt lại tài khoản ngay lập tức. */
  reactivateAccount(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Bỏ qua
      }
    }
    this.disabledState.set(null);
  }

  /** Định dạng chuỗi thời gian còn lại và thời điểm mở khóa dự kiến. */
  formatRemainingTime(disabledUntil: number | null): { remainingText: string; unlockTimeText: string } {
    if (disabledUntil === null) {
      return {
        remainingText: 'Vô thời hạn',
        unlockTimeText: 'Cho đến khi bạn đăng nhập và chọn kích hoạt lại',
      };
    }

    const diffMs = disabledUntil - Date.now();
    if (diffMs <= 0) {
      return {
        remainingText: 'Đã hết hạn vô hiệu hóa',
        unlockTimeText: 'Ngay bây giờ',
      };
    }

    const totalMinutes = Math.ceil(diffMs / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = Math.floor(hours / 24);

    let remainingText = '';
    if (days > 0) {
      const remHours = hours % 24;
      remainingText = `${days} ngày ${remHours > 0 ? remHours + ' giờ' : ''}`.trim();
    } else if (hours > 0) {
      remainingText = `${hours} giờ ${minutes > 0 ? minutes + ' phút' : ''}`.trim();
    } else {
      remainingText = `${totalMinutes} phút`;
    }

    const d = new Date(disabledUntil);
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const unlockTimeText = `${timeStr} ngày ${dateStr}`;

    return {
      remainingText: `còn lại khoảng ${remainingText}`,
      unlockTimeText,
    };
  }

  private readFromStorage(): DisabledAccountInfo | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DisabledAccountInfo;
      if (parsed.disabledUntil !== null && Date.now() >= parsed.disabledUntil) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
