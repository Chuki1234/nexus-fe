/**
 * DỮ LIỆU GIẢ cho vỏ ứng dụng kiểu Discord.
 *
 * Chưa có backend cho máy chủ, kênh, tin nhắn hay DM. Gom hết phần bịa vào đây
 * để khi có API thật thì chỉ thay các hàm truy xuất ở cuối file.
 *
 * Thời gian lưu dạng "cách đây bao nhiêu phút" chứ không phải mốc tuyệt đối: mốc
 * cứng sẽ cũ dần và tới một lúc nào đó bản mẫu hiện toàn tin nhắn từ năm ngoái.
 */

export interface MockServerSummary {
  id: string;
  name: string;
  /** Màu nền của huy hiệu. Màu riêng của từng máy chủ nên không dùng token theme. */
  color: string;
  /** Số tin chưa đọc trên toàn máy chủ. 0 = không có chấm đỏ. */
  unread: number;
}

export interface MockChatChannel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  topic: string;
  isPrivate: boolean;
  unread: number;
}

export interface MockChannelCategory {
  id: string;
  name: string;
  channels: MockChatChannel[];
}

export type PresenceStatus = 'online' | 'idle' | 'dnd' | 'offline';

/**
 * Màu trạng thái là quy ước ngữ nghĩa (xanh = rảnh, đỏ = bận), không phải bề mặt
 * theme — giữ nguyên ở mọi theme để người dùng không phải học lại bảng màu.
 */
export const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  online: '#23a55a',
  idle: '#f0b232',
  dnd: '#f23f43',
  offline: '#80848e',
};

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  online: 'Đang hoạt động',
  idle: 'Chờ',
  dnd: 'Đừng làm phiền',
  offline: 'Ngoại tuyến',
};

export interface MockMember {
  id: string;
  username: string;
  displayName: string;
  /** Màu tên trong danh sách, lấy theo vai trò cao nhất. */
  color: string | null;
  roleName: string;
  /**
   * Tên máy chủ mà `roleName` thuộc về.
   *
   * Không nằm sẵn trong dữ liệu giả mà do nơi mở thẻ hồ sơ gắn vào lúc chạy:
   * vai trò chỉ có nghĩa trong MỘT máy chủ, và cùng một người có thể mang vai
   * trò khác nhau ở mỗi nơi. `null`/thiếu = không có máy chủ nào đứng sau (tin
   * nhắn riêng, trang hồ sơ), lúc đó thẻ giấu hẳn mục Vai trò thay vì hiện một
   * chức danh lơ lửng không biết của đâu.
   */
  roleServer?: string | null;
  status: PresenceStatus;
}

export interface MockMessage {
  id: string;
  authorId: string;
  /** Xuống dòng bằng `\n`; template dùng `whitespace-pre-line`. */
  body: string;
  minutesAgo: number;
}

export interface MockConversation {
  id: string;
  member: MockMember;
  preview: string;
  unread: number;
}

export const MOCK_SERVER_LIST: MockServerSummary[] = [
  { id: 'nexus-core', name: 'Nexus Core', color: '#00d992', unread: 3 },
  { id: 'design-club', name: 'Hội Thiết kế', color: '#f06bb8', unread: 0 },
  { id: 'rust-vn', name: 'Rust Việt Nam', color: '#fa6e39', unread: 12 },
];

export const MOCK_MEMBERS: MockMember[] = [
  {
    id: 'u1',
    username: 'maitran',
    displayName: 'Mai Trần',
    color: '#f06bb8',
    roleName: 'Quản trị viên',
    status: 'online',
  },
  {
    id: 'u2',
    username: 'ducpham',
    displayName: 'Đức Phạm',
    color: '#7b3ff2',
    roleName: 'Điều hành viên',
    status: 'online',
  },
  {
    id: 'u3',
    username: 'linhvo',
    displayName: 'linhvo',
    color: null,
    roleName: 'Thành viên',
    status: 'idle',
  },
  {
    id: 'u4',
    username: 'hoangle',
    displayName: 'Hoàng Lê',
    color: null,
    roleName: 'Thành viên',
    status: 'dnd',
  },
  {
    id: 'u5',
    username: 'thao.nguyen',
    displayName: 'Thảo Nguyễn',
    color: null,
    roleName: 'Thành viên',
    status: 'offline',
  },
];

