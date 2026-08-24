#!/usr/bin/env node
/**
 * Canh cho `<mat-icon>` KHÔNG bao giờ trỏ vào một glyph không tồn tại.
 *
 * Dự án host font `material-icons` (bộ Material Icons CỔ ĐIỂN), không phải
 * Material *Symbols* — hai bộ trông giống nhau về tên nhưng không cùng danh
 * sách glyph. Gõ nhầm sang tên icon chỉ có ở Symbols (`right_panel_open`,
 * `progress_activity`, `search_activity`…) không gây lỗi build lẫn lỗi runtime:
 * `<mat-icon>` chỉ đơn giản không có glyph nào để vẽ, ligature hiện ra là một
 * ô trống trên nền màu — y hệt nút "mất icon" chỉ phát hiện được bằng mắt qua
 * ảnh chụp màn hình. Bốn chỗ trong dự án từng dính đúng lỗi này cùng lúc.
 *
 * Chạy ngoài vitest chứ không phải một `*.spec.ts`: bộ test của dự án chạy
 * trong môi trường trình duyệt giả lập (Vite dev server phục vụ qua HTTP),
 * `import.meta.url` ở đó không phải `file://` nên không đọc được
 * `node_modules` bằng `fs`. Script Node thuần chạy ngoài sandbox đó không bị
 * giới hạn này — đúng lý do `check:shared` cũng là một script riêng chứ không
 * phải một spec.
 *
 * Đọc thẳng danh sách glyph hợp lệ từ chính gói `material-icons` đang cài, nên
 * khi nào nâng cấp gói lên bộ Symbols thật thì script tự nới theo, không cần
 * sửa tay.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const codepoints = readFileSync(
  join(repoRoot, 'node_modules/material-icons/css/_codepoints.scss'),
  'utf8',
);
const validIcons = new Set(
  [...codepoints.matchAll(/"([a-z0-9_]+)":\s*[0-9a-f]+/g)].map((m) => m[1]),
);

if (validIcons.size < 1000) {
  console.error(
    `check:icons — chỉ đọc được ${validIcons.size} glyph từ material-icons, có gì đó sai ` +
      'đường dẫn hoặc định dạng file _codepoints.scss đã đổi.',
  );
  process.exit(1);
}

/** Mọi file `.html`/`.ts` dưới `src/app`, trừ `*.spec.ts`. */
function listSourceFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = join(root, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    if (entry.name.endsWith('.spec.ts')) return [];
    if (entry.name.endsWith('.html') || entry.name.endsWith('.ts')) return [full];
    return [];
  });
}

/**
 * Tên icon TĨNH trong một `<mat-icon>`: hoặc chữ trần (`<mat-icon>info</mat-icon>`),
 * hoặc HAI NHÁNH của một ternary (`{{ cond ? 'a' : 'b' }}`), hoặc field cấu
 * hình dạng `icon: 'ten_icon'` trong mảng dữ liệu mock.
 *
 * Ternary chỉ lấy chuỗi sau dấu `?` và sau dấu `:` CUỐI CÙNG — không phải mọi
 * chuỗi nháy đơn trong biểu thức. Điều kiện phía trước `?` có thể tự nó cũng so
 * sánh với một chuỗi (`theme() === 'dark' ? 'light_mode' : 'dark_mode'`), lấy
 * hết thì "dark" bị hiểu nhầm thành tên icon.
 *
 * Cố tình BỎ QUA icon lấy từ thuộc tính động (`{{ item.icon }}`) — không có
 * cách nào tĩnh xác định được giá trị đó; kiểm tra kiểu đó phải làm ở nơi
 * khai báo dữ liệu, không phải ở đây.
 */
function staticIconNames(content) {
  const found = [];
  for (const m of content.matchAll(/<mat-icon[^>]*>([\s\S]*?)<\/mat-icon>/g)) {
    const inner = m[1].trim();
    const ternary = /^\{\{\s*.+?\?\s*'([a-z0-9_]+)'\s*:\s*'([a-z0-9_]+)'\s*\}\}$/.exec(inner);
    if (ternary) {
      found.push({ name: ternary[1], index: m.index });
      found.push({ name: ternary[2], index: m.index });
    } else if (/^[a-z0-9_]+$/.test(inner)) {
      found.push({ name: inner, index: m.index });
    }
  }
  for (const m of content.matchAll(/\bicon:\s*'([a-z0-9_]+)'/g)) {
    found.push({ name: m[1], index: m.index });
  }
  return found;
}

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}

const offenders = [];
for (const file of listSourceFiles(join(repoRoot, 'src/app'))) {
  const content = readFileSync(file, 'utf8');
  for (const { name, index } of staticIconNames(content)) {
    if (!validIcons.has(name)) {
      const relPath = file.slice(repoRoot.length + 1).replace(/\\/g, '/');
      offenders.push(`${relPath}:${lineOf(content, index)}  "${name}"`);
    }
  }
}

if (offenders.length > 0) {
  console.error(
    `\ncheck:icons — ${offenders.length} icon không tồn tại trong bộ "material-icons" đang ` +
      'host. Nút sẽ hiện trống, không phải lỗi build:\n',
  );
  for (const offender of offenders) {
    console.error(`  • ${offender}`);
  }
  console.error(
    '\nĐổi sang tên có thật trong node_modules/material-icons/css/_codepoints.scss.\n',
  );
  process.exit(1);
}

console.log(`check:icons — sạch (${validIcons.size} glyph hợp lệ, không icon nào sai tên).`);
