import { Injectable, computed, signal } from '@angular/core';
import type { ChannelType, PresenceStatus } from '../../../shared/dto/common';

/**
 * NGUỒN DỮ LIỆU SHELL P1 + CHẾ ĐỘ DEMO.
 *
 * Nguồn live khởi tạo rỗng để phản ánh đúng tài khoản vừa đăng ký. Bộ `DEMO_*`
 * chỉ được chọn khi người dùng chủ động bật nút demo trong runtime; reload app
 * luôn trở về live rỗng. Các interface bám sát dữ liệu thật để P2 chỉ việc nạp
 * signal live từ HTTP mà không phải sửa template hoặc xóa dữ liệu trình diễn.
 *
 * P2 sẽ thay: `GET /api/servers`, `GET /api/servers/:id/channels`.
 */

export interface ServerSummary {
  id: string;
  name: string;
  /** Chưa có ảnh thì hiện chữ cái đầu — tránh phụ thuộc file ảnh ở phase này. */
  iconUrl: string | null;
  unread: boolean;
  mentionCount: number;
}

/** Folder chỉ mô tả cách sắp server trên rail; backend có thể trả contract này sau. */
export interface ServerGroupSummary {
  id: string;
  name: string;
  serverIds: string[];
}

type ServerRailRef = { kind: 'server'; id: string } | { kind: 'folder'; id: string };

export interface ChannelSummary {
  id: string;
  name: string;
  type: ChannelType;
  topic: string | null;
  unread: boolean;
  mentionCount: number;
}

export interface ConversationSummary {
  id: string;
  /** Tên hiển thị của người bên kia (DM 1-1). */
  name: string;
  statusMessage: string | null;
  presence: PresenceStatus;
  unread: boolean;
}

const DEMO_SERVERS: ServerSummary[] = [
  { id: 'lofi', name: 'Lofi Study', iconUrl: null, unread: false, mentionCount: 0 },
  { id: 'xp', name: 'Xp Community', iconUrl: null, unread: true, mentionCount: 0 },
  { id: 'itss', name: 'ITSS Lab', iconUrl: null, unread: true, mentionCount: 3 },
  { id: 'peak', name: 'Peak Design', iconUrl: null, unread: false, mentionCount: 0 },
];

const DEMO_SERVER_GROUPS: ServerGroupSummary[] = [
  { id: 'study', name: 'Học tập', serverIds: ['lofi', 'itss'] },
];

const DEMO_CHANNELS_BY_SERVER: Record<string, ChannelSummary[]> = {
  lofi: [
    {
      id: 'chung',
      name: 'chung',
      type: 'text',
      topic: 'Kênh chung của server',
      unread: false,
      mentionCount: 0,
    },
    { id: 'nhac', name: 'nhạc', type: 'text', topic: null, unread: true, mentionCount: 0 },
    {
      id: 'phong-hop',
      name: 'Phòng họp',
      type: 'voice',
      topic: null,
      unread: false,
      mentionCount: 0,
    },
  ],
  xp: [
    {
      id: 'thong-bao',
      name: 'thông-báo',
      type: 'text',
      topic: 'Chỉ admin đăng bài',
      unread: false,
      mentionCount: 0,
    },
    { id: 'tan-gau', name: 'tán-gẫu', type: 'text', topic: null, unread: true, mentionCount: 0 },
  ],
  itss: [
    {
      id: 'do-an',
      name: 'đồ-án',
      type: 'text',
      topic: 'Nexus — tiến độ tuần',
      unread: true,
      mentionCount: 3,
    },
    {
      id: 'tai-lieu',
      name: 'tài-liệu',
      type: 'text',
      topic: null,
      unread: false,
      mentionCount: 0,
    },
    {
      id: 'standup',
      name: 'Standup',
      type: 'voice',
      topic: null,
      unread: false,
      mentionCount: 0,
    },
  ],
  peak: [
    { id: 'design', name: 'design', type: 'text', topic: null, unread: false, mentionCount: 0 },
  ],
};

