import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { InlineTranslateLoader } from './core/i18n/language.service';
import { DEFAULT_LANGUAGE } from './core/i18n/translations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    // withFetch(): bắt buộc khi chạy SSR, và cho phép chuyển tiếp request sang
    // server render mà không cần XHR polyfill.
    provideHttpClient(withFetch()),
    // Từ điển nằm sẵn trong bundle nên `lang` đặt được ngay từ đây; LanguageService
    // sẽ đổi lại theo lựa chọn đã lưu của người dùng khi chạy ở trình duyệt.
    provideTranslateService({ lang: DEFAULT_LANGUAGE, fallbackLang: DEFAULT_LANGUAGE }),
    provideTranslateLoader(InlineTranslateLoader),
  ],
};
