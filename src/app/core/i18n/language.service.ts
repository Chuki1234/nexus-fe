import { DOCUMENT, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateLoader, TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import type { TranslationObject } from '@ngx-translate/core';
import { DEFAULT_LANGUAGE, LANGUAGES, LanguageCode, TRANSLATIONS } from './translations';

/**
 * Đưa từ điển đã nhúng sẵn cho ngx-translate.
 *
 * `of(...)` phát ngay và hoàn tất, nên chuỗi có mặt trong lần render đầu tiên —
 * không có khoảnh khắc hiện khoá thô kiểu `settings.title` như khi tải qua HTTP.
 */
@Injectable()
export class InlineTranslateLoader extends TranslateLoader {
  getTranslation(lang: string): Observable<TranslationObject> {
    const dictionary = TRANSLATIONS[lang as LanguageCode] ?? TRANSLATIONS[DEFAULT_LANGUAGE];
    return of(dictionary as unknown as TranslationObject);
  }
}

const STORAGE_KEY = 'nexus.language';

/**
 * Đọc và đổi ngôn ngữ giao diện.
 *
 * Bọc quanh `TranslateService` để phần còn lại của ứng dụng không phải tự lo
 * chuyện ghi nhớ lựa chọn và cập nhật thuộc tính `lang` của thẻ <html> — thuộc
 * tính đó là thứ trình đọc màn hình dựa vào để chọn đúng giọng đọc.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly current = signal<LanguageCode>(DEFAULT_LANGUAGE);
  readonly language = this.current.asReadonly();

  readonly options = LANGUAGES;

  constructor() {
    this.translate.addLangs(LANGUAGES.map((option) => option.code));
    this.translate.setFallbackLang(DEFAULT_LANGUAGE);
    this.apply(this.isBrowser ? this.read() : DEFAULT_LANGUAGE);
  }

  set(code: LanguageCode): void {
    this.apply(code);

    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Storage bị chặn: ngôn ngữ chỉ sống trong phiên này, không đáng báo lỗi.
    }
  }

  private apply(code: LanguageCode): void {
    this.current.set(code);
    this.translate.use(code);
    this.document.documentElement.lang = code;
  }

  private read(): LanguageCode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (LANGUAGES.some((option) => option.code === saved)) {
        return saved as LanguageCode;
      }
    } catch {
      // Bỏ qua, rơi xuống bước đoán theo ngôn ngữ trình duyệt.
    }

    // Chưa chọn bao giờ thì đoán theo trình duyệt, mặc định là tiếng Việt.
    const preferred = this.document.defaultView?.navigator.language ?? '';
    return preferred.startsWith('en') ? 'en' : DEFAULT_LANGUAGE;
  }
}