const DEMO_CONVERSATIONS: ConversationSummary[] = [
  {
    id: 'mon',
    name: 'Phan Thế Mon',
    statusMessage: null,
    presence: 'online',
    unread: false,
  },
  {
    id: 'ho-be',
    name: 'ho_be',
    statusMessage: 'shut the fckup',
    presence: 'dnd',
    unread: true,
  },
  {
    id: 'minh-tai',
    name: 'NguyenMinhTai',
    statusMessage: null,
    presence: 'online',
    unread: false,
  },
  { id: 'binh', name: "bình'", statusMessage: null, presence: 'idle', unread: false },
  { id: 'cyrus', name: 'Cyrus', statusMessage: null, presence: 'offline', unread: false },
  {
    id: 'lofi-bot',
    name: 'Lofi',
    statusMessage: 'Đang phát nhạc',
    presence: 'online',
    unread: false,
  },
];

@Injectable({ providedIn: 'root' })
export class ShellData {
  private readonly demoMode = signal(false);
  private readonly serverList = signal<ServerSummary[]>([]);
  private readonly serverOrderList = signal<string[]>([]);
  private readonly demoServerOrderList = signal<string[]>(DEMO_SERVERS.map((server) => server.id));
  private readonly serverGroupList = signal<ServerGroupSummary[]>([]);
  private readonly demoServerGroupList = signal<ServerGroupSummary[]>(
    DEMO_SERVER_GROUPS.map((group) => ({ ...group, serverIds: [...group.serverIds] })),
  );
  private readonly channelsByServer = signal<Record<string, ChannelSummary[]>>({});
  private readonly conversationList = signal<ConversationSummary[]>([]);

  readonly demoEnabled = this.demoMode.asReadonly();
  readonly servers = computed(() => {
    const source = this.demoMode() ? DEMO_SERVERS : this.serverList();
    const order = this.demoMode() ? this.demoServerOrderList() : this.serverOrderList();
    const byId = new Map(source.map((server) => [server.id, server]));
    const ordered = order.flatMap((id) => {
      const server = byId.get(id);
      return server ? [server] : [];
    });
    const known = new Set(ordered.map((server) => server.id));

    return [...ordered, ...source.filter((server) => !known.has(server.id))];
  });
  readonly serverGroups = computed(() =>
    this.demoMode() ? this.demoServerGroupList() : this.serverGroupList(),
  );
  readonly conversations = computed(() =>
    this.demoMode() ? DEMO_CONVERSATIONS : this.conversationList(),
  );

  /** Tổng số lượt nhắc tên chưa đọc — badge trên mục "Tin nhắn trực tiếp". */
  readonly totalMentions = computed(() =>
    this.conversations().reduce((total, c) => total + (c.unread ? 1 : 0), 0),
  );

  setDemoEnabled(enabled: boolean): void {
    this.demoMode.set(enabled);
  }

  toggleDemoData(): void {
    this.demoMode.update((enabled) => !enabled);
  }

  /**
   * Nạp danh sách server và channels thực tế từ backend (sau khi đăng nhập hoặc refresh).
   */
  hydrateServers(serversWithChannels: Array<ServerSummary & { channels: ChannelSummary[] }>): void {
    const servers: ServerSummary[] = serversWithChannels.map((s) => ({
      id: s.id,
      name: s.name,
      iconUrl: s.iconUrl,
      unread: s.unread ?? false,
      mentionCount: s.mentionCount ?? 0,
    }));

    const channelMap: Record<string, ChannelSummary[]> = {};
    for (const s of serversWithChannels) {
      channelMap[s.id] = s.channels ?? [];
    }

    this.serverList.set(servers);
    this.channelsByServer.set(channelMap);
    this.serverOrderList.set(servers.map((s) => s.id));
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

    this.serverOrderList.update((order) => {
      if (order.includes(server.id)) {
        return order;
      }
      return [...order, server.id];
    });
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

    let nextIndex = Math.max(0, Math.min(insertionIndex, refsBefore.length));
    if (sourceTopIndex >= 0 && sourceTopIndex < nextIndex) {
      nextIndex -= 1;
    }
    nextIndex = Math.min(nextIndex, refsAfter.length);
    refsAfter.splice(nextIndex, 0, { kind: 'server', id: serverId });

    const nextOrder = refsAfter.flatMap((ref) => {
      if (ref.kind === 'server') {
        return [ref.id];
      }
      return groupsAfter.find((group) => group.id === ref.id)?.serverIds ?? [];
    });
    this.updateServerOrder(() => this.normalizeServerOrder(nextOrder, groupsAfter));
  }