export const MOCK_CATEGORIES: Record<string, MockChannelCategory[]> = {
  'nexus-core': [
    {
      id: 'cat-general',
      name: 'Chung',
      channels: [
        {
          id: 'general',
          name: 'chung',
          type: 'text',
          topic: 'Chỗ nói chuyện linh tinh. Bàn kỹ thuật thì sang #phat-trien.',
          isPrivate: false,
          unread: 0,
        },
        {
          id: 'gioi-thieu',
          name: 'gioi-thieu',
          type: 'text',
          topic: 'Người mới vào chào một câu.',
          isPrivate: false,
          unread: 3,
        },
      ],
    },
    {
      id: 'cat-dev',
      name: 'Phát triển',
      channels: [
        {
          id: 'dev',
          name: 'phat-trien',
          type: 'text',
          topic: 'Pull request, kiến trúc, và tranh luận về tab hay space.',
          isPrivate: true,
          unread: 0,
        },
        {
          id: 'review',
          name: 'code-review',
          type: 'text',
          topic: 'Dán link PR vào đây.',
          isPrivate: true,
          unread: 0,
        },
        { id: 'standup', name: 'Họp nhanh', type: 'voice', topic: '', isPrivate: false, unread: 0 },
      ],
    },
  ],
  'design-club': [
    {
      id: 'cat-design',
      name: 'Thiết kế',
      channels: [
        {
          id: 'inspiration',
          name: 'cam-hung',
          type: 'text',
          topic: 'Thấy gì đẹp thì quăng vào đây.',
          isPrivate: false,
          unread: 0,
        },
        {
          id: 'critique',
          name: 'gop-y',
          type: 'text',
          topic: 'Đưa bản nháp, nhận góp ý thẳng thắn.',
          isPrivate: false,
          unread: 0,
        },
      ],
    },
  ],
  'rust-vn': [
    {
      id: 'cat-rust',
      name: 'Rust',
      channels: [
        {
          id: 'help',
          name: 'hoi-dap',
          type: 'text',
          topic: 'Borrow checker lại không cho bạn ngủ à?',
          isPrivate: false,
          unread: 12,
        },
        {
          id: 'showcase',
          name: 'khoe-hang',
          type: 'text',
          topic: 'Khoe thứ bạn vừa viết bằng Rust.',
          isPrivate: false,
          unread: 0,
        },
      ],
    },
  ],
};

/** Tin nhắn theo id kênh. Kênh không có ở đây thì hiện trạng thái rỗng. */
export const MOCK_MESSAGES: Record<string, MockMessage[]> = {
  general: [
    {
      id: 'm1',
      authorId: 'u2',
      body: 'Sáng nay ai deploy bản mới lên staging chưa nhỉ?',
      minutesAgo: 184,
    },
    {
      id: 'm2',
      authorId: 'u1',
      body: 'Rồi, mình đẩy lúc 8h. Có mỗi phần avatar là còn chậm, đang xem lại chỗ resize.',
      minutesAgo: 180,
    },
    {
      id: 'm3',
      authorId: 'u1',
      body: 'Mà cái webp giảm được gần 70% dung lượng so với ảnh gốc, khá ổn.',
      minutesAgo: 179,
    },
    { id: 'm4', authorId: 'u3', body: 'Ngon 👍', minutesAgo: 96 },
    {
      id: 'm5',
      authorId: 'u4',
      body: 'Cho mình hỏi phần đổi theme là làm bằng CSS variable hay build riêng từng bản vậy?',
      minutesAgo: 42,
    },
    {
      id: 'm6',
      authorId: 'u1',
      body: 'CSS variable. Tailwind v4 nó compile ra var(--color-canvas) nên chỉ cần ghi đè biến là xong,\nkhông phải sửa class ở trang nào cả.',
      minutesAgo: 38,
    },
    {
      id: 'm7',
      authorId: 'u2',
      body: 'Thế thì thêm theme mới rẻ thật. Tối nay thử làm bản nền sáng xem sao.',
      minutesAgo: 12,
    },
  ],
  'gioi-thieu': [
    {
      id: 'n1',
      authorId: 'u5',
      body: 'Chào cả nhà, mình là Thảo, mới vào. Mình làm frontend được 2 năm rồi ạ.',
      minutesAgo: 55,
    },
    {
      id: 'n2',
      authorId: 'u1',
      body: 'Chào Thảo! Bạn ghé #phat-trien nhé, đang có mấy task vừa tầm cho người mới.',
      minutesAgo: 50,
    },
    { id: 'n3', authorId: 'u3', body: 'Welcome 🎉', minutesAgo: 48 },
  ],
  dev: [
    {
      id: 'd1',
      authorId: 'u2',
      body: 'PR #142 xong rồi, ai review giúp mình với.',
      minutesAgo: 300,
    },
    {
      id: 'd2',
      authorId: 'u1',
      body: 'Để mình xem. Nhớ tách cái migration ra file riêng nhé, đừng sửa file cũ đã push.',
      minutesAgo: 295,
    },
  ],
  help: [
    {
      id: 'h1',
      authorId: 'u4',
      body: 'cannot borrow `self.items` as mutable because it is also borrowed as immutable\n\nMình bị dòng này suốt, ai cứu với 😭',
      minutesAgo: 20,
    },
    {
      id: 'h2',
      authorId: 'u2',
      body: 'Tách cái đọc ra một scope riêng trước, hoặc clone key ra rồi mới mutate. Gửi code lên xem cụ thể.',
      minutesAgo: 15,
    },
  ],
};

