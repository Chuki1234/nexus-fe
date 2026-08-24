import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';
/** 'system' theo `prefers-color-scheme`; hai giá trị còn lại ép cứng theo `ThemeMode`. */
export type ThemeId = ThemeMode | 'system';

export interface ThemeSwatch {
  canvas: string;
  ink: string;
  primary: string;
}

export interface ThemeOption {
  id: ThemeId;
  name: string;
  /** Nguồn cảm hứng bảng màu — hiện dưới tên theme trong trang Giao diện. */
  source: string;
  swatch: ThemeSwatch;
}

/** Khớp token thật trong styles.css (`:root` và `html[data-theme='light']`). */
export const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    id: 'dark',
    name: 'Tối',
    source: 'MongoDB',
    swatch: { canvas: '#001e2b', ink: '#ffffff', primary: '#00ed64' },
  },
  {
    id: 'light',
    name: 'Sáng',
    source: 'Starbucks',
    swatch: { canvas: '#f2f0eb', ink: 'rgba(0, 0, 0, 0.87)', primary: '#006241' },
  },
  {
    id: 'system',
    name: 'Theo hệ thống',
    source: 'Tự động',
    swatch: { canvas: '#001e2b', ink: '#ffffff', primary: '#006241' },
  },
];

const STORAGE_KEY = 'nexuscord-theme';
const SYSTEM_QUERY = '(prefers-color-scheme: dark)';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Lựa chọn của người dùng — có thể là 'system'. Nguồn cho trang Giao diện. */
  private readonly idState = signal<ThemeId>(this.readInitialId());
  /** Theme THỰC SỰ đang áp — 'system' đã được quy về dark/light. Nguồn cho CSS. */
  private readonly modeState = signal<ThemeMode>(this.resolveMode(this.idState()));

  /**
   * CHỈ ĐỌC. Từng để writable cho tiện ghép hai chiều với model input của
   * FriendsToolbar, nhưng ghi thẳng vào đây thì bỏ qua `set()` — theme đổi trên
   * màn hình mà không lưu, tải lại trang là mất. Muốn đổi thì gọi `setMode()`.
   */
  readonly mode = this.modeState.asReadonly();
  readonly theme = this.idState.asReadonly();
  readonly options = THEME_OPTIONS;

  private readonly syncTheme = effect(() => this.applyMode(this.modeState()));

  constructor() {
    this.systemQuery()?.addEventListener('change', (event) => {
      if (this.idState() === 'system') {
        this.modeState.set(event.matches ? 'dark' : 'light');
      }
    });
  }

  /**
   * `matchMedia` chỉ có ở trình duyệt thật: SSR không có `defaultView`, còn môi
   * trường test (jsdom) có `defaultView` nhưng KHÔNG cài `matchMedia`. Gọi thẳng
   * ở đó là ném `TypeError` ngay trong constructor, mà service này nằm ở gốc nên
   * kéo đổ mọi component dựng dưới nó.
   */
  private systemQuery(): MediaQueryList | null {
    if (!this.isBrowser) {
      return null;
    }
    const view = this.document.defaultView;
    return typeof view?.matchMedia === 'function' ? view.matchMedia(SYSTEM_QUERY) : null;
  }

  /** Chọn theme trong trang Giao diện — chấp nhận cả 'system'. */
  set(id: ThemeId): void {
    this.idState.set(id);
    this.modeState.set(this.resolveMode(id));
    this.persistId(id);
  }

  setMode(mode: ThemeMode): void {
    this.set(mode);
  }

  toggle(): void {
    this.set(this.modeState() === 'dark' ? 'light' : 'dark');
  }

  private resolveMode(id: ThemeId): ThemeMode {
    if (id !== 'system') {
      return id;
    }
    const query = this.systemQuery();
    if (query) {
      return query.matches ? 'dark' : 'light';
    }
    return 'dark';
  }

  private readInitialId(): ThemeId {
    if (this.isBrowser) {
      try {
        const stored = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
        if (stored === 'dark' || stored === 'light' || stored === 'system') {
          return stored;
        }
      } catch {
        // Private mode có thể chặn storage; theme vẫn chạy bằng DOM state.
      }
    }

    return this.document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  private applyMode(mode: ThemeMode): void {
    this.document.documentElement.setAttribute('data-theme', mode);
  }

  private persistId(id: ThemeId): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Không để lỗi storage làm hỏng giao diện hoặc điều hướng.
    }
  }
}
