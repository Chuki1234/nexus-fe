import type { ProfileLink } from '../../../shared';

/** Nhóm hiển thị trong tab "Ứng dụng đã kết nối". */
export type PlatformCategory = 'social' | 'gaming' | 'creative';

export const CATEGORY_LABELS: Record<PlatformCategory, string> = {
  social: 'Mạng xã hội & nhắn tin',
  gaming: 'Chơi game',
  creative: 'Sáng tạo & lập trình',
};

/**
 * Một nền tảng có thể gắn vào hồ sơ Nexus.
 *
 * Nexus KHÔNG nói chuyện với các nền tảng này: không OAuth, không đọc trạng thái
 * đang chơi gì, không xác minh gì cả. Thứ được lưu chỉ là địa chỉ trang cá nhân
 * mà chủ tài khoản tự khai — đúng bản chất một `ProfileLink`.
 *
 * Vì vậy giao diện không được hứa nhiều hơn thế: không có huy hiệu "Đã xác
 * minh", không có hộp thoại "Ủy quyền kết nối".
 */
export interface AppPlatform {
  id: string;
  name: string;
  /** Ligature Material Icons chỉ dùng làm fallback nếu logo CDN không tải được. */
  icon: string;
  /**
   * Logo SVG chính thức lấy từ WorldVectorLogo và lưu cùng frontend.
   *
   * Lưu local để tuân thủ `img-src 'self'` trong CSP và không biến trạng thái
   * của CDN thành trạng thái của giao diện Nexus.
   */
  logoUrl: string;
  /** Bộ lọc chỉ dùng cho logo đen cần đổi sang trắng để đọc được trên nền tối. */
  logoFilter?: string;
  /**
   * Màu thương hiệu ở phiên bản ĐỌC ĐƯỢC TRÊN NỀN TỐI, không phải mã gốc.
   *
   * Nexus chỉ có dark mode. Dùng mã gốc thì GitHub (#24292e) và X (#0f1419)
   * thành hai ô đen trên nền navy — trông như chỗ ảnh chưa tải xong. Steam và
   * LinkedIn cũng có sẵn biến thể sáng cho nền tối, dùng đúng biến thể đó.
   */
  color: string;
  category: PlatformCategory;
  /**
   * Hiện lên nhóm "Đề xuất" ở đầu danh sách.
   *
   * Chọn theo thứ người dùng Việt Nam thực sự dùng — Nexus là ứng dụng tiếng
   * Việt, nên Zalo và Facebook phải nằm trên cùng chứ không phải xếp theo thứ tự
   * bảng chữ cái hay theo độ nổi tiếng toàn cầu.
   */
  recommended?: boolean;
  /**
   * Phần đứng trước tên tài khoản trong URL trang cá nhân.
   *
   * Dùng luôn tiền tố này để nhận lại link đã lưu thuộc nền tảng nào, thay vì so
   * theo hostname: Xbox nhét tên vào query string nên so hostname là không đủ.
   */
  urlPrefix: string;
  /** Gợi ý trong ô nhập — cho thấy đúng dạng tên mà nền tảng đó dùng. */
  placeholder: string;
  /**
   * Ghi chú khi trang cá nhân KHÔNG do chính hãng cung cấp.
   *
   * Riot và PlayStation không có trang hồ sơ công khai chính chủ; link phải đi
   * qua op.gg / psnprofiles. Người dùng có quyền biết mình đang gắn địa chỉ của
   * bên thứ ba lên hồ sơ mình.
   */
  note?: string;
}