export const MOCK_CONVERSATIONS: MockConversation[] = [
  { id: 'u2', member: MOCK_MEMBERS[1], preview: 'Ok để tối mình xem lại rồi báo nhé', unread: 2 },
  {
    id: 'u1',
    member: MOCK_MEMBERS[0],
    preview: 'Bạn gửi mình cái link design system với',
    unread: 0,
  },
  { id: 'u3', member: MOCK_MEMBERS[2], preview: 'Cảm ơn bạn nhiều!', unread: 0 },
  { id: 'u5', member: MOCK_MEMBERS[4], preview: 'Mai họp lúc mấy giờ vậy bạn?', unread: 0 },
];

/** Tin nhắn riêng, theo id người đối thoại. */
export const MOCK_DM_MESSAGES: Record<string, MockMessage[]> = {
  u2: [
    {
      id: 'p1',
      authorId: 'u2',
      body: 'Này, phần phân quyền bên settings bạn định làm theo CASL luôn hay tự viết decorator?',
      minutesAgo: 90,
    },
    {
      id: 'p2',
      authorId: 'me',
      body: 'Mình tính CASL. Nó có sẵn phần định nghĩa ability theo subject/action, đỡ phải tự dựng.',
      minutesAgo: 85,
    },
    { id: 'p3', authorId: 'u2', body: 'Ok để tối mình xem lại rồi báo nhé', minutesAgo: 80 },
  ],
  u1: [
    { id: 'q1', authorId: 'u1', body: 'Bạn gửi mình cái link design system với', minutesAgo: 240 },
  ],
  u3: [{ id: 'r1', authorId: 'u3', body: 'Cảm ơn bạn nhiều!', minutesAgo: 1440 }],
  u5: [{ id: 's1', authorId: 'u5', body: 'Mai họp lúc mấy giờ vậy bạn?', minutesAgo: 2880 }],
};

/** Id giả cho chính người đang đăng nhập, dùng để nhận ra tin của mình. */
export const CURRENT_USER_ID = 'me';

/**
 * Gói một hồ sơ THẬT vào hình dạng `MockMember` để dùng lại thẻ / cửa sổ hồ sơ.
 *
 * Hai thứ đó nhận `MockMember` vì chúng sinh ra cho danh sách thành viên giả,
 * nhưng người thật thì không nằm trong `MOCK_MEMBERS`. Bọc lại ở đây rẻ hơn
 * nhiều so với dựng một biến thể riêng của cả cái thẻ chỉ để đổi kiểu dữ liệu.
 *
 * Hai trường dưới đây là chỗ dữ liệu thật hết mà bản mẫu phải tự bịa:
 *  · `status` cố định 'online' — chưa có kênh realtime nào để biết ai đang online.
 *  · `roleName` rỗng — vai trò là chuyện của từng máy chủ, mà trang hồ sơ và
 *    thanh người dùng dưới đáy đều không đứng trong máy chủ nào. Thẻ hồ sơ giấu
 *    luôn mục Vai trò khi chuỗi này rỗng.
 */
