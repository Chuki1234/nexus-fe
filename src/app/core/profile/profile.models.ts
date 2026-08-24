/**
 * Hình dạng dữ liệu hồ sơ — khớp với `ProfilesService` bên nexus-be.
 * Đổi bên nào thì sửa cả hai; backend là bên quyết định.
 */

export interface ProfileLink {
  label: string;
  url: string;
}

/** Hồ sơ nhìn thấy được của bất kỳ ai đã đăng nhập. */
export interface Profile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  statusMessage: string | null;
  bio: string | null;
  location: string | null;
  links: ProfileLink[];
  /** Màu accent tự chọn. `null` = tự động (băm từ username) — xem `bannerFallback()`. */
  accentColor: string | null;
  /** ISO timestamp. */
  createdAt: string;
  /** True khi đây là hồ sơ của chính người đang xem. */
  isSelf: boolean;
}

/** Hồ sơ của chính mình — GET /api/profiles/me trả thêm trường riêng tư. */
export interface OwnProfile extends Profile {
  /** `YYYY-MM-DD`. Chỉ có ở hồ sơ của chính mình. */
  birthdate: string;
}

/** Một dòng trong kết quả tìm kiếm. */
export interface ProfileSummary {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/** Thân request của PATCH /api/profiles/me. Bỏ trường đi = giữ nguyên, `null` = xoá. */
export interface UpdateProfilePayload {
  displayName?: string | null;
  statusMessage?: string | null;
  bio?: string | null;
  location?: string | null;
  /** `null` = tự động theo username. Chỉ nhận giá trị trong `BANNER_FALLBACKS`. */
  accentColor?: string | null;
  /** Gửi lên là thay cả danh sách. */
  links?: ProfileLink[];
}

// Giới hạn dưới đây phải khớp `UpdateProfileDto` (nexus-be) và ràng buộc CHECK
// trong migration profile_feature. Frontend chặn trước cho người dùng thấy lỗi
// ngay, backend mới là nơi chặn thật.
export const DISPLAY_NAME_MAX = 32;
export const STATUS_MESSAGE_MAX = 120;
export const BIO_MAX = 300;
export const LOCATION_MAX = 64;
export const LINK_LABEL_MAX = 32;
export const LINK_URL_MAX = 2048;
export const MAX_PROFILE_LINKS = 5;

/** Chỉ https — khớp regex của `ProfileLinkDto`. */
export const LINK_URL_PATTERN = /^https:\/\/[^\s]+$/;

/** Ảnh người dùng chọn, trước khi backend resize. Khớp `MAX_UPLOAD_BYTES`. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

/** Giá trị cho thuộc tính `accept` của <input type="file">. */
export const IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(',');

/** Tên để hiển thị: ưu tiên tên tự đặt, không có thì dùng username. */
export function profileDisplayName(profile: {
  displayName: string | null;
  username: string;
}): string {
  return profile.displayName?.trim() || profile.username;
}