export const APP_PLATFORMS: readonly AppPlatform[] = [
  // ── Mạng xã hội & nhắn tin ───────────────────────────────────────────────
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'groups',
    logoUrl: '/assets/platform-logos/facebook.svg',
    color: '#4599ff',
    category: 'social',
    recommended: true,
    urlPrefix: 'https://www.facebook.com/',
    placeholder: 'ten.tai.khoan',
  },
  {
    id: 'zalo',
    name: 'Zalo',
    icon: 'chat_bubble',
    logoUrl: '/assets/platform-logos/zalo.svg',
    color: '#4a9eff',
    category: 'social',
    recommended: true,
    urlPrefix: 'https://zalo.me/',
    placeholder: '0912345678',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'photo_camera',
    logoUrl: '/assets/platform-logos/instagram.svg',
    color: '#f06bb8',
    category: 'social',
    recommended: true,
    urlPrefix: 'https://www.instagram.com/',
    placeholder: 'tentaikhoan',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'movie_filter',
    logoUrl: '/assets/platform-logos/tiktok.svg',
    color: '#ff4d6d',
    category: 'social',
    recommended: true,
    urlPrefix: 'https://www.tiktok.com/@',
    placeholder: 'tentaikhoan',
  },
  {
    id: 'x',
    name: 'X',
    icon: 'chat',
    logoUrl: '/assets/platform-logos/x.svg',
    logoFilter: 'brightness(0) invert(1)',
    color: '#e7e9ea',
    category: 'social',
    urlPrefix: 'https://x.com/',
    placeholder: 'tentaikhoan',
  },
  {
    id: 'threads',
    name: 'Threads',
    icon: 'alternate_email',
    logoUrl: '/assets/platform-logos/threads.svg',
    logoFilter: 'brightness(0) invert(1)',
    color: '#c1ccd3',
    category: 'social',
    urlPrefix: 'https://www.threads.net/@',
    placeholder: 'tentaikhoan',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: 'send',
    logoUrl: '/assets/platform-logos/telegram.svg',
    color: '#4fb3e8',
    category: 'social',
    urlPrefix: 'https://t.me/',
    placeholder: 'tentaikhoan',
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: 'forum',
    logoUrl: '/assets/platform-logos/discord.svg',
    color: '#8b9cff',
    category: 'social',
    urlPrefix: 'https://discord.com/users/',
    placeholder: '123456789012345678',
    note: 'Discord không có link theo tên — dùng ID người dùng (bật Chế độ nhà phát triển để sao chép).',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: 'campaign',
    logoUrl: '/assets/platform-logos/reddit.svg',
    color: '#ff5722',
    category: 'social',
    urlPrefix: 'https://www.reddit.com/user/',
    placeholder: 'ten-tai-khoan',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'work',
    logoUrl: '/assets/platform-logos/linkedin.svg',
    color: '#70b5f9',
    category: 'social',
    urlPrefix: 'https://www.linkedin.com/in/',
    placeholder: 'ten-ho-so',
  },

  // ── Chơi game ────────────────────────────────────────────────────────────
  {
    id: 'steam',
    name: 'Steam',
    icon: 'sports_esports',
    logoUrl: '/assets/platform-logos/steam.svg',
    color: '#66c0f4',
    category: 'gaming',
    urlPrefix: 'https://steamcommunity.com/id/',
    placeholder: 'ten-steam',
  },
  {
    id: 'riot',
    name: 'Riot Games',
    icon: 'videogame_asset',
    logoUrl: '/assets/platform-logos/riot-games.svg',
    color: '#ff5c5c',
    category: 'gaming',
    urlPrefix: 'https://op.gg/summoners/vn/',
    placeholder: 'TenGame-TAG',
    note: 'Riot không có trang hồ sơ công khai — link đi qua op.gg.',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    icon: 'live_tv',
    logoUrl: '/assets/platform-logos/twitch.svg',
    color: '#a970ff',
    category: 'gaming',
    urlPrefix: 'https://www.twitch.tv/',
    placeholder: 'tenkenh',
  },
  {
    id: 'xbox',
    name: 'Xbox',
    icon: 'smart_toy',
    logoUrl: '/assets/platform-logos/xbox.svg',
    color: '#7bd45a',
    category: 'gaming',
    urlPrefix: 'https://account.xbox.com/profile?gamertag=',
    placeholder: 'Gamertag',
  },
  {
    id: 'playstation',
    name: 'PlayStation',
    icon: 'gamepad',
    logoUrl: '/assets/platform-logos/playstation.svg',
    logoFilter: 'brightness(0) invert(1)',
    color: '#7aa7ff',
    category: 'gaming',
    urlPrefix: 'https://psnprofiles.com/',
    placeholder: 'ten-psn',
    note: 'PlayStation không mở trang hồ sơ công khai — link đi qua PSNProfiles.',
  },

  // ── Sáng tạo & lập trình ─────────────────────────────────────────────────
  {
    id: 'youtube',
    name: 'YouTube',
    icon: 'smart_display',
    logoUrl: '/assets/platform-logos/youtube.svg',
    color: '#ff4d4d',
    category: 'creative',
    recommended: true,
    urlPrefix: 'https://www.youtube.com/@',
    placeholder: 'tenkenh',
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: 'code',
    logoUrl: '/assets/platform-logos/github.svg',
    logoFilter: 'brightness(0) invert(1)',
    color: '#ffffff',
    category: 'creative',
    recommended: true,
    urlPrefix: 'https://github.com/',
    placeholder: 'ten-tai-khoan',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    icon: 'account_tree',
    logoUrl: '/assets/platform-logos/gitlab.svg',
    color: '#ff9a6b',
    category: 'creative',
    urlPrefix: 'https://gitlab.com/',
    placeholder: 'ten-tai-khoan',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: 'library_music',
    logoUrl: '/assets/platform-logos/spotify.svg',
    color: '#1ed760',
    category: 'creative',
    urlPrefix: 'https://open.spotify.com/user/',
    placeholder: 'ma-nguoi-dung',
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    icon: 'graphic_eq',
    logoUrl: '/assets/platform-logos/soundcloud.svg',
    color: '#ff8a4c',
    category: 'creative',
    urlPrefix: 'https://soundcloud.com/',
    placeholder: 'ten-tai-khoan',
  },
  {
    id: 'behance',
    name: 'Behance',
    icon: 'palette',
    logoUrl: '/assets/platform-logos/behance.svg',
    color: '#7f9cff',
    category: 'creative',
    urlPrefix: 'https://www.behance.net/',
    placeholder: 'tentaikhoan',
  },
  {
    id: 'dribbble',
    name: 'Dribbble',
    icon: 'brush',
    logoUrl: '/assets/platform-logos/dribbble.svg',
    color: '#f77fb4',
    category: 'creative',
    urlPrefix: 'https://dribbble.com/',
    placeholder: 'tentaikhoan',
  },
];

