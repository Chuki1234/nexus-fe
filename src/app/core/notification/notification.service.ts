import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ChatSocketService } from '../realtime/chat-socket.service';
import { ServersStore } from '../servers/servers.store';
import { ActiveChatStore } from '../../features/dashboard/services/active-chat.store';
import { UserSettingsService } from '../../features/settings/services/user-settings.service';

export interface InAppNotification {
  id: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  contextTag: string; // e.g. "ITSS Lab # đồ-án" or "Tin nhắn riêng"
  content: string;
  timestamp: string;
  routeUrl?: string[];
  type?: 'message' | 'mention' | 'call' | 'system';
  serverId?: string;
  channelId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly serversStore = inject(ServersStore);
  private readonly activeChatStore = inject(ActiveChatStore);
  private readonly settings = inject(UserSettingsService);

  readonly notifications = signal<InAppNotification[]>([]);

  private audioCtx: AudioContext | null = null;

  constructor() {
    // Popup cho tin nhắn nhận realtime trong room đang mở. Nhắc tên trong KÊNH
    // được xử lý riêng qua `notification:new` (bao phủ cả kênh không mở) nên ở
    // đây không tự suy luận mention cho tin nhắn kênh để tránh popup trùng.
    this.chatSocket.messageCreated$.subscribe(({ message }) => {
      if (!message) return;
      const currentUserId = this.auth.user()?.id;
      const authorId = message.author?.id || (message as { senderId?: string }).senderId;
      if (currentUserId && authorId === currentUserId) {
        return; // Không tự thông báo tin nhắn của chính mình
      }

      const senderName = message.author?.displayName || message.author?.username || 'Thành viên';
      const senderAvatarUrl = message.author?.avatarUrl || null;
      const content = message.content || (message.attachments?.length ? '[Đính kèm tệp]' : 'Tin nhắn mới');

      if (message.channelId) {
        // Đang xem đúng kênh này thì không toast tin thường (tránh spam).
        if (this.serversStore.activeChannelId() === message.channelId) return;
        const serverId = this.serversStore.activeServerId() ?? undefined;

        // Nếu kênh hoặc server bị tắt âm / chặn thông báo thì bỏ qua hoàn toàn
        const myUsername = this.auth.user()?.user_metadata?.['username'] || '';
        const isMention = !!myUsername && content.includes(`@${myUsername}`);
        if (!this.settings.isChannelNotificationAllowed(message.channelId, serverId, isMention)) {
          return;
        }

        const channel = serverId
          ? this.serversStore.channelsOf(serverId).find((c) => c.id === message.channelId)
          : undefined;
        const serverName = serverId ? this.serversStore.serverOf(serverId)?.name : undefined;
        const contextTag = channel
          ? `${serverName ?? 'Máy chủ'} # ${channel.name}`
          : '# kênh chat';
        this.show({
          senderName,
          senderAvatarUrl,
          contextTag,
          content,
          routeUrl: ['/channels', serverId ?? '@me', message.channelId],
          type: 'message',
          serverId,
          channelId: message.channelId,
        });
        return;
      }

      if (message.conversationId) {
        // Đang mở đúng hội thoại này thì không toast (đang đọc).
        if (this.activeChatStore.conversationId() === message.conversationId) return;
        // DM 1-1: authorId là người bạn. Đã tắt thông báo ⇒ không popup, kể cả @mention.
        if (authorId && this.settings.isFriendMuted(authorId)) return;
        const myUsername = this.auth.user()?.user_metadata?.['username'] || '';
        const isMention = !!myUsername && content.includes(`@${myUsername}`);
        this.show({
          senderName,
          senderAvatarUrl,
          contextTag: 'Tin nhắn trực tiếp',
          content,
          routeUrl: ['/channels/@me', message.conversationId],
          type: isMention ? 'mention' : 'message',
        });
      }
    });

    // Lời mời kết bạn mới → popup (đường tới trang "chờ duyệt"). Tôn trọng
    // setting: chỉ hiện khi người dùng bật thông báo desktop.
    this.chatSocket.notificationNew$?.subscribe((notification) => {
      if (notification.type !== 'friend_request') return;
      if (!this.settings.preferences().desktopNotifications) return;
      const p = notification.payload as {
        requesterName?: string | null;
        requesterAvatarUrl?: string | null;
      };
      this.show({
        senderName: p.requesterName ?? 'Ai đó',
        senderAvatarUrl: p.requesterAvatarUrl ?? null,
        contextTag: 'Lời mời kết bạn',
        content: 'đã gửi cho bạn một lời mời kết bạn',
        routeUrl: ['/channels/@me'],
        type: 'system',
      });
    });

    // Nhắc tên @username / @everyone trong kênh server (kể cả kênh không mở).
    this.chatSocket.notificationNew$?.subscribe((notification) => {
      if (notification.type !== 'mention') return;
      const p = notification.payload as {
        serverId?: string;
        channelId?: string;
        channelName?: string | null;
        serverName?: string | null;
        authorId?: string | null;
        authorName?: string | null;
        authorAvatarUrl?: string | null;
        preview?: string | null;
        mentionType?: 'direct' | 'everyone';
      };

      const currentUserId = this.auth.user()?.id;
      if (currentUserId && p.authorId && p.authorId === currentUserId) return;

      // Kiểm tra xem kênh có cấm thông báo hoàn toàn không
      if (p.channelId && !this.settings.isChannelNotificationAllowed(p.channelId, p.serverId, true)) {
        return;
      }

      const everyone = p.mentionType === 'everyone';
      const contextTag = `${p.serverName ?? 'Máy chủ'} # ${p.channelName ?? 'kênh'}`;
      const prefix = everyone ? '@everyone · ' : '';

      this.show({
        senderName: p.authorName ?? 'Thành viên',
        senderAvatarUrl: p.authorAvatarUrl ?? null,
        contextTag,
        content: `${prefix}${p.preview ?? 'Đã nhắc tên bạn'}`,
        routeUrl: p.channelId
          ? ['/channels', p.serverId ?? '@me', p.channelId]
          : ['/channels/@me'],
        type: 'mention',
        serverId: p.serverId,
        channelId: p.channelId,
      });
    });
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /** Gửi thông báo popup nổi ở góc màn hình */
  show(notification: Omit<InAppNotification, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): void {
    const prefs = this.settings.preferences();

    // Nếu người dùng tắt thông báo desktop thì không hiện popup nổi và không gửi push
    if (!prefs.desktopNotifications && notification.type !== 'system') {
      return;
    }

    const id = notification.id ?? `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const timestamp = notification.timestamp ?? 'Vừa xong';
    const item: InAppNotification = { ...notification, id, timestamp };

    // ══ KIỂM TRA THIẾT LẬP TẮT ÂM VÀ THÔNG BÁO CỦA KÊNH & MÁY CHỦ ══
    if (item.channelId) {
      const isMention = item.type === 'mention';
      if (!this.settings.isChannelNotificationAllowed(item.channelId, item.serverId, isMention)) {
        return; // Kênh này bị tắt âm hoặc không nhận thông báo -> bỏ qua hoàn toàn!
      }
    } else if (item.serverId) {
      const serverSettings = this.settings.serverNotificationSettingsMap()[item.serverId];
      if (serverSettings) {
        // Nếu Server bị Tắt âm (isMuted): Không nhận thông báo trừ khi là @mention
        if (serverSettings.isMuted && item.type !== 'mention') {
          return;
        }

        // Mức độ thông báo: Không có (nothing)
        if (serverSettings.notificationLevel === 'nothing' && item.type !== 'system') {
          return;
        }

        // Mức độ thông báo: Chỉ @mentions
        if (serverSettings.notificationLevel === 'mentions' && item.type !== 'mention') {
          return;
        }
      }
    }

    // Thêm vào danh sách thông báo nổi
    this.notifications.update((list) => [item, ...list.slice(0, 4)]);

    // Cập nhật huy hiệu Taskbar / Title nếu được bật
    if (prefs.unreadBadge && typeof document !== 'undefined') {
      document.title = `(${this.notifications().length}) Nexus`;
    }

    // Phát âm thanh phù hợp (chỉ phát khi máy chủ và kênh không bị tắt âm)
    let shouldPlaySound = true;
    if (item.channelId) {
      if (this.settings.isChannelMuted(item.channelId, item.serverId) && item.type !== 'mention') {
        shouldPlaySound = false;
      }
    } else if (item.serverId) {
      const serverSettings = this.settings.serverNotificationSettingsMap()[item.serverId];
      if (serverSettings && serverSettings.isMuted && item.type !== 'mention') {
        shouldPlaySound = false;
      }
    }

    if (shouldPlaySound) {
      if (item.type === 'mention') {
        if (prefs.soundMention) {
          this.playMentionSound();
        }
      } else if (item.type === 'call') {
        if (prefs.soundRing) {
          this.playRingSound();
        }
      } else {
        if (prefs.soundMessage) {
          this.playMessageSound(item.serverId, item.channelId);
        }
      }
    }

    // Gửi thông báo native desktop nếu được cấp quyền
    if (prefs.desktopNotifications) {
      this.sendDesktopNotification(item.senderName, `${item.contextTag}: ${item.content}`);
    }

    // Tự động đóng sau 4 giây
    setTimeout(() => {
      this.dismiss(id);
    }, 4000);
  }

  dismiss(id: string): void {
    this.notifications.update((list) => {
      const remaining = list.filter((n) => n.id !== id);
      if (typeof document !== 'undefined') {
        if (remaining.length > 0 && this.settings.preferences().unreadBadge) {
          document.title = `(${remaining.length}) Nexus`;
        } else {
          document.title = 'Nexus';
        }
      }
      return remaining;
    });
  }

  clearAll(): void {
    this.notifications.set([]);
    if (typeof document !== 'undefined') {
      document.title = 'Nexus';
    }
  }

  navigateTo(notification: InAppNotification): void {
    if (notification.routeUrl && notification.routeUrl.length > 0) {
      this.router.navigate(notification.routeUrl);
    }
    this.dismiss(notification.id);
  }

  // ═══════════════════════════════════════════
  // WEB AUDIO SYNTHESIS - DISCORD ACCURATE SOUNDS
  // ═══════════════════════════════════════════

  /** Âm thanh tin nhắn mới (Discord message ping) */
  playMessageSound(serverId?: string, channelId?: string): void {
    if (channelId) {
      if (this.settings.isChannelMuted(channelId, serverId)) {
        return; // Tắt âm hoàn toàn cho kênh này
      }
    }
    if (serverId) {
      const serverSettings = this.settings.serverNotificationSettingsMap()[serverId];
      if (serverSettings && (serverSettings.isMuted || serverSettings.notificationLevel === 'nothing')) {
        return; // Tắt âm hoàn toàn cho server này
      }
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08); // D6

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // Audio autoplay restrictions fallback
    }
  }

  /** Âm thanh lời nhắc @mention (Discord mention chime) */
  playMentionSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, now + 0.06);
      gain2.gain.setValueAtTime(0.22, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.25);
    } catch {
      // ignore
    }
  }

  /** Âm thanh người dùng vào kênh thoại (User Join) */
  playJoinSound(serverId?: string): void {
    if (serverId) {
      const serverSettings = this.settings.serverNotificationSettingsMap()[serverId];
      if (serverSettings && (serverSettings.isMuted || serverSettings.muteNewEvents)) {
        return;
      }
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.15, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.15);
      });
    } catch {
      // ignore
    }
  }

  /** Âm thanh người dùng rời kênh thoại (User Leave) */
  playLeaveSound(serverId?: string): void {
    if (serverId) {
      const serverSettings = this.settings.serverNotificationSettingsMap()[serverId];
      if (serverSettings && (serverSettings.isMuted || serverSettings.muteNewEvents)) {
        return;
      }
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [659.25, 554.37, 440];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.15, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.15);
      });
    } catch {
      // ignore
    }
  }

  /** Âm thanh bật / tắt mic (Mic Mute / Unmute click) */
  playMuteSound(isMuted = true): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      if (isMuted) {
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);
      } else {
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.08);
      }
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // ignore
    }
  }

  /** Âm thanh điếc tai nghe (Deafen) */
  playDeafenSound(isDeafened = true): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(isDeafened ? 280 : 420, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // ignore
    }
  }

  /** Âm thanh chuông cuộc gọi đến */
  playRingSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const freqs = [853, 960];
      freqs.forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      });
    } catch {
      // ignore
    }
  }

  private sendDesktopNotification(title: string, body: string): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/assets/nexus-mascot.png',
        });
      } catch {
        // ignore
      }
    }
  }
}
