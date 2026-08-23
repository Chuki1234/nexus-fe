import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  Signal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PRESENCE_LABEL,
  type PresenceStatus,
} from '../../../shared/dto/common';
import type { PresenceSyncPayload, PresenceUpdatedPayload } from '../../../shared/socket-events';
import { ChatSocketService } from '../realtime/chat-socket.service';

export interface UserPresenceInfo {
  status: PresenceStatus;
  lastSeenAt: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PresenceService {
  private readonly chatSocket = inject(ChatSocketService);
  private readonly destroyRef = inject(DestroyRef);

  /** Map lưu trữ trạng thái hiện diện realtime của bạn bè và DM peers */
  private readonly presenceMap = signal<Map<string, UserPresenceInfo>>(new Map());

  constructor() {
    // 1. Lắng nghe delta cập nhật presence realtime (an toàn khi ChatSocketService bị mock trong unit tests)
    if (this.chatSocket?.presenceUpdated$) {
      this.chatSocket.presenceUpdated$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((payload: PresenceUpdatedPayload) => {
          if (payload?.userId) {
            this.setPresence(payload.userId, payload.status, payload.lastSeenAt);
          }
        });
    }

    // 2. Lắng nghe snapshot presence
    if (this.chatSocket?.presenceSync$) {
      this.chatSocket.presenceSync$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((payload: PresenceSyncPayload) => {
          if (payload?.presences) {
            this.setSnapshot(payload.presences);
          }
        });
    }
  }

  /**
   * Kiểm tra xem user đã có thông tin hiện diện trong store chưa
   */
  hasPresence(userId: string | null | undefined): boolean {
    if (!userId) return false;
    return this.presenceMap().has(userId);
  }

  /**
   * Lấy trạng thái hiện diện reactive của một user theo ID.
   * Mặc định là 'offline' nếu chưa có trong map hoặc rỗng.
   */
  getPresence(userId: string | null | undefined): Signal<PresenceStatus> {
    return computed(() => {
      if (!userId) return 'offline';
      return this.presenceMap().get(userId)?.status ?? 'offline';
    });
  }

  /**
   * Lấy timestamp ngắt kết nối gần nhất của user
   */
  getLastSeenAt(userId: string | null | undefined): Signal<string | null> {
    return computed(() => {
      if (!userId) return null;
      return this.presenceMap().get(userId)?.lastSeenAt ?? null;
    });
  }

  /**
   * Lấy nhãn tiếng Việt của trạng thái hiện diện (cho tooltip & aria-label)
   */
  getPresenceLabel(userId: string | null | undefined): Signal<string> {
    return computed(() => {
      const status = this.getPresence(userId)();
      return PRESENCE_LABEL[status] ?? 'Ngoại tuyến';
    });
  }

  /**
   * Cập nhật trạng thái của một user
   */
  setPresence(
    userId: string,
    status: PresenceStatus,
    lastSeenAt: string | null = null,
  ): void {
    this.presenceMap.update((current) => {
      const next = new Map(current);
      next.set(userId, { status, lastSeenAt });
      return next;
    });
  }

  /**
   * Đồng bộ toàn bộ snapshot ban đầu
   */
  setSnapshot(
    presences: Record<string, { status: PresenceStatus; lastSeenAt: string | null }>,
  ): void {
    this.presenceMap.update((current) => {
      const next = new Map(current);
      for (const [id, item] of Object.entries(presences || {})) {
        if (id && item) {
          next.set(id, {
            status: item.status,
            lastSeenAt: item.lastSeenAt ?? null,
          });
        }
      }
      return next;
    });
  }

  /**
   * Yêu cầu refresh snapshot từ socket server
   */
  async refreshSnapshot(): Promise<void> {
    try {
      const res = await this.chatSocket.getPresenceSnapshot();
      if (res?.presences) {
        this.setSnapshot(res.presences);
      }
    } catch {
      // Gracefully ignored
    }
  }

  /**
   * Xóa sạch state khi đăng xuất
   */
  clear(): void {
    this.presenceMap.set(new Map());
  }
}
