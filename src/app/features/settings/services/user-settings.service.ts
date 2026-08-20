import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { ProfileService } from '../../../core/profile/profile.service';
import { AuthService } from '../../../core/auth/auth.service';

export type SettingsTab =
  | 'account'
  | 'profile'
  | 'privacy'
  | 'messages'
  | 'notifications'
  | 'voice-video'
  | 'appearance'
  | 'accessibility'
  | 'text-images'
  | 'keybinds'
  | 'language'
  | 'games'
  | 'activity'
  | 'connections'
  | 'developer'
  | 'server-overview'
  | 'server-roles'
  | 'server-members'
  | 'server-safety'
  | 'server-audit-log';

export interface ServerRoleItem {
  id: string;
  name: string;
  color: string;
  membersCount: number;
  isDefault?: boolean;
  permissions: {
    administrator: boolean;
    manageServer: boolean;
    manageRoles: boolean;
    kickMembers: boolean;
    banMembers: boolean;
    manageChannels: boolean;
  };
}

export interface ServerMemberItem {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  joinedAt: string;
  isOwner?: boolean;
}

export interface JoinRequestItem {
  id: string;
  username: string;
  displayName: string;
  requestedAt: string;
  answers: string;
}

export interface BannedUserItem {
  id: string;
  username: string;
  displayName: string;
  bannedAt: string;
  reason: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  executor: string;
  target?: string;
  timestamp: string;
  icon: string;
}

export interface ServerSettingsData {
  id: string;
  name: string;
  description: string;
  initials: string;
  systemChannelId: string;
  sendWelcomeMessage: boolean;
  adminUsernames: string[];
  moderatorUsernames: string[];
  roles: ServerRoleItem[];
  members: ServerMemberItem[];
  joinRequests: JoinRequestItem[];
  bannedUsers: BannedUserItem[];
  auditLogs: AuditLogItem[];
}

export interface ConnectedAccount {
  id: string;
  platform: 'steam' | 'github' | 'spotify' | 'youtube' | 'twitch' | 'xbox' | 'playstation' | 'reddit';
  name: string;
  username: string;
  icon: string;
  showOnProfile: boolean;
  color: string;
}

export interface RegisteredGameItem {
  id: string;
  name: string;
  lastPlayed: string;
  overlayEnabled: boolean;
  statusEnabled: boolean;
  icon: string;
}

export interface ActiveSessionItem {
  id: string;
  device: string;
  os: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
  icon: string;
}

export interface AppPreferences {
  // Appearance
  theme: 'nexus-dark' | 'midnight-dark' | 'warm-light';
  themeAccent: string;
  messageDensity: 'cozy' | 'compact';
  fontSize: number;
  messageSpacing: number;
  zoomLevel: number;
  reducedMotion: boolean;
  highContrast: boolean;

  // Voice & Video
  inputVolume: number;
  outputVolume: number;
  inputMode: 'voice-activity' | 'push-to-talk';
  voiceSensitivity: number;
  pushToTalkKey: string;
  pushToTalkDelay: number;
  voiceProcessingMode: 'voice-isolation' | 'studio' | 'custom';
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  attenuationPercent: number;
  attenuateWhileSpeaking: boolean;
  attenuateWhileOthersSpeak: boolean;
  videoCameraId: string;
  videoBackgroundEffect: 'none' | 'blur' | 'cyberpunk' | 'cozy-room' | 'matrix';

  // Notifications
  desktopNotifications: boolean;
  unreadBadge: boolean;
  afkTimeout: number;
  soundMessage: boolean;
  soundMention: boolean;
  soundJoin: boolean;
  soundLeave: boolean;
  soundMute: boolean;
  soundDeafen: boolean;
  soundRing: boolean;
  soundPtt: boolean;
  emailDigest: boolean;
  emailNews: boolean;

  // Privacy & Safety
  safeDirectMessages: 'all' | 'strangers' | 'disabled';
  filterSpamDMs: boolean;
  allowDirectMessagesFromServer: boolean;
  allowFriendRequests: 'everyone' | 'friends-of-friends' | 'server-members';
  dataTelemetry: boolean;
  dataPersonalization: boolean;
  dataImprovement: boolean;
  dataActivitySponsored: boolean;
  dataThirdPartySponsored: boolean;
  voiceClipRecording: boolean;

  // Text & Images
  displayMediaInline: boolean;
  displayLinkPreviews: boolean;
  convertEmoticons: boolean;
  suggestStickers: boolean;
  showSpoilers: 'click' | 'always';
  codeHighlighting: boolean;

  // Accessibility
  playGifsHoverOnly: boolean;
  autoPlayAnimatedEmojis: boolean;
  readingRuler: boolean;
  roleColorPlacement: 'username' | 'dot' | 'background';
  ttsVolume: number;
  ttsSpeed: number;

  // Games & Overlay
  autoDetectGames: boolean;
  gameOverlay: boolean;
  overlayKeybind: string;
  overlayAvatarSize: 'small' | 'large';
  overlayPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showActivityStatus: boolean;
  allowFriendsJoinGame: boolean;

