import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeId, ThemeService } from '../../../core/theme/theme.service';
import { SettingsSectionComponent } from '../ui/settings-section.component';

/**
 * Chọn theme. Đây là mục CHẠY THẬT, không phải bản mẫu: bấm là đổi ngay và lựa
 * chọn được ghi nhớ cho lần mở sau.
 */
@Component({
  selector: 'app-settings-appearance',
  imports: [SettingsSectionComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-settings-section
      [heading]="'settings.appearance.title' | translate"
      [subheading]="'settings.appearance.subtitle' | translate"
    >
      <!-- radiogroup chứ không phải danh sách nút: đây là chọn MỘT trong nhiều,
           bàn phím phải đi giữa các lựa chọn bằng phím mũi tên. -->
      <div role="radiogroup" [attr.aria-label]="'settings.appearance.title' | translate">
        <div class="grid gap-4 sm:grid-cols-3">
          @for (option of themes; track option.id) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="theme() === option.id"
              [attr.tabindex]="theme() === option.id ? 0 : -1"
              (click)="select(option.id)"
              (keydown.arrowright)="move(1)"
              (keydown.arrowdown)="move(1)"
              (keydown.arrowleft)="move(-1)"
              (keydown.arrowup)="move(-1)"
              class="rounded-md border p-4 text-left hover:border-primary"
              [class.border-primary]="theme() === option.id"
              [class.border-hairline-strong]="theme() !== option.id"
            >
              <!-- Ô xem trước tô bằng mã màu thật của theme đó, không dùng token:
                   token luôn trả về màu của theme ĐANG bật, ba ô sẽ giống hệt nhau. -->
              <span
                aria-hidden="true"
                class="flex h-20 w-full items-center justify-center gap-2 rounded-sm border border-hairline"
                [style.background-color]="option.swatch.canvas"
              >
                <span class="text-display-sm" [style.color]="option.swatch.ink">Aa</span>
                <span
                  class="size-6 rounded-full"
                  [style.background-color]="option.swatch.primary"
                ></span>
              </span>

              <span class="mt-3 flex items-center gap-2">
                <span class="text-body-md-strong text-ink">{{ option.name }}</span>
                @if (theme() === option.id) {
                  <span
                    class="rounded-pill border border-primary px-2 py-0.5 text-caption text-ink"
                  >
                    {{ 'settings.appearance.current' | translate }}
                  </span>
                }
              </span>
              <span class="mt-1 block text-caption text-mute">{{ option.source }}</span>
            </button>
          }
        </div>
      </div>
    </app-settings-section>
  `,
})
export class AppearancePage {
  private readonly themeService = inject(ThemeService);

  protected readonly themes = this.themeService.options;
  protected readonly theme = this.themeService.theme;

  protected select(id: ThemeId): void {
    this.themeService.set(id);
  }

  /** Phím mũi tên đổi luôn lựa chọn, đúng hành vi radiogroup của WAI-ARIA. */
  protected move(step: number): void {
    const index = this.themes.findIndex((option) => option.id === this.theme());
    const next = (index + step + this.themes.length) % this.themes.length;
    this.themeService.set(this.themes[next].id);
  }
}
