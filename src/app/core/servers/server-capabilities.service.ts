import { HttpClient, HttpHeaders } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CurrentServerCapabilities } from '../../../shared/dto/server-capabilities.dto';
import { AuthService } from '../auth/auth.service';

import { ChatSocketService } from '../realtime/chat-socket.service';

export const DEFAULT_DENIED_CAPABILITIES: CurrentServerCapabilities = {
  isOwner: false,
  canInviteMembers: false,
  canManageServer: false,
  canManageChannels: false,
  canManageRoles: false,
  canKickMembers: false,
  canBanMembers: false,
};

@Injectable({ providedIn: 'root' })
export class ServerCapabilitiesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly chatSocket = inject(ChatSocketService, { optional: true });

  /** Map lưu cache capabilities theo serverId */
  readonly capabilitiesMap = signal<Map<string, CurrentServerCapabilities>>(new Map());

  /** Lưu generation counter để bảo vệ chống race condition khi chuyển server nhanh */
  private readonly generationMap = new Map<string, number>();

  /** Map deduplication cho các HTTP request đang chạy cùng serverId */
  private readonly inFlightRequests = new Map<string, Promise<CurrentServerCapabilities>>();

  constructor() {
    // Tự động clear toàn bộ cache khi người dùng logout hoặc chuyển tài khoản
    effect(() => {
      try {
        const userFn = this.auth?.user;
        const user = typeof userFn === 'function' ? userFn() : null;
        if (!user) {
          this.clear();
        }
      } catch {
        // Bỏ qua lỗi context trong test mock
      }
    });

    if (this.chatSocket) {
      this.chatSocket.capabilitiesUpdated$.subscribe((payload) => {
        if (!payload?.serverId || !payload?.capabilities) return;
        this.setCapabilities(payload.serverId, payload.capabilities);
      });
    }
  }

  setCapabilities(serverId: string, caps: CurrentServerCapabilities): void {
    if (!serverId || !caps) return;
    this.capabilitiesMap.update((map) => {
      const next = new Map(map);
      next.set(serverId, caps);
      return next;
    });
  }

  /**
   * Lấy capability của server hiện tại từ cache signal (nếu chưa có, trả về default deny và trigger load ngầm).
   */
  getCapabilitiesSignal(serverId: string | null) {
    if (!serverId) {
      return signal<CurrentServerCapabilities>(DEFAULT_DENIED_CAPABILITIES);
    }

    const current = this.capabilitiesMap().get(serverId);
    if (!current) {
      // Trigger load bất đồng bộ nếu chưa có trong map
      this.load(serverId).catch((err) => {
        console.warn(`Không thể tải quyền server ${serverId}:`, err);
      });
      return signal<CurrentServerCapabilities>(DEFAULT_DENIED_CAPABILITIES);
    }

    return signal<CurrentServerCapabilities>(current);
  }

  /**
   * Tải capabilities của một server cụ thể với generation guard & deduplication.
   */
  async load(serverId: string): Promise<CurrentServerCapabilities> {
    if (!serverId) {
      return DEFAULT_DENIED_CAPABILITIES;
    }

    // Nếu đã có cache, trả về ngay
    const cached = this.capabilitiesMap().get(serverId);
    if (cached) {
      return cached;
    }

    return this.fetchAndStore(serverId);
  }

  /**
   * Làm mới capabilities (bỏ qua cache, ví dụ khi gặp 403 hoặc nhận socket event).
   */
  async refresh(serverId: string): Promise<CurrentServerCapabilities> {
    if (!serverId) {
      return DEFAULT_DENIED_CAPABILITIES;
    }

    return this.fetchAndStore(serverId);
  }

  /**
   * Xóa toàn bộ cache (khi đăng xuất).
   */
  clear(): void {
    this.capabilitiesMap.set(new Map());
    this.generationMap.clear();
    this.inFlightRequests.clear();
  }

  private async fetchAndStore(serverId: string): Promise<CurrentServerCapabilities> {
    const token = this.auth.accessToken();
    if (!token) {
      return DEFAULT_DENIED_CAPABILITIES;
    }

    // Deduplicate request đang chạy
    const inFlight = this.inFlightRequests.get(serverId);
    if (inFlight) {
      return inFlight;
    }

    const currentGen = (this.generationMap.get(serverId) ?? 0) + 1;
    this.generationMap.set(serverId, currentGen);

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const requestPromise = (async () => {
      try {
        const caps = await firstValueFrom(
          this.http.get<CurrentServerCapabilities>(
            `${environment.apiUrl}/servers/${serverId}/capabilities`,
            { headers },
          ),
        );

        // Generation Guard: Chỉ ghi vào map nếu đây vẫn là request mới nhất của serverId
        if (this.generationMap.get(serverId) === currentGen) {
          this.capabilitiesMap.update((map) => {
            const next = new Map(map);
            next.set(serverId, caps);
            return next;
          });
        }

        return caps;
      } catch (err) {
        // Default deny khi gặp lỗi
        if (this.generationMap.get(serverId) === currentGen) {
          this.capabilitiesMap.update((map) => {
            const next = new Map(map);
            next.set(serverId, DEFAULT_DENIED_CAPABILITIES);
            return next;
          });
        }
        return DEFAULT_DENIED_CAPABILITIES;
      } finally {
        this.inFlightRequests.delete(serverId);
      }
    })();

    this.inFlightRequests.set(serverId, requestPromise);
    return requestPromise;
  }
}
