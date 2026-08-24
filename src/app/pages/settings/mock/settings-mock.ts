/**
 * DỮ LIỆU GIẢ cho bản mẫu Settings.
 *
 * Máy chủ, kênh, vai trò, bạn bè và lời mời đều chưa tồn tại trong backend. File
 * này gom toàn bộ phần bịa vào một chỗ, để khi backend có thật thì chỉ việc thay
 * các hàm ở đây bằng lời gọi API — component không phải sửa.
 *
 * Phần KHÔNG giả: theme, ngôn ngữ, và hồ sơ người dùng (đã có API thật).
 */

export interface MockServer {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  visibility: 'private' | 'public';
  requireApproval: boolean;
  requireVerifiedEmail: boolean;
}

export interface MockChannel {
  id: string;
  serverId: string;
  name: string;
  topic: string;
  type: 'text' | 'voice';
  /** Giây. 0 là tắt. */
  slowModeSeconds: number;
  isPrivate: boolean;
  syncWithCategory: boolean;
  /** Id các vai trò thấy được kênh khi `isPrivate`. */
  allowedRoleIds: string[];
}

/**
 * Khoá quyền dùng chung cho cả máy chủ và kênh.
 *
 * Đặt tên theo dạng `<đối tượng>.<hành động>` để sau này ánh xạ thẳng sang
 * subject/action của CASL bên backend mà không phải dịch qua lại.
 */
export type PermissionKey =
  | 'server.view'
  | 'server.manage'
  | 'server.invite'
  | 'channel.view'
  | 'channel.manage'
  | 'message.send'
  | 'message.attach'
  | 'message.embed'
  | 'message.mentionEveryone'
  | 'member.kick'
  | 'member.ban'
  | 'member.timeout'
  | 'message.manage';

export interface PermissionGroup {
  /** Khoá i18n của tên nhóm. */
  labelKey: string;
  permissions: { key: PermissionKey; label: string; hint: string }[];
}

export interface MockRole {
  id: string;
  name: string;
  /** Mã màu thật, không phải token: mỗi vai trò tự chọn màu riêng. */
  color: string;
  memberCount: number;
  permissions: PermissionKey[];
  /** Vai trò mặc định của mọi thành viên — không xoá được. */
  isEveryone?: boolean;
}

export interface MockFriend {
  id: string;
  username: string;
  displayName: string;
  /** Đã ở trong máy chủ/kênh này rồi thì không mời lại được. */
  alreadyMember: boolean;
}

export interface MockInvite {
  code: string;
  createdByUsername: string;
  /** ISO. `null` = không hết hạn. */
  expiresAt: string | null;
  uses: number;
  /** `null` = không giới hạn. */
  maxUses: number | null;
}

export const MOCK_SERVER: MockServer = {
  id: 'nexus-core',
  name: 'Nexus Core',
  description:
    'Nơi nhóm phát triển Nexus bàn chuyện sản phẩm, thiết kế và những cái bug lúc 2 giờ sáng.',
  memberCount: 128,
  visibility: 'private',
  requireApproval: false,
  requireVerifiedEmail: true,
};

export const MOCK_CHANNELS: MockChannel[] = [
  {
    id: 'general',
    serverId: 'nexus-core',
    name: 'chung',
    topic: 'Chỗ nói chuyện linh tinh. Bàn kỹ thuật thì sang #phat-trien.',
    type: 'text',
    slowModeSeconds: 0,
    isPrivate: false,
    syncWithCategory: true,
    allowedRoleIds: [],
  },
  {
    id: 'dev',
    serverId: 'nexus-core',
    name: 'phat-trien',
    topic: 'Pull request, kiến trúc, và tranh luận về tab hay space.',
    type: 'text',
    slowModeSeconds: 5,
    isPrivate: true,
    syncWithCategory: false,
    allowedRoleIds: ['admin', 'moderator'],
  },
];

/**
 * Tìm kênh theo id lấy từ route. Không thấy thì trả kênh đầu tiên: bản mẫu nên
 * hiện một cái gì đó thay vì màn hình trắng khi ai đó gõ tay một id lạ.
 */
