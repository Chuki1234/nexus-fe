import { computed, Injectable, signal } from '@angular/core';
import type { ServersApiService } from '../api/servers-api.service';
import { ChannelSummary, ServerSummary } from '../api/shell-data';

/**
 * Store quản lý tập trung và chuẩn mực (canonical) cho danh sách máy chủ,
 * các kênh thuộc từng máy chủ và trạng thái máy chủ đang hoạt động.
 *
 * Hoàn toàn tách biệt khỏi shell-data.ts (vốn chứa cả mock demo data).
 */
@Injectable({ providedIn: 'root' })
export class ServersStore {
  /** Generation counter để hủy mọi tác vụ dở dang khi chuyển tài khoản hoặc reset */
  readonly generation = signal<number>(0);

  /** Danh sách máy chủ mà user đang tham gia */
  readonly serverList = signal<ServerSummary[]>([]);

  /** Map danh sách kênh theo serverId */
  readonly channelsByServer = signal<Record<string, ChannelSummary[]>>({});

  /** Trạng thái nạp dữ liệu */
  readonly isLoading = signal<boolean>(false);

  /** Đã nạp dữ liệu từ backend ít nhất 1 lần */
  readonly isHydrated = signal<boolean>(false);

  private hydrationPromise: Promise<void> | null = null;

  /** ServerId đang mở hiện tại */
  readonly activeServerId = signal<string | null>(null);

  /** ChannelId đang mở hiện tại */
  readonly activeChannelId = signal<string | null>(null);

  /** Danh sách server đã được sắp xếp theo thứ tự hiển thị */
  readonly servers = computed(() => this.serverList());

  /** Số lượng server đang tham gia */
  readonly serverCount = computed(() => this.serverList().length);

  /**
   * Đảm bảo danh sách server & channels đã được nạp từ backend.
   */
  async ensureHydrated(serversApi: ServersApiService): Promise<void> {
    if (this.isHydrated() && this.serverList().length > 0) {
      return;
    }
    if (this.hydrationPromise) {
      return this.hydrationPromise;
    }

    const currentGen = this.generation();
    this.hydrationPromise = (async () => {
      this.isLoading.set(true);
      try {
        const serversWithChannels = await serversApi.listServers();
        if (this.generation() === currentGen) {
          this.hydrateServers(serversWithChannels);
          this.isHydrated.set(true);
        }
      } catch {
        // Giữ trạng thái hiện tại nếu network error
      } finally {
        if (this.generation() === currentGen) {
          this.isLoading.set(false);
        }
        this.hydrationPromise = null;
      }
    })();

    return this.hydrationPromise;
  }

  /**
   * Nạp danh sách server và channels thực tế từ backend.
   */
  hydrateServers(
    serversWithChannels: Array<{
      id: string;
      name: string;
      iconUrl?: string | null;
      unread?: boolean;
      mentionCount?: number;
      channels?: ChannelSummary[];
    }>,
  ): void {
    const servers: ServerSummary[] = serversWithChannels.map((s) => ({
      id: s.id,
      name: s.name,
      iconUrl: s.iconUrl ?? null,
      unread: s.unread ?? false,
      mentionCount: s.mentionCount ?? 0,
    }));

    const channelMap: Record<string, ChannelSummary[]> = {};
    for (const s of serversWithChannels) {
      channelMap[s.id] = s.channels ?? [];
    }

    this.serverList.set(servers);
    this.channelsByServer.set(channelMap);
  }

  /**
   * Thay thế toàn bộ danh sách kênh của một server (ví dụ sau khi nhận server:channels-invalidated)
   */
  setChannels(serverId: string, channels: ChannelSummary[]): void {
    this.channelsByServer.update((current) => ({
      ...current,
      [serverId]: channels,
    }));
  }

  /**
   * Thêm hoặc cập nhật một server và các kênh đi kèm vào live state.
   */
  upsertServerWithChannels(server: ServerSummary, channels: ChannelSummary[]): void {
    this.serverList.update((current) => {
      const exists = current.some((s) => s.id === server.id);
      if (exists) {
        return current.map((s) => (s.id === server.id ? server : s));
      }
      return [...current, server];
    });

    this.channelsByServer.update((current) => ({
      ...current,
      [server.id]: channels,
    }));
  }

  /**
   * Xóa một server khỏi live state khi bị xóa hoặc rời khỏi.
   */
  removeServer(serverId: string): void {
    this.serverList.update((current) => current.filter((s) => s.id !== serverId));
    this.channelsByServer.update((current) => {
      const next = { ...current };
      delete next[serverId];
      return next;
    });

    if (this.activeServerId() === serverId) {
      this.activeServerId.set(null);
      this.activeChannelId.set(null);
    }
  }

  /**
   * Thêm hoặc cập nhật một kênh mới vào live state của server.
   */
  addChannel(serverId: string, channel: ChannelSummary): void {
    this.channelsByServer.update((current) => {
      const existing = current[serverId] ?? [];
      const alreadyExists = existing.some((c) => c.id === channel.id);
      if (alreadyExists) {
        return {
          ...current,
          [serverId]: existing.map((c) => (c.id === channel.id ? channel : c)),
        };
      }
      return {
        ...current,
        [serverId]: [...existing, channel],
      };
    });
  }

  /**
   * Cập nhật thông tin của một kênh.
   */
  updateChannel(serverId: string, channel: ChannelSummary): void {
    this.channelsByServer.update((current) => {
      const existing = current[serverId] ?? [];
      return {
        ...current,
        [serverId]: existing.map((c) => (c.id === channel.id ? channel : c)),
      };
    });
  }

  /**
   * Xóa một kênh khỏi live state của server.
   */
  removeChannel(serverId: string, channelId: string): void {
    this.channelsByServer.update((current) => {
      const existing = current[serverId] ?? [];
      return {
        ...current,
        [serverId]: existing.filter((c) => c.id !== channelId),
      };
    });

    if (this.activeChannelId() === channelId) {
      this.activeChannelId.set(null);
    }
  }

  /**
   * Lấy thông tin server theo ID.
   */
  serverOf(serverId: string): ServerSummary | undefined {
    return this.serverList().find((s) => s.id === serverId);
  }

  getServer(serverId: string): ServerSummary | undefined {
    return this.serverOf(serverId);
  }

  /**
   * Lấy danh sách kênh của một server.
   */
  channelsOf(serverId: string): ChannelSummary[] {
    return this.channelsByServer()[serverId] ?? [];
  }

  getChannels(serverId: string): ChannelSummary[] {
    return this.channelsOf(serverId);
  }

  /**
   * Đặt active server và channel.
   */
  setActive(serverId: string | null, channelId: string | null = null): void {
    this.activeServerId.set(serverId);
    this.activeChannelId.set(channelId);
  }

  /**
   * Xóa toàn bộ dữ liệu (khi logout hoặc chuyển tài khoản).
   */
  clear(): void {
    this.serverList.set([]);
    this.channelsByServer.set({});
    this.activeServerId.set(null);
    this.activeChannelId.set(null);
    this.isLoading.set(false);
    this.isHydrated.set(false);
    this.hydrationPromise = null;
    this.generation.update((g) => g + 1);
  }
}
