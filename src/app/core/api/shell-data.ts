import { Injectable, computed, signal } from '@angular/core';
import type { ChannelType, PresenceStatus } from '../../../shared/dto/common';

/**
 * DỮ LIỆU GIẢ CHO P1 — sẽ bị thay ở P2.
 *
 * Shell phải dựng được và xem được trước khi có API, nên phase này nhồi sẵn vài
 * server / kênh / hộp thoại. Hình dạng các interface dưới đây cố ý bám sát bảng
 * thật trong `nexus_schema.sql`, để P2 chỉ việc đổi ruột service sang HTTP mà
 * không phải sửa template.
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

@Injectable({ providedIn: 'root' })
export class ShellData {
  private readonly serverList = signal<ServerSummary[]>([
    { id: 'lofi', name: 'Lofi Study', iconUrl: null, unread: false, mentionCount: 0 },
    { id: 'xp', name: 'Xp Community', iconUrl: null, unread: true, mentionCount: 0 },
    { id: 'itss', name: 'ITSS Lab', iconUrl: null, unread: true, mentionCount: 3 },
    { id: 'peak', name: 'Peak Design', iconUrl: null, unread: false, mentionCount: 0 },
  ]);

  private readonly channelsByServer: Record<string, ChannelSummary[]> = {
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

  private readonly conversationList = signal<ConversationSummary[]>([
    { id: 'mon', name: 'Phan Thế Mon', statusMessage: null, presence: 'online', unread: false },
    { id: 'ho-be', name: 'ho_be', statusMessage: 'shut the fckup', presence: 'dnd', unread: true },
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
  ]);

  readonly servers = this.serverList.asReadonly();
  readonly conversations = this.conversationList.asReadonly();

  /** Tổng số lượt nhắc tên chưa đọc — badge trên mục "Tin nhắn trực tiếp". */
  readonly totalMentions = computed(() =>
    this.conversationList().reduce((total, c) => total + (c.unread ? 1 : 0), 0),
  );

  channelsOf(serverId: string): ChannelSummary[] {
    return this.channelsByServer[serverId] ?? [];
  }

  serverOf(serverId: string): ServerSummary | undefined {
    return this.serverList().find((s) => s.id === serverId);
  }

  channelOf(serverId: string, channelId: string): ChannelSummary | undefined {
    return this.channelsOf(serverId).find((c) => c.id === channelId);
  }

  conversationOf(conversationId: string): ConversationSummary | undefined {
    return this.conversationList().find((c) => c.id === conversationId);
  }
}
