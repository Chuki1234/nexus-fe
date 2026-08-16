import { DOCUMENT, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Các theme có trong `styles.css`. `voltagent` là mặc định nên KHÔNG có thuộc
 * tính `data-theme` nào tương ứng — xem `apply()`.
 */
export type ThemeId = 'voltagent' | 'mongodb' | 'apple' | 'amethyst' | 'cyberpunk';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  /** Nguồn của bảng màu, để ghi rõ trong giao diện chọn theme. */
  source: string;
  /** Ba màu đại diện dùng vẽ ô xem trước: nền, chữ, nhấn. */
  swatch: { canvas: string; ink: string; primary: string };
}

/**
 * Màu xem trước phải viết thẳng ở đây, không dùng biến CSS: ô xem trước của
 * theme B nằm trong trang đang chạy theme A, mà `var(--color-canvas)` lúc đó trả
 * về màu của A — cả ba ô sẽ trông giống hệt nhau.
 */
export const THEMES: ThemeOption[] = [
  {
    id: 'voltagent',
    name: 'Voltagent',
    source: 'Nền gần đen, một điểm nhấn xanh lá điện',
    swatch: { canvas: '#101010', ink: '#f2f2f2', primary: '#00d992' },
  },
  {
    id: 'amethyst',
    name: 'Amethyst Violet (getdesign.md)',
    source: 'Nền tối Obsidian, sắc tím điện Violet, hiệu ứng phát sáng',
    swatch: { canvas: '#09090b', ink: '#f4f4f5', primary: '#a855f7' },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon (getdesign.md)',
    source: 'Nền tối vũ trụ, điểm nhấn Xanh Neon Cyan nổi bật',
    swatch: { canvas: '#0a0b10', ink: '#f0f4f8', primary: '#00f0ff' },
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    source: 'Nền trắng, xanh lá tươi, chữ xanh đen',
    swatch: { canvas: '#ffffff', ink: '#001e2b', primary: '#00ed64' },
  },
  {
    id: 'apple',
    name: 'Apple',
    source: 'Nền trắng ngọc, xanh dương, chữ gần đen',
    swatch: { canvas: '#ffffff', ink: '#1d1d1f', primary: '#0066cc' },
  },
];

const STORAGE_KEY = 'nexus.theme';
const DEFAULT_THEME: ThemeId = 'voltagent';

/**
 * Đọc và đổi theme của toàn ứng dụng.
 *
 * Đổi theme chỉ là đặt `data-theme` trên thẻ <html>; phần còn lại do CSS lo
 * (xem khối THEME trong styles.css). Không component nào phải biết mình đang ở
 * theme nào — nếu một component cần biết thì đó là dấu hiệu nó đang hardcode màu
 * thay vì dùng token.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly current = signal<ThemeId>(DEFAULT_THEME);
  readonly theme = this.current.asReadonly();

  readonly options = THEMES;

  constructor() {
    if (this.isBrowser) {
      this.apply(this.read());
    }
  }

  set(theme: ThemeId): void {
    this.apply(theme);

    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Chặn cookie/storage thì theme chỉ sống trong phiên này. Không đáng để
      // báo lỗi cho người dùng — trang vẫn đổi màu đúng như họ vừa chọn.
    }
  }

  private apply(theme: ThemeId): void {
    this.current.set(theme);

    const root = this.document.documentElement;
    if (theme === DEFAULT_THEME) {
      // Mặc định nằm ở `:root` trong CSS, không có khối [data-theme] riêng.
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }

  private read(): ThemeId {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return THEMES.some((option) => option.id === saved) ? (saved as ThemeId) : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  }
}