  // System & Developer
  openOnStartup: boolean;
  minimizeToTray: boolean;
  hardwareAcceleration: boolean;
  developerMode: boolean;
  performanceOverlay: boolean;

  // Language & Time
  language: 'vi' | 'en' | 'ja' | 'ko' | 'zh' | 'fr' | 'de' | 'es';
  timeFormat: '24h' | '12h';
  firstDayOfWeek: 'monday' | 'sunday';
}

const DEFAULT_PREFERENCES: AppPreferences = {
  theme: 'nexus-dark',
  themeAccent: '#00ed64',
  messageDensity: 'cozy',
  fontSize: 15,
  messageSpacing: 16,
  zoomLevel: 100,
  reducedMotion: false,
  highContrast: false,

  inputVolume: 80,
  outputVolume: 100,
  inputMode: 'voice-activity',
  voiceSensitivity: 60,
  pushToTalkKey: 'Caps Lock',
  pushToTalkDelay: 20,
  voiceProcessingMode: 'custom',
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  attenuationPercent: 70,
  attenuateWhileSpeaking: true,
  attenuateWhileOthersSpeak: false,
  videoCameraId: 'default',
  videoBackgroundEffect: 'none',

  desktopNotifications: true,
  unreadBadge: true,
  afkTimeout: 10,
  soundMessage: true,
  soundMention: true,
  soundJoin: true,
  soundLeave: true,
  soundMute: true,
  soundDeafen: true,
  soundRing: true,
  soundPtt: false,
  emailDigest: true,
  emailNews: false,

  safeDirectMessages: 'all',
  filterSpamDMs: true,
  allowDirectMessagesFromServer: true,
  allowFriendRequests: 'everyone',
  dataTelemetry: false,
  dataPersonalization: true,
  dataImprovement: true,
  dataActivitySponsored: true,
  dataThirdPartySponsored: true,
  voiceClipRecording: true,

  displayMediaInline: true,
  displayLinkPreviews: true,
  convertEmoticons: true,
  suggestStickers: true,
  showSpoilers: 'click',
  codeHighlighting: true,

  playGifsHoverOnly: false,
  autoPlayAnimatedEmojis: true,
  readingRuler: false,
  roleColorPlacement: 'username',
  ttsVolume: 100,
  ttsSpeed: 100,

  autoDetectGames: true,
  gameOverlay: true,
  overlayKeybind: 'Shift + ~',
  overlayAvatarSize: 'small',
  overlayPosition: 'top-left',
  showActivityStatus: true,
  allowFriendsJoinGame: true,

  openOnStartup: true,
  minimizeToTray: true,
  hardwareAcceleration: true,
  developerMode: true,
  performanceOverlay: false,

  language: 'vi',
  timeFormat: '24h',
  firstDayOfWeek: 'monday',
};

const STORAGE_KEY = 'nexus_user_preferences_v2';

