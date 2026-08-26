import { computed, Injectable, signal } from '@angular/core';
import type { ServersApiService } from '../api/servers-api.service';
import type {
  ChannelSummary,
  ServerCategorySummary,
  ServerGroupSummary,
  ServerRailRef,
  ServerSummary,
} from './server.models';
import type {
  ServerDropIntent,
  ServerDropResult,
} from '../../layouts/app-layout/components/server-rail/services/server-drop-intent';

const STORAGE_PREFIX = 'nexuscord_server_groups_';
const CATEGORIES_STORAGE_PREFIX = 'nexuscord_server_categories_';
const CHANNEL_CATEGORIES_PREFIX = 'nexuscord_channel_categories_';

interface PersistedGroupsPayload {
  version: 1;
  groups: Array<{
    id: string;
    name: string;
    serverIds: string[];
  }>;
}

/**
 * Store quản lý tập trung và chuẩn mực (canonical) cho danh sách máy chủ,
 * các kênh thuộc từng máy chủ, nhóm máy chủ (folder) và trạng thái máy chủ đang hoạt động.
 *
 * Hoàn toàn tách biệt khỏi dữ liệu demo, chỉ hoạt động bằng live data thật từ Supabase/PostgreSQL.
 */
@Injectable({ providedIn: 'root' })
export class ServersStore {
  /** Generation counter để hủy mọi tác vụ dở dang khi chuyển tài khoản hoặc reset */
  readonly generation = signal<number>(0);

  /** User ID hiện tại đang active để phân vùng storage */
  readonly activeUserId = signal<string | null>(null);

  /** Danh sách máy chủ mà user đang tham gia */
  readonly serverList = signal<ServerSummary[]>([]);

  /** Thứ tự tùy chỉnh của các máy chủ trên Rail */
  readonly serverOrderList = signal<string[]>([]);

  /** Danh sách các nhóm (folder) máy chủ */
  readonly serverGroups = signal<ServerGroupSummary[]>([]);

  /** Map danh sách kênh theo serverId */
  readonly channelsByServer = signal<Record<string, ChannelSummary[]>>({});

  /** Map danh sách danh mục (categories) theo serverId */
  readonly categoriesByServer = signal<Record<string, ServerCategorySummary[]>>({});

