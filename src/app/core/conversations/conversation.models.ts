import type { PresenceStatus } from '../../../shared/dto/common';

export interface ConversationSummary {
  id: string;
  name: string;
  /**
   * Username hồ sơ thật của người bên kia (DM 1-1) — để mở thẻ hồ sơ, tra avatar
   * và chuyển tiếp tin nhắn.
   *
   * Tách riêng khỏi `id` vì hai thứ không trùng nhau: `id` là mã cuộc trò chuyện
   * nằm trên URL, còn đây là danh tính người dùng. `null` với nhân vật dựng sẵn
   * hoặc bot — những người không có hồ sơ để tra.
   */
  username?: string | null;
  statusMessage: string | null;
  presence: PresenceStatus;
  unread: boolean;
  avatarUrl?: string | null;
}

export interface DisplayConversation {
  id: string;
  /** Username của người bên kia (DM 1-1) — để mở thẻ hồ sơ. Null nếu không rõ. */
  username: string | null;
  name: string;
  avatarUrl: string | null;
  presence: PresenceStatus;
  statusMessage: string | null;
  unread: boolean;
  unreadCount: number;
}