  channelsOf(serverId: string): ChannelSummary[] {
    const channels = this.demoMode() ? DEMO_CHANNELS_BY_SERVER : this.channelsByServer();
    return channels[serverId] ?? [];
  }

  serverOf(serverId: string): ServerSummary | undefined {
    return this.servers().find((server) => server.id === serverId);
  }

  channelOf(serverId: string, channelId: string): ChannelSummary | undefined {
    return this.channelsOf(serverId).find((c) => c.id === channelId);
  }

  conversationOf(conversationId: string): ConversationSummary | undefined {
    return this.conversations().find((conversation) => conversation.id === conversationId);
  }

  private hasServer(serverId: string): boolean {
    return this.servers().some((server) => server.id === serverId);
  }

  private updateServerGroups(update: (groups: ServerGroupSummary[]) => ServerGroupSummary[]): void {
    if (this.demoMode()) {
      this.demoServerGroupList.update(update);
      return;
    }

    this.serverGroupList.update(update);
  }

  private updateServerOrder(update: (order: string[]) => string[]): void {
    if (this.demoMode()) {
      this.demoServerOrderList.update(update);
      return;
    }

    this.serverOrderList.update(update);
  }

  private currentServerOrder(): string[] {
    return this.demoMode() ? this.demoServerOrderList() : this.serverOrderList();
  }

  private buildServerRailRefs(order: string[], groups: ServerGroupSummary[]): ServerRailRef[] {
    const groupByServer = new Map<string, ServerGroupSummary>();
    for (const group of groups) {
      for (const serverId of group.serverIds) {
        groupByServer.set(serverId, group);
      }
    }

    const refs: ServerRailRef[] = [];
    const emittedGroups = new Set<string>();
    const emittedServers = new Set<string>();
    const visit = (serverId: string): void => {
      if (!this.hasServer(serverId)) {
        return;
      }

      const group = groupByServer.get(serverId);
      if (group) {
        if (!emittedGroups.has(group.id)) {
          emittedGroups.add(group.id);
          refs.push({ kind: 'folder', id: group.id });
        }
        return;
      }

      if (!emittedServers.has(serverId)) {
        emittedServers.add(serverId);
        refs.push({ kind: 'server', id: serverId });
      }
    };

    order.forEach(visit);
    this.servers().forEach((server) => visit(server.id));
    return refs;
  }

  private normalizeServerOrder(order: string[], groups: ServerGroupSummary[]): string[] {
    const validServerIds = new Set(this.servers().map((server) => server.id));
    const groupByServer = new Map<string, ServerGroupSummary>();
    for (const group of groups) {
      for (const serverId of group.serverIds) {
        if (validServerIds.has(serverId)) {
          groupByServer.set(serverId, group);
        }
      }
    }

    const result: string[] = [];
    const emittedServers = new Set<string>();
    const emittedGroups = new Set<string>();
    const visit = (serverId: string): void => {
      if (!validServerIds.has(serverId)) {
        return;
      }

      const group = groupByServer.get(serverId);
      if (group) {
        if (emittedGroups.has(group.id)) {
          return;
        }
        emittedGroups.add(group.id);
        for (const memberId of group.serverIds) {
          if (validServerIds.has(memberId) && !emittedServers.has(memberId)) {
            emittedServers.add(memberId);
            result.push(memberId);
          }
        }
        return;
      }

      if (!emittedServers.has(serverId)) {
        emittedServers.add(serverId);
        result.push(serverId);
      }
    };

    order.forEach(visit);
    this.servers().forEach((server) => visit(server.id));
    return result;
  }

  private removeServersFromGroups(
    groups: ServerGroupSummary[],
    serverIds: string[],
  ): ServerGroupSummary[] {
    const removed = new Set(serverIds);
    return groups
      .map((group) => ({
        ...group,
        serverIds: group.serverIds.filter((id) => !removed.has(id)),
      }))
      .filter((group) => group.serverIds.length >= 2);
  }
}
