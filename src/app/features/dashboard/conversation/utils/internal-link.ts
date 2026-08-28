/**
 * Nhận diện URL "nội bộ Nexus" để dựng card embed trong khung chat.
 *
 * Chỉ khớp link CÙNG ORIGIN với app đang chạy — link ngoài (facebook.com,
 * youtube.com...) luôn trả `null` và được khung chat xử lý như link thường.
 * Đây là ranh giới an toàn: một card embed chỉ vẽ ra khi chắc chắn URL trỏ về
 * chính Nexus, nên không có nguy cơ gọi API nội bộ cho một host lạ.
 *
 * Ba loại URL nội bộ hỗ trợ (khớp route thật trong `app.routes.ts`):
 *  - `origin/u/:username`        → hồ sơ người dùng
 *  - `origin/invite/:code`       → lời mời máy chủ (public preview)
 *  - `origin/channels/:serverId` → trang giới thiệu máy chủ (đúng MỘT đoạn sau
 *                                  `channels`, và phải là uuid — nên
 *                                  `/channels/:serverId/:channelId` hay
 *                                  `/channels/@me` đều KHÔNG khớp)
 */

export type InternalLinkTarget =
  | { kind: 'profile'; username: string }
  | { kind: 'server-invite'; code: string }
  | { kind: 'server'; serverId: string };

/** Username: 3–32 ký tự, giống ràng buộc mention trong `message-content-parser`. */
const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,32}$/;

/** Mã mời: 4–128 ký tự chữ/số/`-`/`_` — khớp `getInvitePreview` phía backend. */
const INVITE_CODE_REGEX = /^[a-zA-Z0-9_-]{4,128}$/;

/** `servers.id` là `uuid` trong schema — chặn `@me` và các đoạn không phải server. */
const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * `location.origin` có thể không tồn tại ở môi trường không phải trình duyệt
 * (SSR/test). Không giả định global — đọc phòng thủ, thiếu thì trả `null`.
 */
function currentBrowserOrigin(): string | null {
  const loc = (globalThis as { location?: { origin?: string } }).location;
  return loc?.origin ?? null;
}

/**
 * Phân giải một URL thành mục tiêu nội bộ, hoặc `null` nếu không phải link nội
 * bộ Nexus hợp lệ.
 *
 * @param rawUrl URL tuyệt đối lấy từ nội dung tin nhắn.
 * @param origin Origin để so khớp; mặc định lấy `location.origin`. Cho phép
 *   truyền tay để test không phụ thuộc môi trường trình duyệt.
 */
export function resolveInternalLink(
  rawUrl: string | null | undefined,
  origin?: string | null,
): InternalLinkTarget | null {
  if (!rawUrl) {
    return null;
  }

  const effectiveOrigin = origin ?? currentBrowserOrigin();
  if (!effectiveOrigin) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  // Chỉ nhận link http/https cùng origin — bỏ mọi scheme/host khác.
  if (url.origin !== effectiveOrigin) {
    return null;
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 2) {
    return null;
  }

  const [head, value] = segments;

  switch (head) {
    case 'u':
      return USERNAME_REGEX.test(value) ? { kind: 'profile', username: value } : null;
    case 'invite':
      return INVITE_CODE_REGEX.test(value) ? { kind: 'server-invite', code: value } : null;
    case 'channels':
      return UUID_REGEX.test(value) ? { kind: 'server', serverId: value } : null;
    default:
      return null;
  }
}
