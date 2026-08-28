import { computed, Injectable, signal } from '@angular/core';
import type { ServersApiService } from '../api/servers-api.service';
import type {
  ChannelSummary,
  ServerCategorySummary,
  ServerChannelLayout,
  ServerChannelStructure,
  ServerGroupSummary,
  ServerRailRef,
  ServerRootItem,
  ServerSummary,
} from './server.models';
import type {
  ServerDropIntent,
  ServerDropResult,
} from '../../layouts/app-layout/components/server-rail/services/server-drop-intent';

const STORAGE_PREFIX = 'nexuscord_server_groups_';
const CATEGORIES_STORAGE_PREFIX = 'nexuscord_server_categories_';
const CHANNEL_LAYOUT_PREFIX = 'nexuscord_channel_layout_v1_';
const CHANNEL_META_PREFIX = 'nexuscord_channel_meta_v1_';

interface PersistedChannelMeta {
  slowmode?: number;
  isAgeRestricted?: boolean;
  contentVisibility?: 'default' | 'age_restricted';
}

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

  /** Map danh sách kênh theo serverId (lưu entity data của channels) */
  readonly channelsByServer = signal<Record<string, ChannelSummary[]>>({});

  /** Map danh sách danh mục (categories) theo serverId */
  readonly categoriesByServer = signal<Record<string, ServerCategorySummary[]>>({});

  /** Layout phân cấp và thứ tự chuẩn mực (canonical) duy nhất cho từng server */
  readonly serverChannelLayouts = signal<Record<string, ServerChannelLayout>>({});

  /** Map liên kết kênh -> danh mục (channelId -> categoryId) được derive trực tiếp từ layout */
  readonly channelCategories = computed<Record<string, string>>(() => {
    const layouts = this.serverChannelLayouts();
    const map: Record<string, string> = {};
    for (const layout of Object.values(layouts)) {
      if (!layout?.categoryChannels) continue;
      for (const [catId, chIds] of Object.entries(layout.categoryChannels)) {
        for (const chId of chIds) {
          map[chId] = catId;
        }
      }
    }
    return map;
  });

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
   * Thiết lập danh tính user. Chỉ folder trên server rail là tùy chọn cá nhân;
   * category/channel layout được hydrate từ backend theo server.
   */
  setActiveUser(userId: string | null): void {
    if (this.activeUserId() === userId) {
      return;
    }
    this.activeUserId.set(userId);
    this.hydrateServerGroupsFromStorage(userId);
    this.categoriesByServer.set({});
    this.serverChannelLayouts.set({});
    this.removeLegacyPerUserChannelStructure(userId);
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
      systemChannelId?: string | null;
      unread?: boolean;
      mentionCount?: number;
      channels?: ChannelSummary[];
      channelStructure?: ServerChannelStructure | null;
    }>,
  ): void {
    const servers: ServerSummary[] = serversWithChannels.map((s) => ({
      id: s.id,
      name: s.name,
      iconUrl: s.iconUrl ?? null,
      systemChannelId: s.systemChannelId ?? null,
      unread: s.unread ?? false,
      mentionCount: s.mentionCount ?? 0,
    }));

    const channelMap: Record<string, ChannelSummary[]> = {};
    for (const s of serversWithChannels) {
      channelMap[s.id] = (s.channels ?? []).map((c) => this.enrichChannel(c));
    }

    this.serverList.set(servers);
    this.channelsByServer.set(channelMap);
    this.categoriesByServer.set({});
    this.serverChannelLayouts.set({});

    // Ưu tiên structure canonical từ backend; null thì derive layout mặc định.
    for (const s of serversWithChannels) {
      this.applyServerChannelStructure(s.id, s.channelStructure ?? null);
    }

    // Tự động prune serverGroups để loại bỏ các serverId không còn tồn tại
    this.pruneServerGroups();
  }

  /**
   * Thay thế toàn bộ danh sách kênh của một server (ví dụ sau khi nhận server:channels-invalidated)
   */
  setChannels(serverId: string, channels: ChannelSummary[]): void {
    this.channelsByServer.update((current) => ({
      ...current,
      [serverId]: channels.map((c) => this.enrichChannel(c)),
    }));
    this.reconcileServerLayout(serverId);
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
      [server.id]: channels.map((c) => this.enrichChannel(c)),
    }));

    this.reconcileServerLayout(server.id);
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
    this.serverChannelLayouts.update((current) => {
      const next = { ...current };
      delete next[serverId];
      return next;
    });
    this.persistChannelLayoutsToStorage();

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

  /**
   * Cập nhật một phần thông tin server (name, iconUrl, ...) mà không cần cung cấp channels.
   * Dùng khi lưu cài đặt tổng quan máy chủ để đồng bộ sidebar ngay lập tức.
   */
  patchServer(serverId: string, updates: Partial<Omit<ServerSummary, 'id'>>): void {
    this.serverList.update((current) =>
      current.map((s) => (s.id === serverId ? { ...s, ...updates } : s)),
    );
  }

  getServer(serverId: string): ServerSummary | undefined {
    return this.serverOf(serverId);
  }

  /**
   * Lấy danh sách kênh của một server, đã được sắp xếp và gán categoryId theo layout canonical.
   */
  channelsOf(serverId: string): ChannelSummary[] {
    const raw = this.channelsByServer()[serverId] ?? [];
    const catMap = this.channelCategories();
    const rawMap = new Map(raw.map((c) => [c.id, c]));

    const layout = this.serverChannelLayouts()[serverId];
    if (!layout) {
      return raw.map((c) => ({
        ...c,
        categoryId:
          catMap[c.id] ?? (c.categoryId === 'cat-uncategorized' ? null : (c.categoryId ?? null)),
      }));
    }

    const orderedList: ChannelSummary[] = [];
    const visited = new Set<string>();

    for (const item of layout.rootItems) {
      if (item.kind === 'channel') {
        const ch = rawMap.get(item.id);
        if (ch && !visited.has(item.id)) {
          orderedList.push({
            ...ch,
            categoryId: null,
          });
          visited.add(item.id);
        }
      } else if (item.kind === 'category') {
        const childIds = layout.categoryChannels[item.id] ?? [];
        for (const childId of childIds) {
          const ch = rawMap.get(childId);
          if (ch && !visited.has(childId)) {
            orderedList.push({
              ...ch,
              categoryId: item.id,
            });
            visited.add(childId);
          }
        }
      }
    }

    // Các kênh còn lại chưa có trong layout
    for (const ch of raw) {
      if (!visited.has(ch.id)) {
        orderedList.push({
          ...ch,
          categoryId:
            catMap[ch.id] ??
            (ch.categoryId === 'cat-uncategorized' ? null : (ch.categoryId ?? null)),
        });
        visited.add(ch.id);
      }
    }

    return orderedList;
  }

  getChannels(serverId: string): ChannelSummary[] {
    return this.channelsOf(serverId);
  }

  /** Snapshot structure hiện tại để gửi backend sau một thao tác quản trị. */
  channelStructureOf(serverId: string): ServerChannelStructure {
    const layout = this.computeServerLayout(serverId);
    return {
      version: 1,
      categories: this.categoriesOf(serverId).map((category) => ({ ...category })),
      rootItems: layout.rootItems.map((item) => ({ ...item })),
      categoryChannels: Object.fromEntries(
        Object.entries(layout.categoryChannels).map(([id, channelIds]) => [id, [...channelIds]]),
      ),
      revision: this.serverChannelLayouts()[serverId]
        ? (this.serverChannelLayouts()[serverId] as ServerChannelStructure).revision
        : undefined,
    };
  }

  /** Áp dụng structure canonical nhận từ REST hoặc realtime. */
  applyServerChannelStructure(serverId: string, structure: ServerChannelStructure | null): void {
    if (!structure) {
      this.categoriesByServer.update((current) => {
        const next = { ...current };
        delete next[serverId];
        return next;
      });
      this.serverChannelLayouts.update((current) => {
        const next = { ...current };
        delete next[serverId];
        return next;
      });
      this.reconcileServerLayout(serverId);
      return;
    }

    const current = this.serverChannelLayouts()[serverId] as ServerChannelStructure | undefined;
    if (
      current?.revision !== undefined &&
      structure.revision !== undefined &&
      structure.revision < current.revision
    ) {
      return;
    }

    this.categoriesByServer.update((all) => ({
      ...all,
      [serverId]: structure.categories.map((category) => ({ ...category })),
    }));
    this.serverChannelLayouts.update((all) => ({
      ...all,
      [serverId]: {
        version: 1,
        rootItems: structure.rootItems.map((item) => ({ ...item })),
        categoryChannels: Object.fromEntries(
          Object.entries(structure.categoryChannels).map(([id, channelIds]) => [
            id,
            [...channelIds],
          ]),
        ),
        revision: structure.revision,
        updatedAt: structure.updatedAt,
      } as ServerChannelStructure,
    }));
    this.reconcileServerLayout(serverId);
  }

  /**
   * Lấy danh sách danh mục (categories) của một server.
   */
  categoriesOf(serverId: string): ServerCategorySummary[] {
    const custom = this.categoriesByServer()[serverId];
    if (custom && custom.length > 0) return custom;
    const channels = this.channelsByServer()[serverId] ?? [];
    if (channels.length === 0) return [];
    return [
      { id: 'cat-text', name: 'Kênh chữ' },
      { id: 'cat-voice', name: 'Kênh thoại' },
    ];
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

    // Cập nhật ServerChannelLayout: thêm category vào rootItems nếu chưa có
    const layout = this.reconcileServerLayout(serverId);
    const hasCategoryInRoot = layout.rootItems.some(
      (item) => item.kind === 'category' && item.id === category.id,
    );
    if (!hasCategoryInRoot) {
      const nextRoot = [...layout.rootItems, { kind: 'category' as const, id: category.id }];
      const nextCatChannels = {
        ...layout.categoryChannels,
        [category.id]: layout.categoryChannels[category.id] ?? [],
      };
      this.serverChannelLayouts.update((current) => ({
        ...current,
        [serverId]: {
          version: 1,
          rootItems: nextRoot,
          categoryChannels: nextCatChannels,
        },
      }));
      this.persistChannelLayoutsToStorage();
    }
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
    this.reconcileServerLayout(serverId);
  }

  /**
   * Xóa một danh mục khỏi server: chuyển toàn bộ kênh con ra root tại đúng vị trí của category vừa xóa.
   */
  removeCategory(serverId: string, categoryId: string): void {
    const layout = this.reconcileServerLayout(serverId);
    const catIndex = layout.rootItems.findIndex(
      (item) => item.kind === 'category' && item.id === categoryId,
    );

    const childChannelIds = layout.categoryChannels[categoryId] ?? [];
    const nextRootItems = [...layout.rootItems];

    if (catIndex !== -1) {
      const replacementRootChannels: ServerRootItem[] = childChannelIds.map((id) => ({
        kind: 'channel' as const,
        id,
      }));
      nextRootItems.splice(catIndex, 1, ...replacementRootChannels);
    }

    const nextCategoryChannels = { ...layout.categoryChannels };
    delete nextCategoryChannels[categoryId];

    this.categoriesByServer.update((current) => {
      const existing = current[serverId] ?? [];
      return {
        ...current,
        [serverId]: existing.filter((c) => c.id !== categoryId),
      };
    });
    this.persistCategoriesToStorage();

    this.serverChannelLayouts.update((current) => ({
      ...current,
      [serverId]: {
        version: 1,
        rootItems: nextRootItems,
        categoryChannels: nextCategoryChannels,
      },
    }));
    this.persistChannelLayoutsToStorage();
  }

  /**
   * Lấy categoryId mà kênh này đang thuộc về.
   */
  getChannelCategory(channelId: string): string | undefined {
    return this.channelCategories()[channelId];
  }

  /**
   * Thêm một kênh vào server: gắn vào category nếu có, hoặc append vào root.
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

    const layout = this.reconcileServerLayout(serverId);
    const knownCats = new Set(this.categoriesOf(serverId).map((c) => c.id));
    const targetCatId =
      channel.categoryId && knownCats.has(channel.categoryId) ? channel.categoryId : null;

    // Đảm bảo kênh không bị duplicate
    const nextRoot = layout.rootItems.filter(
      (item) => !(item.kind === 'channel' && item.id === channel.id),
    );
    const nextCatChannels: Record<string, string[]> = {};
    for (const [cId, ids] of Object.entries(layout.categoryChannels)) {
      nextCatChannels[cId] = ids.filter((id) => id !== channel.id);
    }

    if (targetCatId) {
      nextCatChannels[targetCatId] = [...(nextCatChannels[targetCatId] ?? []), channel.id];
    } else {
      nextRoot.push({ kind: 'channel', id: channel.id });
    }

    this.serverChannelLayouts.update((current) => ({
      ...current,
      [serverId]: {
        version: 1,
        rootItems: nextRoot,
        categoryChannels: nextCatChannels,
      },
    }));
    this.persistChannelLayoutsToStorage();
  }

  /**
   * Cập nhật thông tin của một kênh và lưu metadata vào local storage.
   */
  updateChannel(serverId: string, channel: ChannelSummary): void {
    this.saveChannelMeta(channel.id, {
      slowmode: channel.slowmode,
      isAgeRestricted: channel.isAgeRestricted,
      contentVisibility: channel.contentVisibility,
    });

    this.channelsByServer.update((current) => {
      const existing = current[serverId] ?? [];
      return {
        ...current,
        [serverId]: existing.map((c) =>
          c.id === channel.id ? this.enrichChannel({ ...c, ...channel }) : c,
        ),
      };
    });
  }

  private getChannelMeta(channelId: string): PersistedChannelMeta {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(`${CHANNEL_META_PREFIX}${channelId}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveChannelMeta(channelId: string, meta: PersistedChannelMeta): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(`${CHANNEL_META_PREFIX}${channelId}`, JSON.stringify(meta));
    } catch {
      // ignore
    }
  }

  private enrichChannel(c: ChannelSummary): ChannelSummary {
    const meta = this.getChannelMeta(c.id);
    return {
      ...c,
      slowmode: c.slowmode !== undefined ? c.slowmode : (meta.slowmode ?? 0),
      isAgeRestricted:
        c.isAgeRestricted !== undefined ? c.isAgeRestricted : (meta.isAgeRestricted ?? false),
      contentVisibility:
        c.contentVisibility !== undefined
          ? c.contentVisibility
          : (meta.contentVisibility ?? (meta.isAgeRestricted ? 'age_restricted' : 'default')),
    };
  }

  /**
   * Xóa một kênh khỏi danh sách và loại khỏi layout.
   */
  removeChannel(serverId: string, channelId: string): void {
    this.channelsByServer.update((current) => {
      const existing = current[serverId] ?? [];
      return {
        ...current,
        [serverId]: existing.filter((c) => c.id !== channelId),
      };
    });

    const layout = this.serverChannelLayouts()[serverId];
    if (layout) {
      const nextRoot = layout.rootItems.filter(
        (item) => !(item.kind === 'channel' && item.id === channelId),
      );
      const nextCatChannels: Record<string, string[]> = {};
      for (const [cId, ids] of Object.entries(layout.categoryChannels)) {
        nextCatChannels[cId] = ids.filter((id) => id !== channelId);
      }
      this.serverChannelLayouts.update((current) => ({
        ...current,
        [serverId]: {
          version: 1,
          rootItems: nextRoot,
          categoryChannels: nextCatChannels,
        },
      }));
      this.persistChannelLayoutsToStorage();
    }
  }

  /**
   * Gán một kênh vào một category cụ thể.
   */
  setChannelCategory(channelId: string, categoryId: string | null | undefined): void {
    // Tìm server chứa channel này
    for (const [srvId, channels] of Object.entries(this.channelsByServer())) {
      if (channels.some((c) => c.id === channelId)) {
        this.moveChannel(srvId, channelId, categoryId, Number.MAX_SAFE_INTEGER);
        return;
      }
    }
  }

  /**
   * Tính toán ServerChannelLayout thuần túy (Pure function, an toàn khi gọi trong signal computed).
   */
  computeServerLayout(serverId: string): ServerChannelLayout {
    const channels = this.channelsByServer()[serverId] ?? [];
    const customCategories = this.categoriesByServer()[serverId] ?? [];
    const defaultCategories: ServerCategorySummary[] = [
      { id: 'cat-text', name: 'Kênh chữ' },
      { id: 'cat-voice', name: 'Kênh thoại' },
    ];
    const categories = customCategories.length > 0 ? customCategories : defaultCategories;
    const isDefaultCats = customCategories.length === 0;

    const knownCategoryIds = new Set(categories.map((c) => c.id));
    const knownChannelMap = new Map(channels.map((c) => [c.id, c]));

    const existingLayout = this.serverChannelLayouts()[serverId];
    const rootOrder: ServerRootItem[] = [];
    const categoryChannels: Record<string, string[]> = {};

    for (const catId of knownCategoryIds) {
      categoryChannels[catId] = [];
    }

    const assignedChannelIds = new Set<string>();

    if (existingLayout && Array.isArray(existingLayout.rootItems)) {
      // 1. Reconcile categoryChannels hiện có
      for (const [catId, chIds] of Object.entries(existingLayout.categoryChannels ?? {})) {
        if (knownCategoryIds.has(catId)) {
          for (const chId of chIds) {
            if (knownChannelMap.has(chId) && !assignedChannelIds.has(chId)) {
              categoryChannels[catId].push(chId);
              assignedChannelIds.add(chId);
            }
          }
        }
      }

      // 2. Reconcile rootItems hiện có
      for (const item of existingLayout.rootItems) {
        if (item.kind === 'category') {
          if (knownCategoryIds.has(item.id)) {
            rootOrder.push(item);
          } else {
            // Category đã bị xóa: chuyển các kênh con sang root
            const orphaned = (existingLayout.categoryChannels?.[item.id] ?? []).filter(
              (chId) => knownChannelMap.has(chId) && !assignedChannelIds.has(chId),
            );
            for (const orphanId of orphaned) {
              rootOrder.push({ kind: 'channel', id: orphanId });
              assignedChannelIds.add(orphanId);
            }
          }
        } else if (item.kind === 'channel') {
          const ch = knownChannelMap.get(item.id);
          if (ch && !assignedChannelIds.has(item.id)) {
            if (ch.categoryId && knownCategoryIds.has(ch.categoryId)) {
              categoryChannels[ch.categoryId].push(ch.id);
              assignedChannelIds.add(ch.id);
            } else {
              rootOrder.push(item);
              assignedChannelIds.add(item.id);
            }
          }
        }
      }
    } else {
      // Chưa có layout: thêm tất cả categories vào rootOrder
      for (const cat of categories) {
        rootOrder.push({ kind: 'category', id: cat.id });
      }
    }

    // 3. Đảm bảo mọi category đã biết đều có trong rootOrder
    const rootCategoryIds = new Set(
      rootOrder.filter((item) => item.kind === 'category').map((item) => item.id),
    );
    for (const cat of categories) {
      if (!rootCategoryIds.has(cat.id)) {
        rootOrder.push({ kind: 'category', id: cat.id });
      }
    }

    // 4. Các kênh chưa được gán vào layout (kênh mới từ backend/socket)
    for (const ch of channels) {
      if (!assignedChannelIds.has(ch.id)) {
        if (ch.categoryId === 'cat-uncategorized') {
          rootOrder.push({ kind: 'channel', id: ch.id });
          assignedChannelIds.add(ch.id);
        } else if (ch.categoryId && knownCategoryIds.has(ch.categoryId)) {
          categoryChannels[ch.categoryId].push(ch.id);
          assignedChannelIds.add(ch.id);
        } else if (isDefaultCats) {
          const targetCat = ch.type === 'voice' ? 'cat-voice' : 'cat-text';
          categoryChannels[targetCat].push(ch.id);
          assignedChannelIds.add(ch.id);
        } else {
          rootOrder.push({ kind: 'channel', id: ch.id });
          assignedChannelIds.add(ch.id);
        }
      }
    }

    let finalRootItems = rootOrder;
    if (isDefaultCats && channels.length === 0) {
      finalRootItems = [];
    } else if (isDefaultCats) {
      finalRootItems = rootOrder.filter((item) => {
        if (item.kind === 'category') {
          return (categoryChannels[item.id] ?? []).length > 0;
        }
        return true;
      });
    }

    return {
      version: 1,
      rootItems: finalRootItems,
      categoryChannels,
    };
  }

  /**
   * Lấy ServerChannelLayout hiện tại của server (thuần túy, an toàn cho computed).
   */
  getServerLayout(serverId: string): ServerChannelLayout {
    return this.computeServerLayout(serverId);
  }

  /**
   * Reconcile và chuẩn hóa ServerChannelLayout của server:
   * - Giữ vững tính bất biến: Mỗi channel chỉ xuất hiện đúng 1 lần trong toàn layout.
   * - Categories không hợp lệ bị xóa, kênh con chuyển ra root tại đúng vị trí đó.
   * - Kênh mới được tự động append vào category tương ứng hoặc root.
   */
  reconcileServerLayout(serverId: string): ServerChannelLayout {
    const cleanLayout = this.computeServerLayout(serverId);
    const existing = this.serverChannelLayouts()[serverId] as ServerChannelStructure | undefined;
    const reconciled: ServerChannelStructure = {
      ...cleanLayout,
      revision: existing?.revision,
      updatedAt: existing?.updatedAt,
      categories: this.categoriesOf(serverId).map((category) => ({ ...category })),
    };

    this.serverChannelLayouts.update((current) => ({
      ...current,
      [serverId]: reconciled,
    }));

    this.persistChannelLayoutsToStorage();
    return reconciled;
  }

  /**
   * Di chuyển kênh sang vị trí mới và/hoặc gán danh mục mới (Atomic mutation trên ServerChannelLayout).
   */
  moveChannel(
    serverId: string,
    channelId: string,
    targetCategoryId: string | null | undefined,
    targetIndex: number,
    targetRootIndex?: number,
  ): void {
    const layout = this.reconcileServerLayout(serverId);
    const isUncategorized = !targetCategoryId || targetCategoryId === 'cat-uncategorized';
    const effectiveTargetCategoryId = isUncategorized ? null : targetCategoryId;

    // Cập nhật entity trong channelsByServer
    this.channelsByServer.update((current) => {
      const list = current[serverId] ?? [];
      return {
        ...current,
        [serverId]: list.map((c) =>
          c.id === channelId ? { ...c, categoryId: effectiveTargetCategoryId } : c,
        ),
      };
    });

    // 1. Tách channelId ra khỏi rootItems và toàn bộ categoryChannels
    const nextRootItems = layout.rootItems.filter(
      (item) => !(item.kind === 'channel' && item.id === channelId),
    );

    const nextCategoryChannels: Record<string, string[]> = {};
    for (const [catId, chIds] of Object.entries(layout.categoryChannels)) {
      nextCategoryChannels[catId] = chIds.filter((id) => id !== channelId);
    }

    // 2. Chèn channelId vào đích đến mới
    if (
      effectiveTargetCategoryId &&
      nextCategoryChannels[effectiveTargetCategoryId] !== undefined
    ) {
      const targetArray = nextCategoryChannels[effectiveTargetCategoryId];
      const clampedIndex = Math.max(0, Math.min(targetIndex, targetArray.length));
      targetArray.splice(clampedIndex, 0, channelId);
    } else {
      // Đích đến là Root Channel (cấp máy chủ)
      const insertionIndex = targetRootIndex !== undefined ? targetRootIndex : targetIndex;
      const clampedIndex = Math.max(0, Math.min(insertionIndex, nextRootItems.length));
      nextRootItems.splice(clampedIndex, 0, { kind: 'channel', id: channelId });
    }

    const updatedLayout: ServerChannelLayout = {
      version: 1,
      rootItems: nextRootItems,
      categoryChannels: nextCategoryChannels,
    };

    this.serverChannelLayouts.update((current) => ({
      ...current,
      [serverId]: updatedLayout,
    }));

    this.persistChannelLayoutsToStorage();
  }

  /**
   * Di chuyển Category tại cấp gốc (kèm toàn bộ các kênh con).
   */
  moveCategory(serverId: string, categoryId: string, targetRootIndex: number): void {
    const layout = this.reconcileServerLayout(serverId);
    const fromIndex = layout.rootItems.findIndex(
      (item) => item.kind === 'category' && item.id === categoryId,
    );
    if (fromIndex === -1) return;

    const nextRootItems = [...layout.rootItems];
    const [removed] = nextRootItems.splice(fromIndex, 1);
    const clampedIndex = Math.max(0, Math.min(targetRootIndex, nextRootItems.length));
    nextRootItems.splice(clampedIndex, 0, removed);

    const updatedLayout: ServerChannelLayout = {
      ...layout,
      rootItems: nextRootItems,
    };

    // Đồng bộ thứ tự categoriesByServer theo layout root category order
    const rootCatIds = nextRootItems
      .filter((item) => item.kind === 'category')
      .map((item) => item.id);
    const existingCats = this.categoriesByServer()[serverId] ?? [];
    const catMap = new Map(existingCats.map((c) => [c.id, c]));
    const reorderedCats = rootCatIds
      .map((id) => catMap.get(id))
      .filter((c): c is ServerCategorySummary => !!c);

    if (reorderedCats.length > 0) {
      this.categoriesByServer.update((current) => ({
        ...current,
        [serverId]: reorderedCats,
      }));
      this.persistCategoriesToStorage();
    }

    this.serverChannelLayouts.update((current) => ({
      ...current,
      [serverId]: updatedLayout,
    }));
    this.persistChannelLayoutsToStorage();
  }

  /**
   * Sắp xếp lại phần tử cấp gốc (Category hoặc Root Channel xen kẽ).
   */
  moveRootItem(serverId: string, previousIndex: number, currentIndex: number): void {
    const layout = this.reconcileServerLayout(serverId);
    if (previousIndex < 0 || previousIndex >= layout.rootItems.length) return;

    const nextRootItems = [...layout.rootItems];
    const [removed] = nextRootItems.splice(previousIndex, 1);
    const clampedIndex = Math.max(0, Math.min(currentIndex, nextRootItems.length));
    nextRootItems.splice(clampedIndex, 0, removed);

    const updatedLayout: ServerChannelLayout = {
      ...layout,
      rootItems: nextRootItems,
    };

    // Đồng bộ thứ tự categoriesByServer theo layout root category order
    const rootCatIds = nextRootItems
      .filter((item) => item.kind === 'category')
      .map((item) => item.id);
    const existingCats = this.categoriesByServer()[serverId] ?? [];
    const catMap = new Map(existingCats.map((c) => [c.id, c]));
    const reorderedCats = rootCatIds
      .map((id) => catMap.get(id))
      .filter((c): c is ServerCategorySummary => !!c);

    if (reorderedCats.length > 0) {
      this.categoriesByServer.update((current) => ({
        ...current,
        [serverId]: reorderedCats,
      }));
      this.persistCategoriesToStorage();
    }

    this.serverChannelLayouts.update((current) => ({
      ...current,
      [serverId]: updatedLayout,
    }));
    this.persistChannelLayoutsToStorage();
  }

  /**
   * Sắp xếp lại thứ tự các kênh con trong cùng một Category.
   */
  reorderCategoryChildren(
    serverId: string,
    categoryId: string,
    previousIndex: number,
    currentIndex: number,
  ): void {
    const layout = this.reconcileServerLayout(serverId);
    const children = layout.categoryChannels[categoryId];
    if (!children || previousIndex < 0 || previousIndex >= children.length) return;

    const nextChildren = [...children];
    const [removed] = nextChildren.splice(previousIndex, 1);
    const clampedIndex = Math.max(0, Math.min(currentIndex, nextChildren.length));
    nextChildren.splice(clampedIndex, 0, removed);

    const updatedLayout: ServerChannelLayout = {
      ...layout,
      categoryChannels: {
        ...layout.categoryChannels,
        [categoryId]: nextChildren,
      },
    };

    this.serverChannelLayouts.update((current) => ({
      ...current,
      [serverId]: updatedLayout,
    }));
    this.persistChannelLayoutsToStorage();
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
  }

  private persistCategoriesToStorage(): void {
    // Category là cấu trúc chung của server, không được ghi theo từng user.
  }

  private hydrateChannelLayoutsFromStorage(userId: string | null): void {
    if (!userId || typeof window === 'undefined' || !window.localStorage) {
      this.serverChannelLayouts.set({});
      return;
    }

    const storageKey = `${CHANNEL_LAYOUT_PREFIX}${userId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        this.serverChannelLayouts.set({});
        return;
      }

      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        this.serverChannelLayouts.set({});
        return;
      }

      const layouts: Record<string, ServerChannelLayout> = {};
      for (const [serverId, layoutData] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof layoutData !== 'object' || layoutData === null) {
          continue;
        }

        const data = layoutData as Partial<ServerChannelLayout>;
        if (data.version !== 1) {
          continue;
        }

        if (
          !Array.isArray(data.rootItems) ||
          typeof data.categoryChannels !== 'object' ||
          data.categoryChannels === null
        ) {
          continue;
        }

        // Validate rootItems: đúng union type ServerRootItem và loại ID trùng lặp
        const validRootItems: ServerRootItem[] = [];
        const seenRootIds = new Set<string>();
        for (const item of data.rootItems) {
          if (
            typeof item === 'object' &&
            item !== null &&
            (item.kind === 'category' || item.kind === 'channel') &&
            typeof item.id === 'string' &&
            item.id.trim().length > 0 &&
            !seenRootIds.has(item.id)
          ) {
            seenRootIds.add(item.id);
            validRootItems.push({ kind: item.kind, id: item.id });
          }
        }

        // Validate categoryChannels: mỗi entry là categoryId: string -> string[] (channelIds hợp lệ và không trùng lặp)
        const validCategoryChannels: Record<string, string[]> = {};
        const seenChannelIds = new Set<string>();
        for (const [catId, chList] of Object.entries(data.categoryChannels)) {
          if (typeof catId === 'string' && Array.isArray(chList)) {
            const validChIds: string[] = [];
            for (const chId of chList) {
              if (
                typeof chId === 'string' &&
                chId.trim().length > 0 &&
                !seenChannelIds.has(chId) &&
                !seenRootIds.has(chId)
              ) {
                seenChannelIds.add(chId);
                validChIds.push(chId);
              }
            }
            validCategoryChannels[catId] = validChIds;
          }
        }

        layouts[serverId] = {
          version: 1,
          rootItems: validRootItems,
          categoryChannels: validCategoryChannels,
        };
      }

      this.serverChannelLayouts.set(layouts);
    } catch {
      this.serverChannelLayouts.set({});
    }
  }

  private persistChannelLayoutsToStorage(): void {
    // Layout là cấu trúc chung của server, không được ghi theo từng user.
  }

  private removeLegacyPerUserChannelStructure(userId: string | null): void {
    if (!userId || typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.removeItem(`${CATEGORIES_STORAGE_PREFIX}${userId}`);
      localStorage.removeItem(`${CHANNEL_LAYOUT_PREFIX}${userId}`);
    } catch {
      // Storage unavailable
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
    this.serverChannelLayouts.set({});
    this.activeServerId.set(null);
    this.activeChannelId.set(null);
    this.activeUserId.set(null);
    this.isLoading.set(false);
    this.isHydrated.set(false);
    this.hydrationPromise = null;
    this.generation.update((g) => g + 1);
  }
}
