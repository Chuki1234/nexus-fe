import type { ChannelType } from '../../../shared/dto/common';

export interface ServerSummary {
  id: string;
  name: string;
  iconUrl: string | null;
  unread: boolean;
  mentionCount: number;
}

export interface ServerGroupSummary {
  id: string;
  name: string;
  serverIds: string[];
}

export interface ServerCategorySummary {
  id: string;
  name: string;
  isPrivate?: boolean;
}

export interface ChannelSummary {
  id: string;
  name: string;
  type: ChannelType;
  topic: string | null;
  unread: boolean;
  mentionCount: number;
  categoryId?: string | null;
  slowmode?: number;
  isAgeRestricted?: boolean;
  contentVisibility?: 'default' | 'age_restricted';
}

export interface ServerRailRef {
  kind: 'server' | 'folder';
  id: string;
}

export interface ServerInviteCardData {
  serverId: string;
  serverName: string;
  serverIconUrl: string | null;
  serverBannerColor: string;
  onlineCount: number;
  membersCount: number;
  createdDate: string;
  inviteCode: string;
  targetChannelId: string;
}

export type ServerRootItem = { kind: 'category'; id: string } | { kind: 'channel'; id: string };

export interface ServerChannelLayout {
  version: 1;
  rootItems: ServerRootItem[];
  categoryChannels: Record<string, string[]>;
}

/** Cấu trúc category/channel dùng chung cho mọi thành viên của một server. */
export interface ServerChannelStructure extends ServerChannelLayout {
  categories: ServerCategorySummary[];
  revision?: number;
  updatedAt?: string | null;
}