/**
 * Nền màu nhạt cùng tông với icon của nền tảng — hex 6 số + alpha 2 số.
 *
 * Hàm thuần, không phụ thuộc component: cả lưới chọn nền tảng (`ConnectionsTab`)
 * lẫn thanh popup nhập tên tài khoản (`SettingsModal`) đều tô icon theo đúng một
 * quy tắc màu, tránh hai nơi tự chế ra hai cách tính khác nhau.
 */
export function tint(color: string, alpha = '24'): string {
  return `${color}${alpha}`;
}

/** Màu trung tính cho liên kết tự do / nút "Thêm liên kết bất kỳ" — không thuộc thương hiệu nào. */
export const CUSTOM_LINK_COLOR = '#8ca0ac';

/** Một liên kết đã lưu, đã nhận ra thuộc nền tảng nào. */
export interface ConnectedApp {
  platform: AppPlatform;
  handle: string;
  url: string;
}

/**
 * Bỏ những thứ người dùng hay dán thừa: `@` đứng đầu, khoảng trắng, và cả một
 * URL đầy đủ dán nguyên vào ô "tên tài khoản".
 */
export function normalizeHandle(platform: AppPlatform, raw: string): string {
  let handle = raw.trim();
  const prefix = platform.urlPrefix.toLowerCase();
  const lower = handle.toLowerCase();

  if (lower.startsWith(prefix)) {
    handle = handle.slice(platform.urlPrefix.length);
  } else if (lower.startsWith('http')) {
    // Dán link của nền tảng khác, hoặc link cùng nền tảng nhưng khác dạng
    // (thiếu `www.`, có `m.`…): lấy đoạn cuối làm tên.
    handle = handle.replace(/\/+$/, '').split('/').pop() ?? '';
  }

  return handle.replace(/^@+/, '').replace(/\/+$/, '').trim();
}

export function profileUrlFor(platform: AppPlatform, handle: string): string {
  return platform.urlPrefix + encodeURIComponent(handle);
}

/**
 * Nhận ra một liên kết đã lưu thuộc nền tảng nào. Null = link tự do.
 *
 * So tiền tố DÀI NHẤT trước: `https://www.threads.net/@` và
 * `https://www.tiktok.com/@` không đụng nhau, nhưng quy tắc này chặn sẵn ngày
 * có hai nền tảng mà tiền tố cái này là khúc đầu của cái kia.
 */
export function platformForUrl(rawUrl: string): AppPlatform | null {
  const url = rawUrl.toLowerCase();
  let best: AppPlatform | null = null;
  for (const platform of APP_PLATFORMS) {
    const prefix = platform.urlPrefix.toLowerCase();
    if (url.startsWith(prefix) && prefix.length > (best?.urlPrefix.length ?? 0)) {
      best = platform;
    }
  }
  return best;
}

export function platformForLink(link: ProfileLink): AppPlatform | null {
  return platformForUrl(link.url);
}

/** Đọc ngược tên tài khoản ra khỏi URL đã lưu, để hiện lại trong danh sách. */
export function connectedAppFor(link: ProfileLink): ConnectedApp | null {
  const platform = platformForLink(link);
  if (!platform) {
    return null;
  }

  const raw = link.url.slice(platform.urlPrefix.length);
  let handle = raw;
  try {
    handle = decodeURIComponent(raw);
  } catch {
    // URL được sửa tay bên ngoài và escape hỏng — cứ hiện nguyên bản còn hơn vỡ.
  }

  return { platform, handle, url: link.url };
}
