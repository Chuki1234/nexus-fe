import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ChatSocketService } from '../realtime/chat-socket.service';
import { ServersStore } from '../servers/servers.store';
import { ActiveChatStore } from '../../features/dashboard/services/active-chat.store';

interface ChannelCounts {
  unread: number;
  mention: number;
  serverId: string | null;
}

/**
 * Nguồn sự thật TOÀN CỤC (root) cho mọi badge chưa đọc / nhắc tên.
 *
 * Vì store nằm ở root và tự lắng nghe socket một lần, số badge KHÔNG bị mất khi
 * người dùng chuyển server hoặc đổi route (trước đây state nằm cục bộ trong
 * `ConversationList`/`ServerRail` nên bị reset mỗi lần component huỷ). Mỗi tab có
 * socket riêng và đều nhận event từ user-room/server-room nên đồng bộ độc lập.
 *
 * - DM: nhận `conversation:updated` (đã có sẵn từ backend) → map theo conversationId.
 * - Kênh server: nhận `unread:update` (delta) do gateway phát tới server-room/user-room.
 * - Reset: `message:read` (đọc), mở kênh/hội thoại đang active, hoặc conversation bị xoá.
 */
@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private readonly chatSocket = inject(ChatSocketService);
  private readonly auth = inject(AuthService);
  private readonly serversStore = inject(ServersStore);
  private readonly activeChatStore = inject(ActiveChatStore);

  /** Số tin chưa đọc theo DM conversationId. */
  private readonly dmCounts = signal<Record<string, number>>({});
  /** Số chưa đọc + nhắc tên theo channelId (kèm serverId để gộp lên cấp server). */
  private readonly channelCounts = signal<Record<string, ChannelCounts>>({});

  private readonly subs = new Subscription();

  constructor() {
    // Guard từng observable (test cấp mock từng phần — theo pattern sẵn có).
    if (this.chatSocket.conversationUpdated$) {
      this.subs.add(
        this.chatSocket.conversationUpdated$.subscribe(({ conversationId, senderId }) => {
          if (senderId && senderId === this.myId()) return;
          if (this.activeChatStore.conversationId() === conversationId) return;
          this.bumpDm(conversationId, 1);
        }),
      );
    }

    if (this.chatSocket.unreadUpdate$) {
      this.subs.add(
        this.chatSocket.unreadUpdate$.subscribe((p) => {
          if (p.authorId && p.authorId === this.myId()) return;

          if (p.conversationId) {
            if (this.activeChatStore.conversationId() === p.conversationId) return;
            if (p.unreadCount) this.bumpDm(p.conversationId, p.unreadCount);
            return;
          }

          if (p.channelId) {
            // Đang mở đúng kênh này ⇒ coi như đã đọc, không tăng badge.
            if (this.serversStore.activeChannelId() === p.channelId) return;
            // Bỏ qua kênh user KHÔNG nhìn thấy (kênh riêng tư) — broadcast phát cho
            // cả server room, nhưng REST chỉ trả kênh có VIEW_CHANNEL. Nếu server
            // đã nạp kênh mà kênh này không có trong đó ⇒ không được xem ⇒ bỏ qua.
            if (p.serverId && !this.isChannelVisible(p.serverId, p.channelId)) return;
            this.bumpChannel(p.channelId, p.serverId, p.unreadCount, p.mentionCount);
          }
        }),
      );
    }

    if (this.chatSocket.messageRead$) {
      this.subs.add(
        this.chatSocket.messageRead$.subscribe(({ conversationId, channelId }) => {
          if (conversationId) this.markConversationRead(conversationId);
          if (channelId) this.markChannelRead(channelId);
        }),
      );
    }

    if (this.chatSocket.conversationDeleted$) {
      this.subs.add(
        this.chatSocket.conversationDeleted$.subscribe(({ conversationId }) => {
          this.markConversationRead(conversationId);
        }),
      );
    }

    // Mở kênh/hội thoại nào thì xoá badge của mục đó ngay (reset-on-open tập
    // trung, không cần các component chat tự gọi).
    effect(() => {
      const channelId = this.serversStore.activeChannelId();
      if (channelId) this.markChannelRead(channelId);
    });
    effect(() => {
      const conversationId = this.activeChatStore.conversationId();
      if (conversationId) this.markConversationRead(conversationId);
    });

    // Seed badge kênh từ REST (ChannelSummary.unread/mentionCount do backend tính
    // từ read_states) để số chưa đọc/nhắc tên GIỮ NGUYÊN sau khi F5. Chỉ seed khi
    // kênh chưa có trong map để không nuốt delta realtime đang tích luỹ.
    effect(() => {
      const byServer = this.serversStore.channelsByServer();
      this.channelCounts.update((current) => {
        let changed = false;
        const next = { ...current };
        for (const [serverId, channels] of Object.entries(byServer)) {
          for (const ch of channels) {
            if (next[ch.id] !== undefined) continue;
            const unread = ch.unread ? 1 : 0;
            const mention = ch.mentionCount ?? 0;
            if (unread === 0 && mention === 0) continue;
            next[ch.id] = { unread, mention, serverId };
            changed = true;
          }
        }
        return changed ? next : current;
      });
    });
  }

  private myId(): string | null {
    return this.auth.user()?.id ?? null;
  }

  // ── DM ────────────────────────────────────────────────────────────────────

  /** Seed từ REST (listConversations) — không ghi đè số realtime lớn hơn đã tích luỹ. */
  seedDmUnread(list: Array<{ id: string; unreadCount: number }>): void {
    this.dmCounts.update((current) => {
      const next = { ...current };
      for (const c of list) {
        // Chỉ seed khi chưa có (giữ số realtime đang có để không nuốt thông báo).
        if (next[c.id] === undefined) next[c.id] = c.unreadCount ?? 0;
      }
      return next;
    });
  }

  dmUnread(conversationId: string): number {
    return this.dmCounts()[conversationId] ?? 0;
  }

  readonly totalDmUnread = computed(() =>
    Object.values(this.dmCounts()).reduce((acc, n) => acc + (n || 0), 0),
  );

  markConversationRead(conversationId: string): void {
    this.dmCounts.update((current) => {
      if (!current[conversationId]) return current;
      const next = { ...current };
      next[conversationId] = 0;
      return next;
    });
  }

  private bumpDm(conversationId: string, delta: number): void {
    this.dmCounts.update((current) => ({
      ...current,
      [conversationId]: Math.max(0, (current[conversationId] ?? 0) + delta),
    }));
  }

  // ── Kênh server ────────────────────────────────────────────────────────────

  channelUnread(channelId: string): number {
    return this.channelCounts()[channelId]?.unread ?? 0;
  }

  channelMention(channelId: string): number {
    return this.channelCounts()[channelId]?.mention ?? 0;
  }

  channelHasUnread(channelId: string): boolean {
    const c = this.channelCounts()[channelId];
    return !!c && (c.unread > 0 || c.mention > 0);
  }

  /** Kênh có nằm trong danh sách kênh user nhìn thấy của server không. */
  private isChannelVisible(serverId: string, channelId: string): boolean {
    const channels = this.serversStore.channelsByServer()[serverId];
    // Chưa nạp kênh của server này ⇒ chưa biết, tạm cho qua (sẽ được lọc lại ở
    // aggregate khi danh sách kênh đã nạp).
    if (!channels || channels.length === 0) return true;
    return channels.some((c) => c.id === channelId);
  }

  /** Tổng lượt nhắc tên của mọi kênh thuộc server — dùng cho badge số trên server tile. */
  serverMention(serverId: string): number {
    const entries = this.channelCounts();
    let total = 0;
    for (const [channelId, c] of Object.entries(entries)) {
      if (c.serverId === serverId && this.isChannelVisible(serverId, channelId)) {
        total += c.mention;
      }
    }
    return total;
  }

  /** Server có bất kỳ kênh nào chưa đọc (để hiện chấm) — không phụ thuộc nhắc tên. */
  serverHasUnread(serverId: string): boolean {
    const entries = this.channelCounts();
    for (const [channelId, c] of Object.entries(entries)) {
      if (
        c.serverId === serverId &&
        (c.unread > 0 || c.mention > 0) &&
        this.isChannelVisible(serverId, channelId)
      ) {
        return true;
      }
    }
    return false;
  }

  markChannelRead(channelId: string): void {
    this.channelCounts.update((current) => {
      const existing = current[channelId];
      if (!existing || (existing.unread === 0 && existing.mention === 0)) return current;
      return { ...current, [channelId]: { ...existing, unread: 0, mention: 0 } };
    });
  }

  private bumpChannel(
    channelId: string,
    serverId: string | null,
    unreadDelta: number,
    mentionDelta: number,
  ): void {
    if (!unreadDelta && !mentionDelta) return;
    this.channelCounts.update((current) => {
      const prev = current[channelId] ?? { unread: 0, mention: 0, serverId };
      return {
        ...current,
        [channelId]: {
          serverId: serverId ?? prev.serverId,
          unread: Math.max(0, prev.unread + (unreadDelta || 0)),
          mention: Math.max(0, prev.mention + (mentionDelta || 0)),
        },
      };
    });
  }
}
