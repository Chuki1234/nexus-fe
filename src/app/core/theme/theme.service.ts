import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'nexuscord-theme';
const PREFS_STORAGE_KEY = 'nexus_user_preferences_v2';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly modeState = signal<ThemeMode>(this.readInitialMode());

  /** Writable để ghép trực tiếp với model input của FriendsToolbar. */
  readonly mode = this.modeState;

  private readonly syncTheme = effect(() => this.applyMode(this.modeState()));

  setMode(mode: ThemeMode): void {
    this.modeState.set(mode);
  }

  toggle(): void {
    this.modeState.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
  }

  private readInitialMode(): ThemeMode {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const prefsRaw = this.document.defaultView?.localStorage.getItem(PREFS_STORAGE_KEY);
        if (prefsRaw) {
          const parsed = JSON.parse(prefsRaw);
          if (parsed.theme) {
            return parsed.theme === 'warm-light' || parsed.theme === 'light' ? 'light' : 'dark';
          }
        }
        const stored = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') {
          return stored;
        }
      } catch {
        // Private mode có thể chặn storage; theme vẫn chạy bằng DOM state.
      }
    }

    const attr = this.document.documentElement.getAttribute('data-theme');
    return attr === 'warm-light' || attr === 'light' ? 'light' : 'dark';
  }

  private applyMode(mode: ThemeMode): void {
    const currentAttr = this.document.documentElement.getAttribute('data-theme');
    if (mode === 'dark' && (currentAttr === 'midnight-dark' || currentAttr === 'nexus-dark')) {
      // Giữ nguyên biến thể dark hiện tại (AMOLED hoặc Teal), không ghi đè thành 'dark' thô
    } else {
      const dataTheme = mode === 'light' ? 'warm-light' : 'nexus-dark';
      this.document.documentElement.setAttribute('data-theme', dataTheme);
    }

    if (isPlatformBrowser(this.platformId)) {
      try {
        this.document.defaultView?.localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Không để lỗi storage làm hỏng giao diện hoặc điều hướng.
      }
    }
  }
}