@Injectable({ providedIn: 'root' })
export class UserSettingsService {
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService, { optional: true });

  private getEffectiveUsername(): string {
    const fromProfile = this.profileService.current()?.username;
    if (fromProfile) return fromProfile.toLowerCase();

    const user = typeof this.authService?.user === 'function' ? this.authService.user() : null;
    const fromMetadata = user?.user_metadata?.['username'];
    if (fromMetadata) return String(fromMetadata).toLowerCase();

    const email = user?.email;
    if (email) {
      if (email.startsWith('xp_admin')) return 'xp_admin';
      if (email.startsWith('admin')) return 'admin_nexus';
      if (email.startsWith('member')) return 'member_nexus';
      return email.split('@')[0].toLowerCase();
    }

    return '';
  }

  readonly isOpen = signal<boolean>(false);
  readonly currentTab = signal<SettingsTab>('voice-video');
  readonly searchQuery = signal<string>('');
  readonly preferences = signal<AppPreferences>(this.loadPreferences());

  // Mode switcher: 'user' or 'server'
  readonly settingsMode = signal<'user' | 'server'>('user');
  readonly currentMemberRole = signal<string>('role-everyone');
  readonly currentServerId = signal<string>('itss');

  // Per-server storage map
  readonly serverDataMap = signal<Record<string, ServerSettingsData>>({
    itss: {
      id: 'itss',
      name: 'ITSS Lab',
      description: 'Khoa học Máy tính & Công nghệ Phần mềm — Nghiên cứu và trao đổi đồ án.',
      initials: 'ITSS',
      systemChannelId: 'do-an',
      sendWelcomeMessage: true,
      adminUsernames: ['admin_nexus', 'yangngyn'],
      moderatorUsernames: ['alex_gamer'],
      roles: [
        {
          id: 'role-admin',
          name: 'Quản Trị Viên (Admin)',
          color: '#e91e63',
          membersCount: 2,
          permissions: {
            administrator: true,
            manageServer: true,
            manageRoles: true,
            kickMembers: true,
            banMembers: true,
            manageChannels: true,
          },
        },
        {
          id: 'role-mod',
          name: 'Điều Hành Viên (Moderator)',
          color: '#206694',
          membersCount: 5,
          permissions: {
            administrator: false,
            manageServer: false,
            manageRoles: false,
            kickMembers: true,
            banMembers: true,
            manageChannels: true,
          },
        },
        {
          id: 'role-vip',
          name: 'Thành Viên VIP',
          color: '#f1c40f',
          membersCount: 12,
          permissions: {
            administrator: false,
            manageServer: false,
            manageRoles: false,
            kickMembers: false,
            banMembers: false,
            manageChannels: false,
          },
        },
        {
          id: 'role-everyone',
          name: '@everyone',
          color: '#99aab5',
          membersCount: 128,
          isDefault: true,
          permissions: {
            administrator: false,
            manageServer: false,
            manageRoles: false,
            kickMembers: false,
            banMembers: false,
            manageChannels: false,
          },
        },
      ],
      members: [
        {
          id: 'm1',
          username: 'yangngyn',
          displayName: 'Nghiện Khó Phai',
          roles: ['role-admin'],
          joinedAt: '12/01/2026',
          isOwner: true,
        },
        {
          id: 'm2',
          username: 'alex_gamer',
          displayName: 'Alex Pro Player',
          roles: ['role-mod'],
          joinedAt: '15/01/2026',
        },
        {
          id: 'm3',
          username: 'chill_streamer',
          displayName: 'Streamer Viip',
          roles: ['role-vip'],
          joinedAt: '01/02/2026',
        },
        {
          id: 'm4',
          username: 'newbie_member',
          displayName: 'Thành Viên Mới',
          roles: [],
          joinedAt: 'Hôm nay',
        },
      ],
      joinRequests: [
        {
          id: 'req-1',
          username: 'dragon_slayer99',
          displayName: 'Dragon Slayer',
          requestedAt: '10 phút trước',
          answers: 'Thích chơi Valorant và LoL, muốn tìm bạn voice chung',
        },
        {
          id: 'req-2',
          username: 'cyber_coder',
          displayName: 'Code Dạo',
          requestedAt: '1 giờ trước',
          answers: 'Tham gia từ nhóm lập trình Web',
        },
      ],
      bannedUsers: [
        {
          id: 'b1',
          username: 'spammer_bot99',
          displayName: 'Free Nitro Bot',
          bannedAt: '18/08/2026',
          reason: 'Gửi tin nhắn rác & link lừa đảo Nitro',
        },
        {
          id: 'b2',
          username: 'toxic_player01',
          displayName: 'Toxic User',
          bannedAt: '10/08/2026',
          reason: 'Vi phạm quy tắc ứng xử voice chat',
        },
      ],
      auditLogs: [
        {
          id: 'a1',
          action: 'Cập nhật phân quyền vai trò',
          executor: 'Nghiện Khó Phai',
          target: 'Quản Trị Viên (Admin)',
          timestamp: '5 phút trước',
          icon: 'admin_panel_settings',
        },
        {
          id: 'a2',
          action: 'Phê duyệt thành viên mới',
          executor: 'Alex Pro Player',
          target: 'Code Dạo (@cyber_coder)',
          timestamp: '1 giờ trước',
          icon: 'check_circle',
        },
        {
          id: 'a3',
          action: 'Cấm thành viên khỏi server',
          executor: 'Nghiện Khó Phai',
          target: 'Free Nitro Bot (@spammer_bot99)',
          timestamp: 'Hôm qua',
          icon: 'block',
        },
      ],
    },
    xp: {
      id: 'xp',
      name: 'Xp Community',
      description: 'Cộng đồng Game & Công nghệ XP — Tán gẫu và thông báo giải đấu.',
      initials: 'XC',
      systemChannelId: 'thong-bao',
      sendWelcomeMessage: true,
      adminUsernames: ['xp_admin', 'xp_master'],
      moderatorUsernames: ['xp_mod'],
      roles: [
        {
          id: 'role-xp-admin',
          name: 'XP Chủ Phòng',
          color: '#e74c3c',
          membersCount: 1,
          permissions: {
            administrator: true,
            manageServer: true,
            manageRoles: true,
            kickMembers: true,
            banMembers: true,
            manageChannels: true,
          },
        },
        {
          id: 'role-everyone',
          name: '@everyone',
          color: '#99aab5',
          membersCount: 45,
          isDefault: true,
          permissions: {
            administrator: false,
            manageServer: false,
            manageRoles: false,
            kickMembers: false,
            banMembers: false,
            manageChannels: false,
          },
        },
      ],
      members: [
        {
          id: 'xp-m1',
          username: 'xp_admin',
          displayName: 'Quản Trị Viên XP (XP Admin)',
          roles: ['role-xp-admin'],
          joinedAt: '20/07/2026',
          isOwner: true,
        },
        {
          id: 'xp-m2',
          username: 'xp_master',
          displayName: 'XP Master Lead',
          roles: ['role-xp-admin'],
          joinedAt: '01/01/2026',
        },
        {
          id: 'xp-m3',
          username: 'admin_nexus',
          displayName: 'Admin Nexus',
          roles: ['role-everyone'],
          joinedAt: '19/08/2026',
        },
      ],
      joinRequests: [],
      bannedUsers: [],
      auditLogs: [],
    },
    lofi: {
      id: 'lofi',
      name: 'Lofi Study',
      description: 'Không gian học tập và nghe nhạc Lofi thư giãn cùng bạn bè.',
      initials: 'LS',
      systemChannelId: 'chung',
      sendWelcomeMessage: true,
      adminUsernames: ['lofi_host'],
      moderatorUsernames: [],
      roles: [
        {
          id: 'role-lofi-admin',
          name: 'DJ Lofi',
          color: '#9b59b6',
          membersCount: 1,
          permissions: {
            administrator: true,
            manageServer: true,
            manageRoles: true,
            kickMembers: true,
            banMembers: true,
            manageChannels: true,
          },
        },
        {
          id: 'role-everyone',
          name: '@everyone',
          color: '#99aab5',
          membersCount: 88,
          isDefault: true,
          permissions: {
            administrator: false,
            manageServer: false,
            manageRoles: false,
            kickMembers: false,
            banMembers: false,
            manageChannels: false,
          },
        },
      ],
      members: [
        {
          id: 'lf-m1',
          username: 'lofi_host',
          displayName: 'Lofi Host',
          roles: ['role-lofi-admin'],
          joinedAt: '01/01/2026',
          isOwner: true,
        },
        {
          id: 'lf-m2',
          username: 'admin_nexus',
          displayName: 'Admin Nexus',
          roles: ['role-everyone'],
          joinedAt: '19/08/2026',
        },
      ],
      joinRequests: [],
      bannedUsers: [],
      auditLogs: [],
    },
    peak: {
      id: 'peak',
      name: 'Peak Design',
      description: 'Cộng đồng thiết kế đồ họa, UI/UX Design System và nghệ thuật thị giác.',
      initials: 'PD',
      systemChannelId: 'design',
      sendWelcomeMessage: false,
      adminUsernames: ['peak_lead'],
      moderatorUsernames: [],
      roles: [
        {
          id: 'role-peak-admin',
          name: 'Design Lead',
          color: '#1abc9c',
          membersCount: 1,
          permissions: {
            administrator: true,
            manageServer: true,
            manageRoles: true,
            kickMembers: true,
            banMembers: true,
            manageChannels: true,
          },
        },
        {
          id: 'role-everyone',
          name: '@everyone',
          color: '#99aab5',
          membersCount: 30,
          isDefault: true,
          permissions: {
            administrator: false,
            manageServer: false,
            manageRoles: false,
            kickMembers: false,
            banMembers: false,
            manageChannels: false,
          },
        },
      ],
      members: [
        {
          id: 'pk-m1',
          username: 'peak_lead',
          displayName: 'Peak Art Director',
          roles: ['role-peak-admin'],
          joinedAt: '01/01/2026',
          isOwner: true,
        },
        {
          id: 'pk-m2',
          username: 'admin_nexus',
          displayName: 'Admin Nexus',
          roles: ['role-everyone'],
          joinedAt: '19/08/2026',
        },
      ],
      joinRequests: [],
      bannedUsers: [],
      auditLogs: [],
    },
  });

  readonly currentServerData = computed<ServerSettingsData>(() => {
    const sId = this.currentServerId();
    return this.serverDataMap()[sId] ?? this.serverDataMap()['itss'];
  });

  readonly currentServerName = computed<string>(() => this.currentServerData().name);

  readonly serverRoles = computed<ServerRoleItem[]>(() => this.currentServerData().roles);
  readonly serverMembers = computed<ServerMemberItem[]>(() => this.currentServerData().members);
  readonly joinRequests = computed<JoinRequestItem[]>(() => this.currentServerData().joinRequests);
  readonly bannedServerMembers = computed<BannedUserItem[]>(() => this.currentServerData().bannedUsers || []);
  readonly auditLogs = computed<AuditLogItem[]>(() => this.currentServerData().auditLogs);

  // Computed permissions for current user in current server
  readonly userServerPermissions = computed(() => {
    const roleId = this.currentMemberRole();
    const role = this.serverRoles().find((r: ServerRoleItem) => r.id === roleId);
    if (!role) {
      return {
        administrator: false,
        manageServer: false,
        manageRoles: false,
        kickMembers: false,
        banMembers: false,
        manageChannels: false,
      };
    }
    return role.permissions;
  });

  readonly isServerAdmin = computed<boolean>(() => this.canManageOverview());

  canAccessServerSettings(targetServerId?: string): boolean {
    const sId = targetServerId ?? this.currentServerId();
    const server = this.serverDataMap()[sId];
    if (!server) return false;

    const username = this.getEffectiveUsername();
    if (username) {
      const isAdmin = server.adminUsernames.some((u: string) => u.toLowerCase() === username);
      const isMod = server.moderatorUsernames.some((u: string) => u.toLowerCase() === username);
      return Boolean(isAdmin || isMod);
    }

    return false;
  }

  canManageOverview(targetServerId?: string): boolean {
    const sId = targetServerId ?? this.currentServerId();
    const server = this.serverDataMap()[sId];
    if (!server) return false;

    const username = this.getEffectiveUsername();
    if (username) {
      return Boolean(server.adminUsernames.some((u: string) => u.toLowerCase() === username));
    }

    return false;
  }

  canManageRoles(targetServerId?: string): boolean {
    return this.canManageOverview(targetServerId);
  }

  canManageMembers(targetServerId?: string): boolean {
    return this.canAccessServerSettings(targetServerId);
  }

  canManageSafety(targetServerId?: string): boolean {
    return this.canAccessServerSettings(targetServerId);
  }

  canViewAuditLog(targetServerId?: string): boolean {
    return this.canAccessServerSettings(targetServerId);
  }

  hasPermissionForTab(tab: SettingsTab, targetServerId?: string): boolean {
    if (!tab.startsWith('server-')) return true;
    const sId = targetServerId ?? this.currentServerId();
    const server = this.serverDataMap()[sId];
    if (!server) return false;

    const username = this.getEffectiveUsername();
    if (username) {
      const isAdmin = server.adminUsernames.some((u: string) => u.toLowerCase() === username);
      if (isAdmin) return true;

      const isMod = server.moderatorUsernames.some((u: string) => u.toLowerCase() === username);
      if (isMod) {
        return tab === 'server-members' || tab === 'server-safety' || tab === 'server-audit-log';
      }
      return false;
    }

    return false;
  }

  setCurrentMemberRole(roleId: string): void {
    this.currentMemberRole.set(roleId);
  }

  updateCurrentServerOverview(updates: Partial<{ name: string; description: string; systemChannelId: string; sendWelcomeMessage: boolean }>): void {
    const sId = this.currentServerId();
    this.serverDataMap.update((map) => {
      const current = map[sId];
      if (!current) return map;
      return {
        ...map,
        [sId]: {
          ...current,
          ...updates,
        },
      };
    });
  }

  // Profile editable fields
  readonly editDisplayName = signal<string>('');
  readonly editUsername = signal<string>('');
  readonly editBio = signal<string>('');
  readonly editPronouns = signal<string>('');
  readonly editBannerColor = signal<string>('#003d4f');
  readonly editCustomStatus = signal<string>('Sẵn sàng kết nối');
  readonly editProfileTag = signal<string>('0001');

  // Baseline snapshots to detect unsaved changes
  private baselineDisplayName = '';
  private baselineUsername = '';
  private baselineBio = '';
  private baselinePronouns = '';
  private baselineBannerColor = '#003d4f';
  private baselineCustomStatus = 'Sẵn sàng kết nối';
  private baselineProfileTag = '0001';

  readonly isSaving = signal<boolean>(false);
  readonly saveSuccessNotice = signal<boolean>(false);

  // Live mic testing state
  readonly isTestingMic = signal<boolean>(false);
  readonly micLevel = signal<number>(0);
  private micStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private animFrameId: number | null = null;

  // Live camera preview state
  readonly isTestingVideo = signal<boolean>(false);

  // Connected accounts mock state
  readonly connectedAccounts = signal<ConnectedAccount[]>([
    {
      id: 'steam',
      platform: 'steam',
      name: 'Steam',
      username: 'NghienKhoPhai_99',
      icon: 'sports_esports',
      showOnProfile: true,
      color: '#171a21',
    },
    {
      id: 'github',
      platform: 'github',
      name: 'GitHub',
      username: 'nexus-developer',
      icon: 'code',
      showOnProfile: true,
      color: '#24292e',
    },
    {
      id: 'spotify',
      platform: 'spotify',
      name: 'Spotify',
      username: 'Nghiện Nhạc Chill',
      icon: 'music_note',
      showOnProfile: true,
      color: '#1db954',
    },
  ]);

  // Registered games mock state
  readonly registeredGames = signal<RegisteredGameItem[]>([
    {
      id: 'lol',
      name: 'League of Legends',
      lastPlayed: 'Hôm nay',
      overlayEnabled: true,
      statusEnabled: true,
      icon: 'sports_esports',
    },
    {
      id: 'valorant',
      name: 'VALORANT',
      lastPlayed: 'Hôm qua',
      overlayEnabled: true,
      statusEnabled: true,
      icon: 'gps_fixed',
    },
    {
      id: 'genshin',
      name: 'Genshin Impact',
      lastPlayed: '3 ngày trước',
      overlayEnabled: false,
      statusEnabled: true,
      icon: 'auto_awesome',
    },
    {
      id: 'cs2',
      name: 'Counter-Strike 2',
      lastPlayed: 'Tuần trước',
      overlayEnabled: true,
      statusEnabled: true,
      icon: 'military_tech',
    },
  ]);

  // Active Sessions mock state
  readonly activeSessions = signal<ActiveSessionItem[]>([
    {
      id: 'sess-1',
      device: 'Windows PC (Ứng dụng Desktop)',
      os: 'Windows 11 x64',
      location: 'Hà Nội, Việt Nam',
      ip: '113.190.234.12',
      lastActive: 'Đang hoạt động (Thiết bị này)',
      current: true,
      icon: 'desktop_windows',
    },
    {
      id: 'sess-2',
      device: 'iPhone 15 Pro (Nexus Mobile)',
      os: 'iOS 18.2',
      location: 'Hồ Chí Minh, Việt Nam',
      ip: '14.232.18.45',
      lastActive: '2 giờ trước',
      current: false,
      icon: 'smartphone',
    },
    {
      id: 'sess-3',
      device: 'Chrome trên macOS Sonoma',
      os: 'macOS 14.5',
      location: 'Đà Nẵng, Việt Nam',
      ip: '42.116.89.201',
      lastActive: '3 ngày trước',
      current: false,
      icon: 'laptop_mac',
    },
  ]);

  // Blocked users list
  readonly blockedUsers = signal<{ id: string; username: string; displayName: string }[]>([
    { id: 'b1', username: 'spammer_bot99', displayName: 'Free Nitro Bot' },
    { id: 'b2', username: 'toxic_player01', displayName: 'Toxic User' },
  ]);

  constructor() {
    effect(() => {
      const p = this.profileService.current();
      if (p) {
        this.initProfileDraft(
          p.displayName ?? p.username ?? '',
          p.username ?? '',
        );
        const uname = (p.username || '').toLowerCase();
        const sId = this.currentServerId();
        const currentServer = this.serverDataMap()[sId];
        if (currentServer?.adminUsernames.some((u: string) => u.toLowerCase() === uname)) {
          this.setCurrentMemberRole('role-admin');
        } else if (currentServer?.moderatorUsernames.some((u: string) => u.toLowerCase() === uname)) {
          this.setCurrentMemberRole('role-mod');
        } else {
          this.setCurrentMemberRole('role-everyone');
        }
      } else {
        this.setCurrentMemberRole('role-everyone');
      }
    });

    effect(() => {
      const prefs = this.preferences();
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        }
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', prefs.theme);
          if (prefs.themeAccent && prefs.themeAccent !== '#00ed64') {
            document.documentElement.style.setProperty('--nexus-primary', prefs.themeAccent);
            document.documentElement.style.setProperty('--nexus-brand-green', prefs.themeAccent);
          } else {
            document.documentElement.style.removeProperty('--nexus-primary');
            document.documentElement.style.removeProperty('--nexus-brand-green');
          }
          if (prefs.zoomLevel && prefs.zoomLevel !== 100) {
            document.documentElement.style.zoom = `${prefs.zoomLevel}%`;
          } else if (typeof document !== 'undefined') {
            document.documentElement.style.removeProperty('zoom');
          }
        }
      } catch {
        // ignore
      }
    });
  }

  open(tab: SettingsTab = 'voice-video'): void {
    this.currentTab.set(tab);
    this.searchQuery.set('');
    this.isOpen.set(true);
    const p = this.profileService.current();
    if (p && !this.editUsername()) {
      this.initProfileDraft(p.displayName ?? p.username ?? '', p.username ?? '');
    }
  }

  close(): void {
    this.stopMicTest();
    this.isTestingVideo.set(false);
    this.isOpen.set(false);
  }

  openServerSettings(tab: SettingsTab = 'server-overview', serverId = 'itss'): void {
    this.currentServerId.set(serverId);
    this.settingsMode.set('server');
    this.currentTab.set(tab);
    this.searchQuery.set('');
    this.isOpen.set(true);
  }

  openUserSettings(tab: SettingsTab = 'account'): void {
    this.settingsMode.set('user');
    this.currentTab.set(tab);
    this.searchQuery.set('');
    this.isOpen.set(true);
  }

  addServerRole(name: string, color: string): void {
    const sId = this.currentServerId();
    const newRole: ServerRoleItem = {
      id: `role-${Date.now()}`,
      name,
      color,
      membersCount: 0,
      permissions: {
        administrator: false,
        manageServer: false,
        manageRoles: false,
        kickMembers: false,
        banMembers: false,
        manageChannels: false,
      },
    };
    this.serverDataMap.update((map) => {
      const current = map[sId];
      if (!current) return map;
      return {
        ...map,
        [sId]: {
          ...current,
          roles: [newRole, ...current.roles],
        },
      };
    });
  }

  reorderServerRoles(fromIndex: number, toIndex: number): void {
    const sId = this.currentServerId();
    this.serverDataMap.update((map) => {
      const current = map[sId];
      if (!current) return map;
      const updated = [...current.roles];
      const [movedItem] = updated.splice(fromIndex, 1);
      if (movedItem) {
        updated.splice(toIndex, 0, movedItem);
      }
      return {
        ...map,
        [sId]: {
          ...current,
          roles: updated,
        },
      };
    });
  }

  deleteServerRole(id: string): void {
    const sId = this.currentServerId();
    this.serverDataMap.update((map) => {
      const current = map[sId];
      if (!current) return map;
      return {
        ...map,
        [sId]: {
          ...current,
          roles: current.roles.filter((r: ServerRoleItem) => r.id !== id && !r.isDefault),
        },
      };
    });
  }

  toggleRolePermission(roleId: string, permKey: keyof ServerRoleItem['permissions']): void {
    const sId = this.currentServerId();
    this.serverDataMap.update((map) => {
      const current = map[sId];
      if (!current) return map;
      return {
        ...map,
        [sId]: {
          ...current,
          roles: current.roles.map((r: ServerRoleItem) => {
            if (r.id !== roleId) return r;
            const newAdminVal = permKey === 'administrator' ? !r.permissions.administrator : r.permissions.administrator;
            const newPerms = {
              ...r.permissions,
              [permKey]: !r.permissions[permKey],
            };
            if (permKey === 'administrator' && newAdminVal) {
              newPerms.manageServer = true;
              newPerms.manageRoles = true;
              newPerms.kickMembers = true;
              newPerms.banMembers = true;
              newPerms.manageChannels = true;
            }
            return {
              ...r,
              permissions: newPerms,
            };
          }),
        },
      };
    });
  }

  approveJoinRequest(id: string): void {
    const sId = this.currentServerId();
    this.serverDataMap.update((map) => {
      const current = map[sId];
      if (!current) return map;
      const req = current.joinRequests.find((r: JoinRequestItem) => r.id === id);
      if (!req) return map;
      return {
        ...map,
        [sId]: {
          ...current,
          members: [
            ...current.members,
            {
              id: `m-${Date.now()}`,
              username: req.username,
              displayName: req.displayName,
              roles: [],
              joinedAt: 'Vừa xong',
            },
          ],
          joinRequests: current.joinRequests.filter((r: JoinRequestItem) => r.id !== id),
        },
      };
    });
  }

  rejectJoinRequest(id: string): void {
    const sId = this.currentServerId();
    this.serverDataMap.update((map) => {
      const current = map[sId];
      if (!current) return map;
      return {
        ...map,
        [sId]: {
          ...current,
          joinRequests: current.joinRequests.filter((r: JoinRequestItem) => r.id !== id),
        },
      };
    });
  }

  kickServerMember(id: string): void {
    const sId = this.currentServerId();
    this.serverDataMap.update((map) => {
      const current = map[sId];
      if (!current) return map;
      return {
        ...map,
        [sId]: {
          ...current,
          members: current.members.filter((m: ServerMemberItem) => m.id !== id || m.isOwner),
        },
      };
    });
  }

  banServerMember(id: string, reason: string): void {
    const sId = this.currentServerId();
    this.serverDataMap.update((map) => {
      const current = map[sId];
      if (!current) return map;
      const member = current.members.find((m: ServerMemberItem) => m.id === id);
      if (!member || member.isOwner) return map;
      return {
        ...map,
        [sId]: {
          ...current,
          members: current.members.filter((m: ServerMemberItem) => m.id !== id),
          bannedUsers: [
            ...(current.bannedUsers || []),
            {
              id: `b-${Date.now()}`,
              username: member.username,
              displayName: member.displayName,
              bannedAt: 'Vừa xong',
              reason: reason || 'Vi phạm nguyên tắc máy chủ',
            },
          ],
        },
      };
    });
  }

  unbanServerMember(id: string): void {
    const sId = this.currentServerId();
    this.serverDataMap.update((map) => {
      const current = map[sId];
      if (!current) return map;
      return {
        ...map,
        [sId]: {
          ...current,
          bannedUsers: (current.bannedUsers || []).filter((b: BannedUserItem) => b.id !== id),
        },
      };
    });
  }

  toggleMemberRole(memberId: string, roleId: string): void {
    const sId = this.currentServerId();
    this.serverDataMap.update((map) => {
      const current = map[sId];
      if (!current) return map;
      let diff = 0;
      const updatedMembers = current.members.map((m: ServerMemberItem) => {
        if (m.id !== memberId) return m;
        const hasRole = m.roles.includes(roleId);
        diff = hasRole ? -1 : 1;
        return {
          ...m,
          roles: hasRole ? m.roles.filter((r: string) => r !== roleId) : [...m.roles, roleId],
        };
      });
      const updatedRoles = current.roles.map((r: ServerRoleItem) =>
        r.id === roleId ? { ...r, membersCount: Math.max(0, r.membersCount + diff) } : r,
      );
      return {
        ...map,
        [sId]: {
          ...current,
          members: updatedMembers,
          roles: updatedRoles,
        },
      };
    });
  }

  setTab(tab: SettingsTab): void {
    this.currentTab.set(tab);
  }

  updatePreference<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]): void {
    this.preferences.update((prev) => ({ ...prev, [key]: value }));
  }

  toggleConnectedAccount(id: string): void {
    this.connectedAccounts.update((accounts) =>
      accounts.map((acc) =>
        acc.id === id ? { ...acc, showOnProfile: !acc.showOnProfile } : acc,
      ),
    );
  }

  connectAccount(platformId: string, name: string, icon: string, color: string): void {
    const exists = this.connectedAccounts().some((acc) => acc.id === platformId);
    if (exists) return;

    this.connectedAccounts.update((prev) => [
      ...prev,
      {
        id: platformId,
        platform: platformId as ConnectedAccount['platform'],
        name,
        username: `${this.editUsername() || 'nexus_user'}_${platformId}`,
        icon,
        showOnProfile: true,
        color,
      },
    ]);
  }

  disconnectAccount(id: string): void {
    this.connectedAccounts.update((prev) => prev.filter((acc) => acc.id !== id));
  }

  toggleGameOverlay(id: string): void {
    this.registeredGames.update((games) =>
      games.map((g) =>
        g.id === id ? { ...g, overlayEnabled: !g.overlayEnabled } : g,
      ),
    );
  }

  toggleGameStatus(id: string): void {
    this.registeredGames.update((games) =>
      games.map((g) =>
        g.id === id ? { ...g, statusEnabled: !g.statusEnabled } : g,
      ),
    );
  }

  unblockUser(id: string): void {
    this.blockedUsers.update((users) => users.filter((u) => u.id !== id));
  }

  revokeSession(id: string): void {
    this.activeSessions.update((sessions) => sessions.filter((s) => s.id !== id));
  }

  hasUnsavedChanges(): boolean {
    return (
      this.editDisplayName() !== this.baselineDisplayName ||
      this.editUsername() !== this.baselineUsername ||
      this.editBio() !== this.baselineBio ||
      this.editPronouns() !== this.baselinePronouns ||
      this.editBannerColor() !== this.baselineBannerColor ||
      this.editCustomStatus() !== this.baselineCustomStatus
    );
  }

  resetChanges(): void {
    this.editDisplayName.set(this.baselineDisplayName);
    this.editUsername.set(this.baselineUsername);
    this.editBio.set(this.baselineBio);
    this.editPronouns.set(this.baselinePronouns);
    this.editBannerColor.set(this.baselineBannerColor);
    this.editCustomStatus.set(this.baselineCustomStatus);
  }

  async saveChanges(): Promise<void> {
    this.isSaving.set(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      this.baselineDisplayName = this.editDisplayName();
      this.baselineUsername = this.editUsername();
      this.baselineBio = this.editBio();
      this.baselinePronouns = this.editPronouns();
      this.baselineBannerColor = this.editBannerColor();
      this.baselineCustomStatus = this.editCustomStatus();

      this.saveSuccessNotice.set(true);
      setTimeout(() => {
        this.saveSuccessNotice.set(false);
      }, 2500);
    } finally {
      this.isSaving.set(false);
    }
  }

  private initProfileDraft(displayName: string, username: string): void {
    this.baselineDisplayName = displayName || 'Nghiện Khó Phai';
    this.baselineUsername = username || 'nghienkhophai';
    this.baselineBio = 'Lập trình viên & đam mê xây dựng cộng đồng Nexus ✨';
    this.baselinePronouns = 'anh ấy / he/him';
    this.baselineBannerColor = '#003d4f';
    this.baselineCustomStatus = 'Sẵn sàng kết nối';
    this.baselineProfileTag = '0001';

    this.editDisplayName.set(this.baselineDisplayName);
    this.editUsername.set(this.baselineUsername);
    this.editBio.set(this.baselineBio);
    this.editPronouns.set(this.baselinePronouns);
    this.editBannerColor.set(this.baselineBannerColor);
    this.editCustomStatus.set(this.baselineCustomStatus);
    this.editProfileTag.set(this.baselineProfileTag);
  }

  private loadPreferences(): AppPreferences {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_PREFERENCES;
  }

  // Live microphone test
  async toggleMicTest(): Promise<void> {
    if (this.isTestingMic()) {
      this.stopMicTest();
    } else {
      await this.startMicTest();
    }
  }

  private async startMicTest(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
        const source = this.audioCtx.createMediaStreamSource(this.micStream);
        const analyser = this.audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        this.isTestingMic.set(true);

        const updateMeter = () => {
          if (!this.isTestingMic()) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          const level = Math.min(100, Math.round((avg / 128) * 100));
          this.micLevel.set(level);
          this.animFrameId = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      } else {
        this.simulateMicLevel();
      }
    } catch {
      this.simulateMicLevel();
    }
  }

  private simulateMicLevel(): void {
    this.isTestingMic.set(true);
    const loop = () => {
      if (!this.isTestingMic()) return;
      const base = 40 + Math.sin(Date.now() / 200) * 30 + Math.random() * 20;
      this.micLevel.set(Math.max(0, Math.min(100, Math.round(base))));
      this.animFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  stopMicTest(): void {
    this.isTestingMic.set(false);
    this.micLevel.set(0);
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  toggleVideoTest(): void {
    this.isTestingVideo.update((v) => !v);
  }
}
