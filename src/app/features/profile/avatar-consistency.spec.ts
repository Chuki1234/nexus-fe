/**
 * Canh cho avatar KHÔNG lệch nhau giữa các màn hình.
 *
 * Bối cảnh: `Avatar` ở `shared/ui/` cố ý không biết Nexus là gì — nó chỉ vẽ
 * `src` được đưa vào. Dùng nó trần cho một CON NGƯỜI mà quên `src` thì chỗ đó
 * lặng lẽ rơi về chữ cái đầu, trong khi màn hình bên cạnh lại hiện ảnh thật.
 * Lỗi này đã xảy ra bốn lần ở bốn chỗ khác nhau, mỗi lần chỉ phát hiện được
 * bằng mắt thường trên ảnh chụp màn hình.
 *
 * Nên thay vì sửa từng chỗ rồi chờ chỗ tiếp theo lòi ra, test này quét toàn bộ
 * template và bắt ngay lúc chạy CI:
 *
 *   - Muốn avatar của một người có thật  → dùng `<app-profile-avatar [username]>`
 *   - Có sẵn URL ảnh trong tay           → `<app-avatar [src]>` cũng được
 *   - Avatar bịa/giữ chỗ, không có người thật đằng sau → thêm vào ALLOWLIST
 *
 * Không có `src` mà cũng không nằm trong allowlist thì test này gãy.
 */
import { describe, expect, it } from 'vitest';

/**
 * `import.meta.glob` là API của Vite, không nằm trong kiểu `ImportMeta` chuẩn
 * nên phải tự khai báo. Dùng nó thay cho `fs` vì test chạy trong jsdom: nội
 * dung file được nhúng sẵn lúc build, không cần chạm vào ổ đĩa.
 */
interface ViteImportMeta extends ImportMeta {
  glob(
    pattern: string,
    options: { eager: true; query: string; import: string },
  ): Record<string, string>;
}

const TEMPLATES = (import.meta as ViteImportMeta).glob('/src/app/**/*.html', {
  eager: true,
  query: '?raw',
  import: 'default',
});

/**
 * Những chỗ được phép dùng `<app-avatar>` trần.
 *
 * Thêm vào đây phải kèm lý do — nếu lý do là "chưa kịp làm" thì đó là chỗ cần
 * sửa chứ không phải chỗ cần miễn trừ.
 */
const ALLOWLIST: { file: string; why: string }[] = [
  {
    file: '/src/app/shared/ui/avatar/avatar.html',
    why: 'Chính là component gốc.',
  },
  {
    file: '/src/app/features/profile/components/profile-avatar/profile-avatar.html',
    why: 'Lớp bọc thêm phần tra ảnh — bên trong buộc phải gọi Avatar gốc.',
  },
  {
    file: '/src/app/features/settings/tabs/appearance-tab/appearance-tab.html',
    why: 'Có một avatar "Nexus Assistant" là nhân vật minh hoạ, không phải người thật.',
  },
  {
    file: '/src/app/features/settings/tabs/server-members-tab/server-members-tab.html',
    why: 'Danh sách thành viên máy chủ còn là dữ liệu bịa, chưa có username thật.',
  },
  {
    file: '/src/app/features/settings/tabs/server-safety-tab/server-safety-tab.html',
    why: 'Hàng chờ duyệt còn là dữ liệu bịa, chưa có username thật.',
  },
];

const ALLOWED_FILES = new Set(ALLOWLIST.map((entry) => entry.file));

/** Tách từng thẻ `<app-avatar ...>` (kể cả xuống dòng nhiều dòng). */
function avatarTags(template: string): string[] {
  return template.match(/<app-avatar[\s>][\s\S]*?\/?>/g) ?? [];
}

describe('Avatar dùng nhất quán trên toàn ứng dụng', () => {
  it('mọi <app-avatar> đều có [src], hoặc nằm trong danh sách miễn trừ có lý do', () => {
    const offenders: string[] = [];

    for (const [file, template] of Object.entries(TEMPLATES)) {
      if (ALLOWED_FILES.has(file)) {
        continue;
      }
      for (const tag of avatarTags(template)) {
        if (!tag.includes('[src]') && !tag.includes('src=')) {
          offenders.push(`${file}\n    ${tag.replace(/\s+/g, ' ').slice(0, 120)}`);
        }
      }
    }

    expect(
      offenders,
      offenders.length
        ? `\nCác chỗ dưới đây vẽ avatar của một người nhưng KHÔNG có ảnh — sẽ hiện chữ` +
            ` cái trong khi màn hình khác hiện ảnh thật.\nDùng <app-profile-avatar [username]="…">` +
            ` thay thế, hoặc truyền [src] nếu đã có URL:\n\n  ${offenders.join('\n  ')}\n`
        : '',
    ).toEqual([]);
  });

  it('danh sách miễn trừ nào cũng phải kèm lý do, và file phải còn tồn tại', () => {
    for (const { file, why } of ALLOWLIST) {
      expect(why.length, `${file} thiếu lý do miễn trừ`).toBeGreaterThan(10);
      expect(TEMPLATES[file], `${file} trong allowlist nhưng không còn tồn tại`).toBeDefined();
    }
  });
});
