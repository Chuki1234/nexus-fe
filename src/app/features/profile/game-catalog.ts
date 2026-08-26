import {
  GAME_KIND_LABELS,
  gameLimitFor,
  type ProfileGameKind,
} from '../../../shared';

/**
 * Hằng số và hàm thuần cho widget trò chơi — KHÔNG import Angular.
 *
 * Tách khỏi service vì cả ba nơi cùng cần: khối sửa trong Cài đặt, hộp thoại
 * chọn widget, và bản chỉ đọc ở `/u/:username`. Nhét vào service thì hộp thoại
 * phải inject cả service chỉ để đọc một danh mục tĩnh.
 *
 * Cùng khuôn với `connected-apps.ts` của feature "Ứng dụng đã kết nối".
 */

/** Nhóm bên trái trong hộp thoại "Thêm Widget Hồ Sơ". */
export type WidgetGroupId = 'interests' | 'game-stats';

export const WIDGET_GROUPS: ReadonlyArray<{ id: WidgetGroupId; label: string }> = [
  { id: 'interests', label: 'Sở thích' },
  { id: 'game-stats', label: 'Thống kê trò chơi' },
];

/** Một loại widget chọn được trong hộp thoại. */
export interface WidgetType {
  kind: ProfileGameKind;
  group: WidgetGroupId;
  label: string;
  /** Tên Discord dùng — giữ lại để đối chiếu khi so với bản gốc. */
  englishLabel: string;
  description: string;
  /** Tên icon Material Symbols. */
  icon: string;
}

export const WIDGET_TYPES: readonly WidgetType[] = [
  {
    kind: 'favorite',
    group: 'interests',
    label: GAME_KIND_LABELS.favorite,
    englishLabel: 'Favorite Game',
    icon: 'star',
    description: 'Một tựa game nổi bật nhất của bạn.',
  },
  {
    kind: 'like',
    group: 'interests',
    label: GAME_KIND_LABELS.like,
    englishLabel: 'Games I Like',
    icon: 'grid_view',
    description: `Lưới ảnh bìa, tối đa ${gameLimitFor('like')} trò chơi.`,
  },
  {
    kind: 'wishlist',
    group: 'interests',
    label: GAME_KIND_LABELS.wishlist,
    englishLabel: 'Want to Play',
    icon: 'bookmark',
    description: `Danh sách muốn chơi, tối đa ${gameLimitFor('wishlist')} trò chơi.`,
  },
  {
    kind: 'rotation',
    group: 'game-stats',
    label: GAME_KIND_LABELS.rotation,
    englishLabel: 'Games in Rotation',
    icon: 'autorenew',
    description: `Đang chơi gần đây, tối đa ${gameLimitFor('rotation')} trò chơi, có nhãn.`,
  },
];

/**
 * Bỏ dấu tiếng Việt, hạ chữ thường, gom ký tự lạ thành gạch ngang.
 *
 * Dùng để dựng `id` ổn định: cùng một tên game gõ hoa hay thường, có dấu hay
 * không, đều ra một khoá — nhờ vậy phát hiện được trùng trước khi gửi lên.
 */
export function gameSlug(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

/**
 * Khoá của một mục. Có cả `kind` vì cùng một game được phép nằm ở hai widget
 * khác nhau (vừa đang chơi vừa yêu thích) — chỉ dùng slug thì hai mục đó trùng
 * khoá và Angular `@for` ném lỗi runtime.
 */
export function gameIdFor(kind: ProfileGameKind, title: string): string {
  return `${kind}:${gameSlug(title)}`;
}

/** Ảnh thay thế khi chưa đặt ảnh bìa hoặc link ảnh chết. */
export function coverFallbackFor(title: string): string {
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(title)}`;
}