export function resolveChannel(id: string | null | undefined): MockChannel {
  return MOCK_CHANNELS.find((channel) => channel.id === id) ?? MOCK_CHANNELS[0];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    labelKey: 'settings.roles.groupGeneral',
    permissions: [
      { key: 'server.view', label: 'Xem máy chủ', hint: 'Thấy máy chủ trong danh sách của mình.' },
      { key: 'server.manage', label: 'Quản lý máy chủ', hint: 'Đổi tên, mô tả, ảnh và cài đặt.' },
      { key: 'server.invite', label: 'Tạo lời mời', hint: 'Sinh link mời người mới.' },
      { key: 'channel.view', label: 'Xem kênh', hint: 'Đọc được nội dung kênh.' },
      { key: 'channel.manage', label: 'Quản lý kênh', hint: 'Tạo, sửa, xoá kênh.' },
    ],
  },
  {
    labelKey: 'settings.roles.groupMessages',
    permissions: [
      { key: 'message.send', label: 'Gửi tin nhắn', hint: 'Viết tin trong kênh văn bản.' },
      { key: 'message.attach', label: 'Đính kèm tệp', hint: 'Gửi ảnh và tệp.' },
      { key: 'message.embed', label: 'Nhúng link', hint: 'Link tự bung thành thẻ xem trước.' },
      {
        key: 'message.mentionEveryone',
        label: 'Nhắc @everyone',
        hint: 'Gửi thông báo tới toàn bộ thành viên.',
      },
    ],
  },
  {
    labelKey: 'settings.roles.groupModeration',
    permissions: [
      {
        key: 'message.manage',
        label: 'Quản lý tin nhắn',
        hint: 'Xoá hoặc ghim tin của người khác.',
      },
      {
        key: 'member.timeout',
        label: 'Cấm nói tạm thời',
        hint: 'Chặn một người gửi tin trong một khoảng.',
      },
      {
        key: 'member.kick',
        label: 'Đuổi thành viên',
        hint: 'Loại khỏi máy chủ, vẫn vào lại được.',
      },
      { key: 'member.ban', label: 'Cấm vĩnh viễn', hint: 'Loại khỏi máy chủ và chặn quay lại.' },
    ],
  },
];

export const MOCK_ROLES: MockRole[] = [
  {
    id: 'admin',
    name: 'Quản trị viên',
    color: '#f06bb8',
    memberCount: 3,
    permissions: PERMISSION_GROUPS.flatMap((group) => group.permissions.map((p) => p.key)),
  },
  {
    id: 'moderator',
    name: 'Điều hành viên',
    color: '#7b3ff2',
    memberCount: 8,
    permissions: [
      'server.view',
      'server.invite',
      'channel.view',
      'message.send',
      'message.attach',
      'message.embed',
      'message.manage',
      'member.timeout',
      'member.kick',
    ],
  },
  {
    id: 'member',
    name: 'Thành viên',
    color: '#3d4f9f',
    memberCount: 117,
    permissions: ['server.view', 'channel.view', 'message.send', 'message.attach', 'message.embed'],
  },
  {
    id: 'everyone',
    name: '@everyone',
    color: '#8b949e',
    memberCount: 128,
    permissions: ['server.view', 'channel.view'],
    isEveryone: true,
  },
];

export const MOCK_FRIENDS: MockFriend[] = [
  { id: 'f1', username: 'maitran', displayName: 'Mai Trần', alreadyMember: true },
  { id: 'f2', username: 'ducpham', displayName: 'Đức Phạm', alreadyMember: false },
  { id: 'f3', username: 'linhvo', displayName: 'linhvo', alreadyMember: false },
  {
    id: 'f4',
    username: 'hoangle',
    displayName: 'Hoàng Lê Nguyễn Minh Anh Tuấn',
    alreadyMember: false,
  },
  { id: 'f5', username: 'thao.nguyen', displayName: 'Thảo Nguyễn', alreadyMember: false },
];

/** Các lựa chọn thời hạn cho link mời, tính bằng giờ. `null` = không hết hạn. */
export const INVITE_EXPIRY_OPTIONS: { hours: number | null; labelKey: string; amount: number }[] = [
  { hours: 1, labelKey: 'settings.invites.hours', amount: 1 },
  { hours: 24, labelKey: 'settings.invites.days', amount: 1 },
  { hours: 24 * 7, labelKey: 'settings.invites.days', amount: 7 },
  { hours: null, labelKey: 'settings.invites.never', amount: 0 },
];

export const INVITE_MAX_USES_OPTIONS: (number | null)[] = [1, 5, 25, 100, null];

/**
 * Sinh mã mời kiểu Nanoid.
 *
 * Bảng chữ cái bỏ hẳn `0/O` và `1/l/I` — mã này người ta còn đọc cho nhau qua
 * điện thoại, mà những cặp đó nhìn và nghe đều lẫn.
 *
 * Bản thật sẽ do backend sinh (nanoid + TTL trong Supabase) chứ không phải client:
 * client sinh thì không chống được trùng mã và không đặt được hạn dùng đáng tin.
 */
export function generateInviteCode(length = 8): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