export function profileAsMember(username: string, displayName: string): MockMember {
  return {
    // username chứ không phải UUID của Supabase: khung chat (bản mẫu) định danh
    // người theo username — xem findDmPartner — nên UUID sẽ không khớp ai cả và
    // nút "Nhắn tin" trong thẻ sẽ mở ra một khung chat trống trơn.
    id: username,
    username,
    displayName,
    color: null,
    roleName: '',
    status: 'online',
  };
}

/**
 * Như trên nhưng cho chính người đang đăng nhập.
 *
 * Khác đúng một chỗ: `id` là `CURRENT_USER_ID` chứ không phải username, để
 * thanh người dùng dưới đáy nhận ra thẻ đang mở là thẻ của mình (aria-expanded).
 */
export function selfAsMember(username: string, displayName: string): MockMember {
  return { ...profileAsMember(username, displayName), id: CURRENT_USER_ID };
}

export function findServer(id: string | null | undefined): MockServerSummary | null {
  return MOCK_SERVER_LIST.find((server) => server.id === id) ?? null;
}

export function categoriesOf(serverId: string | null | undefined): MockChannelCategory[] {
  return MOCK_CATEGORIES[serverId ?? ''] ?? [];
}

export function channelsOf(serverId: string | null | undefined): MockChatChannel[] {
  return categoriesOf(serverId).flatMap((category) => category.channels);
}

/** Kênh văn bản đầu tiên — đích đến khi người dùng bấm vào một máy chủ. */
export function firstTextChannel(serverId: string | null | undefined): MockChatChannel | null {
  return channelsOf(serverId).find((channel) => channel.type === 'text') ?? null;
}

export function findChannel(
  serverId: string | null | undefined,
  channelId: string | null | undefined,
): MockChatChannel | null {
  return channelsOf(serverId).find((channel) => channel.id === channelId) ?? null;
}

export function findMember(id: string): MockMember | null {
  return MOCK_MEMBERS.find((member) => member.id === id) ?? null;
}

export function findConversation(id: string | null | undefined): MockConversation | null {
  return MOCK_CONVERSATIONS.find((conversation) => conversation.id === id) ?? null;
}

/**
 * Người ở đầu bên kia của một cuộc nhắn riêng.
 *
 * Nhận cả ba dạng định danh vì mỗi nơi trong ứng dụng cầm một dạng khác nhau:
 *  · id cuộc trò chuyện — danh sách DM
 *  · id thành viên (u1…u5) — thẻ hồ sơ nổi, danh sách thành viên
 *  · username — trang hồ sơ, nơi chỉ có dữ liệu THẬT nên không biết id giả
 *
 * Trang hồ sơ chỉ có UUID của Supabase, mà UUID đó không khớp id thành viên giả;
 * thiếu nhánh username thì nút "Nhắn tin" ở đó mở ra khung chat trống trơn.
 *
 * Không có sẵn cuộc trò chuyện vẫn trả về người — đó là lúc bắt đầu trò chuyện mới.
 */
export function findDmPartner(id: string | null | undefined): MockMember | null {
  if (!id) {
    return null;
  }
  const key = id.toLowerCase();
  return (
    findConversation(id)?.member ??
    MOCK_MEMBERS.find((member) => member.id === id || member.username.toLowerCase() === key) ??
    null
  );
}

/**
 * "5 phút", "2 giờ", "3 ngày" — đủ cho bản mẫu và không cần nạp cả bộ locale
 * chỉ để hiển thị một dòng thời gian.
 */
export function relativeTime(minutesAgo: number): string {
  if (minutesAgo < 1) {
    return 'vừa xong';
  }
  if (minutesAgo < 60) {
    return `${minutesAgo} phút trước`;
  }
  if (minutesAgo < 60 * 24) {
    return `${Math.floor(minutesAgo / 60)} giờ trước`;
  }
  return `${Math.floor(minutesAgo / (60 * 24))} ngày trước`;
}