  /** Map liên kết kênh -> danh mục (channelId -> categoryId) */
  readonly channelCategories = signal<Record<string, string>>({});

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
  readonly servers = computed(() => {
    const raw = this.serverList();
    const order = this.serverOrderList();
    if (order.length === 0) return raw;

    const rank = new Map(order.map((id, index) => [id, index]));
    return [...raw].sort((a, b) => {
      const aRank = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bRank = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name, 'vi');
    });
  });

  /** Số lượng server đang tham gia */
  readonly serverCount = computed(() => this.serverList().length);

  /**
   * Thiết lập danh tính user đang đăng nhập và nạp server groups và categories từ localStorage.
   */
  setActiveUser(userId: string | null): void {
    if (this.activeUserId() === userId) {
      return;
    }
    this.activeUserId.set(userId);
    this.hydrateServerGroupsFromStorage(userId);
    this.hydrateServerCategoriesFromStorage(userId);
  }

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
    const catMap = this.channelCategories();
    for (const s of serversWithChannels) {
      channelMap[s.id] = (s.channels ?? []).map((c) => ({
        ...c,
        categoryId: c.categoryId ?? catMap[c.id] ?? null,
      }));
    }

    this.serverList.set(servers);
    this.channelsByServer.set(channelMap);

    // Tự động prune serverGroups để loại bỏ các serverId không còn tồn tại
    this.pruneServerGroups();
  }

  /**
   * Thay thế toàn bộ danh sách kênh của một server (ví dụ sau khi nhận server:channels-invalidated)
   * Tự động bảo toàn categoryId của kênh đã được gán trên client.
   */
  setChannels(serverId: string, channels: ChannelSummary[]): void {
    const catMap = this.channelCategories();
    const reconciled = channels.map((c) => ({
      ...c,
      categoryId: c.categoryId ?? catMap[c.id] ?? null,
    }));
    this.channelsByServer.update((current) => ({
      ...current,
      [serverId]: reconciled,
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

    const catMap = this.channelCategories();
    const reconciled = channels.map((c) => ({
      ...c,
      categoryId: c.categoryId ?? catMap[c.id] ?? null,
    }));

    this.channelsByServer.update((current) => ({
      ...current,
      [server.id]: reconciled,
    }));

    this.pruneServerGroups();
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

    this.pruneServerGroups();
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
   * Lấy danh sách danh mục (categories) của một server.
   */
  categoriesOf(serverId: string): ServerCategorySummary[] {
    return this.categoriesByServer()[serverId] ?? [];
  }

  /**
   * Thêm hoặc cập nhật một danh mục vào server.
   */
  addCategory(serverId: string, category: ServerCategorySummary): void {
    this.categoriesByServer.update((current) => {
      const existing = current[serverId] ?? [];
      const updated = [...existing.filter((c) => c.id !== category.id), category];
      return {
        ...current,
        [serverId]: updated,
      };
    });
    this.persistCategoriesToStorage();
  }

  /**
   * Gán danh sách danh mục cho server.
   */
  setCategories(serverId: string, categories: ServerCategorySummary[]): void {
    this.categoriesByServer.update((current) => ({
      ...current,
      [serverId]: categories,
    }));
    this.persistCategoriesToStorage();
  }

  /**
   * Xóa một danh mục khỏi server.
   */
  removeCategory(serverId: string, categoryId: string): void {
    this.categoriesByServer.update((current) => {
      const existing = current[serverId] ?? [];
      return {
        ...current,
        [serverId]: existing.filter((c) => c.id !== categoryId),
      };
    });
    this.persistCategoriesToStorage();
  }

  /**
   * Lấy categoryId mà kênh này đang thuộc về.
   */
  getChannelCategory(channelId: string): string | undefined {
    return this.channelCategories()[channelId];
  }

  /**
   * Gán một kênh vào một category cụ thể và lưu vào storage.
   */
  addChannel(serverId: string, channel: ChannelSummary): void {
    if (channel.categoryId) {
      this.setChannelCategory(channel.id, channel.categoryId);
    } else {
      this.setChannelCategory(channel.id, null);
    }
    this.channelsByServer.update((current) => {
      const existing = current[serverId] ?? [];
      const alreadyExists = existing.some((c) => c.id === channel.id);
      if (alreadyExists) {
        return {
          ...current,
          [serverId]: existing.map((c) => (c.id === channel.id ? channel : c)),
        };
      }
      // Kênh mới không có danh mục được chèn lên ĐẦU TIÊN (trên các danh mục)
      if (!channel.categoryId) {
        return {
          ...current,
          [serverId]: [channel, ...existing],
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
   * Xóa một kênh khỏi danh sách.
   */
  removeChannel(serverId: string, channelId: string): void {
    this.channelCategories.update((current) => {
      const next = { ...current };
      delete next[channelId];
      return next;
    });
    this.persistCategoriesToStorage();

    this.channelsByServer.update((current) => {
      const existing = current[serverId] ?? [];
      return {
        ...current,
        [serverId]: existing.filter((c) => c.id !== channelId),
      };
    });
  }

  /**
   * Gán một kênh vào một category cụ thể và lưu vào storage.
   */
  setChannelCategory(channelId: string, categoryId: string | null | undefined): void {
    this.channelCategories.update((current) => {
      if (!categoryId) {
        const next = { ...current };
        delete next[channelId];
        return next;
      }
      return {
        ...current,
        [channelId]: categoryId,
      };
    });
    this.persistCategoriesToStorage();
  }

  /**
   * Di chuyển kênh sang vị trí mới và/hoặc gán danh mục mới (hỗ trợ Drag & Drop Discord-style).
   */
  moveChannel(
    serverId: string,
    channelId: string,
    targetCategoryId: string | null | undefined,
    targetIndex: number,
  ): void {
    const isUncategorized = !targetCategoryId || targetCategoryId === 'cat-uncategorized';
    const effectiveTargetCategoryId = isUncategorized ? null : targetCategoryId;
    this.setChannelCategory(channelId, effectiveTargetCategoryId);

    this.channelsByServer.update((current) => {
      const existing = current[serverId] ?? [];
      const channelIndex = existing.findIndex((c) => c.id === channelId);
      if (channelIndex === -1) return current;

      const targetChannel: ChannelSummary = {
        ...existing[channelIndex],
        categoryId: effectiveTargetCategoryId,
      };

      // Tách kênh cần di chuyển ra khỏi danh sách
      const withoutTarget = existing.filter((c) => c.id !== channelId);

      // Xác định các kênh thuộc targetCategory và các kênh khác
      const targetCategoryChannels: ChannelSummary[] = [];
      const otherChannels: ChannelSummary[] = [];

      for (const c of withoutTarget) {
        const cCat = c.categoryId ?? this.channelCategories()[c.id] ?? null;
        if (isUncategorized) {
          if (!cCat || cCat === 'cat-uncategorized') {
            targetCategoryChannels.push(c);
          } else {
            otherChannels.push(c);
          }
        } else {
          if (cCat === effectiveTargetCategoryId) {
            targetCategoryChannels.push(c);
          } else {
            otherChannels.push(c);
          }
        }
      }

      // Chèn targetChannel vào đúng vị trí targetIndex
      const clampedIndex = Math.max(
        0,
        Math.min(targetIndex, targetCategoryChannels.length),
      );
      targetCategoryChannels.splice(clampedIndex, 0, targetChannel);

      // Ghép lại toàn bộ danh sách kênh:
      // 1. Kênh không thuộc danh mục nào luôn ở ĐẦU TIÊN
      const uncategorizedList: ChannelSummary[] = isUncategorized
        ? targetCategoryChannels
        : otherChannels.filter((c) => {
            const cat = c.categoryId ?? this.channelCategories()[c.id] ?? null;
            return !cat || cat === 'cat-uncategorized';
          });

      const mergedList: ChannelSummary[] = [...uncategorizedList];

      // 2. Tiếp theo là các kênh gom theo từng danh mục
      const customCategories = this.categoriesOf(serverId);
      const defaultCategories: ServerCategorySummary[] = [
        { id: 'cat-text', name: 'Kênh chữ' },
        { id: 'cat-voice', name: 'Kênh thoại' },
      ];
      const allCategories =
        customCategories.length > 0 ? customCategories : defaultCategories;

      for (const cat of allCategories) {
        if (!isUncategorized && cat.id === effectiveTargetCategoryId) {
          mergedList.push(...targetCategoryChannels);
        } else {
          const catChannels = otherChannels.filter((c) => {
            const catId = c.categoryId ?? this.channelCategories()[c.id];
            if (catId) return catId === cat.id;
            if (customCategories.length === 0) {
              if (cat.id === 'cat-voice') return c.type === 'voice';
              if (cat.id === 'cat-text') return c.type !== 'voice';
            }
            return false;
          });
          mergedList.push(...catChannels);
        }
      }

      // Thêm các kênh còn lại chưa gom vào (nếu có category orphaned)
      const mergedIds = new Set(mergedList.map((c) => c.id));
      const remaining = [...targetCategoryChannels, ...otherChannels].filter(
        (c) => !mergedIds.has(c.id),
      );
      mergedList.push(...remaining);

      return {
        ...current,
        [serverId]: mergedList,
      };
    });
  }

  /**
   * Đặt active server và channel.
   */
  setActive(serverId: string | null, channelId: string | null = null): void {
    this.activeServerId.set(serverId);
    this.activeChannelId.set(channelId);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Quản lý Folder / Server Group (Drag & Drop Discord Style)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Thực hiện cam kết nguyên tử (atomic commit) cho một ServerDropIntent hợp lệ.
   * Cập nhật signal và lưu localStorage đúng một lần duy nhất, trả về ServerDropResult cho aria-live.
   */
  commitServerDrop(intent: ServerDropIntent): ServerDropResult | null {
    if (intent.kind === 'none' || intent.kind === 'merge-pending') {
      return null;
    }

    const sourceServer = this.serverOf(intent.sourceServerId);
    if (!sourceServer) return null;

    if (intent.kind === 'merge-server') {
      if (intent.sourceServerId === intent.targetServerId) return null;
      const targetServer = this.serverOf(intent.targetServerId);
      if (!targetServer) return null;

      const existingGroup = this.serverGroups().find((g) =>
        g.serverIds.includes(intent.targetServerId),
      );
      if (existingGroup) {
        this.addServerToGroup(intent.sourceServerId, existingGroup.id);
        const updatedGroup = this.serverGroups().find((g) => g.id === existingGroup.id);
        return {
          action: 'add-to-group',
          sourceServerName: sourceServer.name,
          targetName: existingGroup.name,
          finalIndex: updatedGroup?.serverIds.indexOf(intent.sourceServerId) ?? 0,
          groupId: existingGroup.id,
        };
      }

      const newGroupId = this.groupServers(intent.sourceServerId, intent.targetServerId);
      if (!newGroupId) return null;

      return {
        action: 'create-group',
        sourceServerName: sourceServer.name,
        targetName: targetServer.name,
        finalIndex: 1,
        groupId: newGroupId,
      };
    }

    if (intent.kind === 'insert-group') {
      const targetGroup = this.serverGroups().find((g) => g.id === intent.targetGroupId);
      if (!targetGroup) return null;

      const sourceGroup = this.serverGroups().find((g) =>
        g.serverIds.includes(intent.sourceServerId),
      );
      const targetIndex = intent.index ?? targetGroup.serverIds.length;
      this.moveServerToGroup(intent.sourceServerId, targetGroup.id, targetIndex);

      return {
        action: sourceGroup?.id === targetGroup.id ? 'reorder-group' : 'add-to-group',
        sourceServerName: sourceServer.name,
        targetName: targetGroup.name,
        finalIndex: targetIndex,
        groupId: targetGroup.id,
      };
    }

    if (intent.kind === 'insert-before' || intent.kind === 'insert-after') {
      if (intent.sourceServerId === intent.targetId) return null;

      if (intent.parentGroupId) {
        const group = this.serverGroups().find((g) => g.id === intent.parentGroupId);
        if (!group) return null;
        const targetIdx = group.serverIds.indexOf(intent.targetId);
        if (targetIdx === -1) return null;
        const insertionIndex = intent.kind === 'insert-before' ? targetIdx : targetIdx + 1;
        this.moveServerToGroup(intent.sourceServerId, group.id, insertionIndex);
        return {
          action: 'reorder-group',
          sourceServerName: sourceServer.name,
          targetName: group.name,
          finalIndex: insertionIndex,
          groupId: group.id,
        };
      }

      const refs = this.buildServerRailRefs(this.currentServerOrder(), this.serverGroups());
      const targetRefIndex = refs.findIndex((r) => r.id === intent.targetId);
      if (targetRefIndex === -1) return null;
      const insertionIndex = intent.kind === 'insert-before' ? targetRefIndex : targetRefIndex + 1;
      this.moveServerOutsideGroups(intent.sourceServerId, insertionIndex);
      return {
        action: 'reorder-rail',
        sourceServerName: sourceServer.name,
        finalIndex: insertionIndex,
      };
    }

    if (intent.kind === 'detach-to-rail') {
      this.moveServerOutsideGroups(intent.sourceServerId, intent.railIndex);
      return {
        action: 'detach-from-group',
        sourceServerName: sourceServer.name,
        finalIndex: intent.railIndex,
      };
    }

    return null;
  }

  /** Kéo một server lên server khác: tạo group mới tại đúng vị trí của server đích. */
  groupServers(sourceServerId: string, targetServerId: string): string | null {
    if (
      sourceServerId === targetServerId ||
      !this.hasServer(sourceServerId) ||
      !this.hasServer(targetServerId)
    ) {
      return null;
    }

    const targetGroup = this.serverGroups().find((group) =>
      group.serverIds.includes(targetServerId),
    );
    if (targetGroup) {
      this.addServerToGroup(sourceServerId, targetGroup.id);
      return targetGroup.id;
    }

    const orderBefore = this.currentServerOrder();
    const sourceIndex = orderBefore.indexOf(sourceServerId);
    const targetIndex = orderBefore.indexOf(targetServerId);
    const nextOrder = orderBefore.filter((id) => id !== sourceServerId && id !== targetServerId);
    const targetInsertionIndex = Math.max(
      0,
      Math.min(
        targetIndex - (sourceIndex >= 0 && sourceIndex < targetIndex ? 1 : 0),
        nextOrder.length,
      ),
    );
    nextOrder.splice(targetInsertionIndex, 0, targetServerId, sourceServerId);

    const stableIds = [sourceServerId, targetServerId].sort();
    const groupId = `group-${stableIds.join('-')}`;
    this.updateServerGroups((groups) => {
      const withoutDraggedServers = this.removeServersFromGroups(groups, [
        sourceServerId,
        targetServerId,
      ]);

      return [
        ...withoutDraggedServers,
        {
          id: groupId,
          name: `Nhóm máy chủ ${withoutDraggedServers.length + 1}`,
          serverIds: [targetServerId, sourceServerId],
        },
      ];
    });

    this.updateServerOrder(() => this.normalizeServerOrder(nextOrder, this.serverGroups()));
    return groupId;
  }

  /** Kéo server lên preview group: move giữa các group và không để trùng id. */
  addServerToGroup(serverId: string, groupId: string): void {
    if (!this.hasServer(serverId)) {
      return;
    }

    this.updateServerGroups((groups) => {
      const target = groups.find((group) => group.id === groupId);
      if (!target || target.serverIds.includes(serverId)) {
        return groups;
      }

      return groups
        .map((group) => ({
          ...group,
          serverIds: group.serverIds.filter((id) => id !== serverId),
        }))
        .filter((group) => group.id === groupId || group.serverIds.length >= 2)
        .map((group) =>
          group.id === groupId ? { ...group, serverIds: [...group.serverIds, serverId] } : group,
        );
    });

    this.updateServerOrder((order) =>
      this.normalizeServerOrder(
        order.filter((id) => id !== serverId),
        this.serverGroups(),
      ),
    );
  }

  /**
   * Đưa server vào đúng khe trong group. `insertionIndex` là khe trước item thứ N;
   * giá trị bằng độ dài group nghĩa là thả ở cuối.
   */
  moveServerToGroup(serverId: string, groupId: string, insertionIndex: number): void {
    if (!this.hasServer(serverId)) {
      return;
    }

    this.updateServerGroups((groups) => {
      const targetBefore = groups.find((group) => group.id === groupId);
      if (!targetBefore) {
        return groups;
      }

      const sourceIndex = targetBefore.serverIds.indexOf(serverId);
      const withoutSource = groups.map((group) => ({
        ...group,
        serverIds: group.serverIds.filter((id) => id !== serverId),
      }));
      const target = withoutSource.find((group) => group.id === groupId);
      if (!target) {
        return groups;
      }

      let nextIndex = Math.max(0, Math.min(insertionIndex, targetBefore.serverIds.length));
      if (sourceIndex >= 0 && sourceIndex < nextIndex) {
        nextIndex -= 1;
      }
      nextIndex = Math.min(nextIndex, target.serverIds.length);

      const targetIds = [...target.serverIds];
      targetIds.splice(nextIndex, 0, serverId);

      return withoutSource
        .map((group) => (group.id === groupId ? { ...group, serverIds: targetIds } : group))
        .filter((group) => group.id === groupId || group.serverIds.length >= 2);
    });

    this.updateServerOrder((order) =>
      this.normalizeServerOrder(
        order.filter((id) => id !== serverId),
        this.serverGroups(),
      ),
    );
  }

  /**
   * Đưa server ra rail ngoài group và đặt vào đúng khe đang hiển thị.
   * Nếu group nguồn chỉ còn một server, server còn lại cũng được giải phóng cạnh server vừa kéo.
   */
  moveServerOutsideGroups(serverId: string, insertionIndex: number): void {
    if (!this.hasServer(serverId)) {
      return;
    }

    const groupsBefore = this.serverGroups();
    const refsBefore = this.buildServerRailRefs(this.currentServerOrder(), groupsBefore);
    const sourceTopIndex = refsBefore.findIndex(
      (ref) => ref.kind === 'server' && ref.id === serverId,
    );
    const sourceGroup = groupsBefore.find((group) => group.serverIds.includes(serverId));

    this.updateServerGroups((groups) => this.removeServersFromGroups(groups, [serverId]));

    const groupsAfter = this.serverGroups();
    const groupIdsAfter = new Set(groupsAfter.map((group) => group.id));
    const refsAfter = refsBefore.flatMap<ServerRailRef>((ref) => {
      if (ref.kind === 'server') {
        return ref.id === serverId ? [] : [ref];
      }

      if (groupIdsAfter.has(ref.id)) {
        return [ref];
      }

      if (sourceGroup?.id === ref.id) {
        return sourceGroup.serverIds
          .filter((id) => id !== serverId)
          .map((id) => ({ kind: 'server' as const, id }));
      }

      return [];
    });

    let targetIndex = Math.max(0, Math.min(insertionIndex, refsBefore.length));
    if (sourceTopIndex >= 0 && sourceTopIndex < targetIndex) {
      targetIndex -= 1;
    }
    targetIndex = Math.max(0, Math.min(targetIndex, refsAfter.length));

    refsAfter.splice(targetIndex, 0, { kind: 'server', id: serverId });

    this.updateServerOrder(() =>
      this.normalizeServerOrder(this.flattenRailRefsToServerOrder(refsAfter), groupsAfter),
    );
  }

  private hasServer(serverId: string): boolean {
    return this.serverList().some((server) => server.id === serverId);
  }

  private currentServerOrder(): string[] {
    const raw = this.serverList().map((s) => s.id);
    const order = this.serverOrderList();
    const known = new Set(raw);
    const valid = order.filter((id) => known.has(id));
    const missing = raw.filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  }

  private updateServerGroups(fn: (groups: ServerGroupSummary[]) => ServerGroupSummary[]): void {
    const next = fn(this.serverGroups());
    this.serverGroups.set(next);
    this.persistGroupsToStorage();
  }

  private updateServerOrder(fn: (order: string[]) => string[]): void {
    const next = fn(this.currentServerOrder());
    this.serverOrderList.set(next);
  }

  private removeServersFromGroups(
    groups: ServerGroupSummary[],
    serverIds: string[],
  ): ServerGroupSummary[] {
    const removeSet = new Set(serverIds);
    return groups
      .map((group) => ({
        ...group,
        serverIds: group.serverIds.filter((id) => !removeSet.has(id)),
      }))
      .filter((group) => group.serverIds.length >= 2);
  }

  private normalizeServerOrder(rawOrder: string[], groups: ServerGroupSummary[]): string[] {
    const allKnownIds = this.serverList().map((s) => s.id);
    const knownSet = new Set(allKnownIds);
    const groupedIds = new Set(groups.flatMap((g) => g.serverIds));
    const normalized: string[] = [];
    const seen = new Set<string>();

    for (const id of rawOrder) {
      if (!knownSet.has(id) || seen.has(id)) {
        continue;
      }
      seen.add(id);
      normalized.push(id);
    }

    for (const id of allKnownIds) {
      if (!seen.has(id)) {
        seen.add(id);
        normalized.push(id);
      }
    }

    return normalized;
  }

  private buildServerRailRefs(order: string[], groups: ServerGroupSummary[]): ServerRailRef[] {
    const processedGroupIds = new Set<string>();
    const groupedServerIds = new Set(groups.flatMap((g) => g.serverIds));
    const refs: ServerRailRef[] = [];

    for (const serverId of order) {
      if (!groupedServerIds.has(serverId)) {
        refs.push({ kind: 'server', id: serverId });
        continue;
      }

      const parentGroup = groups.find((g) => g.serverIds.includes(serverId));
      if (!parentGroup || processedGroupIds.has(parentGroup.id)) {
        continue;
      }

      processedGroupIds.add(parentGroup.id);
      refs.push({ kind: 'folder', id: parentGroup.id });
    }

    return refs;
  }

  private flattenRailRefsToServerOrder(refs: ServerRailRef[]): string[] {
    const groups = this.serverGroups();
    const groupMap = new Map(groups.map((group) => [group.id, group]));
    const order: string[] = [];

    for (const ref of refs) {
      if (ref.kind === 'server') {
        order.push(ref.id);
        continue;
      }

      const group = groupMap.get(ref.id);
      if (group) {
        order.push(...group.serverIds);
      }
    }

    return order;
  }

  /**
   * Tự động prune serverGroups:
   * - Loại bỏ serverIds không còn tồn tại trong serverList()
   * - Deduplicate groupId và serverId (1 serverId chỉ thuộc tối đa 1 group)
   * - Dissolve group nào còn <= 1 server
   * - Persist lại kết quả sạch
   */
  pruneServerGroups(): void {
    const knownIds = new Set(this.serverList().map((s) => s.id));
    const currentGroups = this.serverGroups();
    if (currentGroups.length === 0) {
      return;
    }

    const seenGroupIds = new Set<string>();
    const seenServerIds = new Set<string>();
    const nextGroups: ServerGroupSummary[] = [];

    for (const group of currentGroups) {
      if (!group.id || seenGroupIds.has(group.id)) {
        continue;
      }
      seenGroupIds.add(group.id);

      const validServerIds: string[] = [];
      for (const id of group.serverIds ?? []) {
        if (knownIds.has(id) && !seenServerIds.has(id)) {
          seenServerIds.add(id);
          validServerIds.push(id);
        }
      }

      if (validServerIds.length >= 2) {
        nextGroups.push({
          id: group.id,
          name: group.name || `Nhóm máy chủ ${nextGroups.length + 1}`,
          serverIds: validServerIds,
        });
      }
    }

    this.serverGroups.set(nextGroups);
    this.persistGroupsToStorage();
  }

  private hydrateServerGroupsFromStorage(userId: string | null): void {
    if (!userId || typeof window === 'undefined' || !window.localStorage) {
      this.serverGroups.set([]);
      return;
    }

    const storageKey = `${STORAGE_PREFIX}${userId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        this.serverGroups.set([]);
        return;
      }

      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !Array.isArray((parsed as PersistedGroupsPayload).groups)
      ) {
        // Schema không hợp lệ -> reset
        this.serverGroups.set([]);
        return;
      }

      const payload = parsed as PersistedGroupsPayload;
      const validGroups: ServerGroupSummary[] = [];
      const seenGroupIds = new Set<string>();
      const seenServerIds = new Set<string>();

      for (const g of payload.groups) {
        if (typeof g.id !== 'string' || !g.id || seenGroupIds.has(g.id)) continue;
        if (!Array.isArray(g.serverIds)) continue;

        seenGroupIds.add(g.id);
        const groupServerIds: string[] = [];
        for (const sId of g.serverIds) {
          if (typeof sId === 'string' && sId && !seenServerIds.has(sId)) {
            seenServerIds.add(sId);
            groupServerIds.push(sId);
          }
        }

        if (groupServerIds.length >= 2) {
          validGroups.push({
            id: g.id,
            name: typeof g.name === 'string' && g.name.trim() ? g.name.trim() : 'Nhóm máy chủ',
            serverIds: groupServerIds,
          });
        }
      }

      this.serverGroups.set(validGroups);
    } catch {
      this.serverGroups.set([]);
    }
  }

  private persistGroupsToStorage(): void {
    const userId = this.activeUserId();
    if (!userId || typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const storageKey = `${STORAGE_PREFIX}${userId}`;
    try {
      const groups = this.serverGroups();
      if (groups.length === 0) {
        localStorage.removeItem(storageKey);
        return;
      }

      const payload: PersistedGroupsPayload = {
        version: 1,
        groups: groups.map((g) => ({
          id: g.id,
          name: g.name,
          serverIds: g.serverIds,
        })),
      };

      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Storage unavailable or full
    }
  }

  private hydrateServerCategoriesFromStorage(userId: string | null): void {
    if (!userId) {
      this.categoriesByServer.set({});
      this.channelCategories.set({});
      return;
    }
    try {
      const raw = localStorage.getItem(`${CATEGORIES_STORAGE_PREFIX}${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.categoriesByServer.set(parsed);
        }
      }
    } catch {
      // Ignore
    }

    try {
      const rawMap = localStorage.getItem(`${CHANNEL_CATEGORIES_PREFIX}${userId}`);
      if (rawMap) {
        const parsedMap = JSON.parse(rawMap);
        if (parsedMap && typeof parsedMap === 'object') {
          this.channelCategories.set(parsedMap);
        }
      }
    } catch {
      // Ignore
    }
  }

  private persistCategoriesToStorage(): void {
    const userId = this.activeUserId();
    if (!userId) return;
    try {
      localStorage.setItem(
        `${CATEGORIES_STORAGE_PREFIX}${userId}`,
        JSON.stringify(this.categoriesByServer()),
      );
    } catch {
      // Storage unavailable or full
    }
    try {
      localStorage.setItem(
        `${CHANNEL_CATEGORIES_PREFIX}${userId}`,
        JSON.stringify(this.channelCategories()),
      );
    } catch {
      // Storage unavailable or full
    }
  }

  /**
   * Xóa toàn bộ in-memory state (khi logout hoặc chuyển tài khoản).
   * Tuyệt đối KHÔNG xóa localStorage của user vừa logout để bảo toàn dữ liệu cho lần đăng nhập sau.
   */
  clear(): void {
    this.serverList.set([]);
    this.serverOrderList.set([]);
    this.serverGroups.set([]);
    this.channelsByServer.set({});
    this.categoriesByServer.set({});
    this.channelCategories.set({});
    this.activeServerId.set(null);
    this.activeChannelId.set(null);
    this.activeUserId.set(null);
    this.isLoading.set(false);
    this.isHydrated.set(false);
    this.hydrationPromise = null;
    this.generation.update((g) => g + 1);
  }
}
