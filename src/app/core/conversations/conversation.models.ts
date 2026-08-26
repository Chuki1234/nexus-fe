import type { PresenceStatus } from '../../../shared/dto/common';

export interface ConversationSummary {
  id: string;
  name: string;
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
