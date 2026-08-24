import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { LanguageCode } from '../../../core/i18n/translations';
import { SettingsSectionComponent } from '../ui/settings-section.component';

/**
 * Đổi ngôn ngữ giao diện. Mục CHẠY THẬT: chuỗi đổi ngay, không phải tải lại trang.
 */
@Component({
  selector: 'app-settings-language',
  imports: [SettingsSectionComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-settings-section
      [heading]="'settings.language.title' | translate"
      [subheading]="'settings.language.subtitle' | translate"
    >
      <div role="radiogroup" [attr.aria-label]="'settings.language.title' | translate">
        <ul class="flex flex-col gap-3">
          @for (option of languages; track option.code) {
            <li>
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="language() === option.code"
                [attr.tabindex]="language() === option.code ? 0 : -1"
                (click)="select(option.code)"
                (keydown.arrowdown)="move(1)"
                (keydown.arrowup)="move(-1)"
                class="flex w-full items-center gap-3 rounded-md border p-4 text-left hover:border-primary"
                [class.border-primary]="language() === option.code"
                [class.border-hairline-strong]="language() !== option.code"
              >
                <span class="min-w-0 flex-1">
                  <span class="block text-body-md-strong text-ink">{{ option.name }}</span>
                  <!-- Tên tiếng Anh giúp người không đọc được ngôn ngữ đang bật vẫn
                       tìm ra dòng của mình để đổi ngược lại. -->
                  <span class="block text-caption text-mute">{{ option.englishName }}</span>
                </span>

                @if (language() === option.code) {
                  <span
                    class="rounded-pill border border-primary px-2 py-0.5 text-caption text-ink"
                  >
                    {{ 'settings.language.current' | translate }}
                  </span>
                }
              </button>
            </li>
          }
        </ul>
      </div>
    </app-settings-section>
  `,
})
export class LanguagePage {
  private readonly languageService = inject(LanguageService);

  protected readonly languages = this.languageService.options;
  protected readonly language = this.languageService.language;

  protected select(code: LanguageCode): void {
    this.languageService.set(code);
  }

  protected move(step: number): void {
    const index = this.languages.findIndex((option) => option.code === this.language());
    const next = (index + step + this.languages.length) % this.languages.length;
    this.languageService.set(this.languages[next].code);
  }
}
