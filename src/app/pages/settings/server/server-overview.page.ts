import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MOCK_SERVER } from '../mock/settings-mock';
import { SettingsCardComponent } from '../ui/settings-card.component';
import { SettingsSectionComponent } from '../ui/settings-section.component';

/** BẢN MẪU: sửa hồ sơ máy chủ (tên, mô tả, ảnh). */
@Component({
  selector: 'app-settings-server-overview',
  imports: [SettingsSectionComponent, SettingsCardComponent, ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-settings-section
      [heading]="'settings.server.overviewTitle' | translate"
      [subheading]="'settings.server.overviewSubtitle' | translate"
      [mocked]="true"
      [mockedLabel]="'common.comingSoon' | translate"
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="space-y-4">
        <!-- Ảnh: chỉ là ô giữ chỗ. Luồng upload thật đã có ở hồ sơ người dùng
             (MediaService + Supabase Storage); máy chủ sẽ dùng lại đúng cơ chế đó. -->
        <app-settings-card [heading]="'settings.server.images' | translate" [divided]="false">
          <div class="flex flex-wrap items-start gap-6">
            <div>
              <p class="mb-2 text-body-sm-strong text-ink">
                {{ 'settings.server.icon' | translate }}
              </p>
              <div
                aria-hidden="true"
                class="flex size-20 items-center justify-center rounded-lg border border-hairline-strong bg-canvas text-display-sm text-mute"
              >
                {{ initial }}
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <p class="mb-2 text-body-sm-strong text-ink">
                {{ 'settings.server.banner' | translate }}
              </p>
              <div
                aria-hidden="true"
                class="aspect-4/1 w-full rounded-lg border border-hairline bg-canvas"
              ></div>
            </div>
          </div>
        </app-settings-card>

        <app-settings-card [heading]="'settings.server.identity' | translate" [divided]="false">
          <div>
            <label for="server-name" class="mb-2 block text-body-sm-strong text-ink">
              {{ 'settings.server.name' | translate }}
            </label>
            <input
              id="server-name"
              type="text"
              formControlName="name"
              maxlength="64"
              class="w-full rounded-lg border border-hairline-strong bg-canvas px-4 py-2.5 text-body-sm text-ink focus:border-primary"
            />
          </div>

          <div class="mt-4">
            <label for="server-description" class="mb-2 block text-body-sm-strong text-ink">
              {{ 'settings.server.description' | translate }}
            </label>
            <textarea
              id="server-description"
              rows="3"
              formControlName="description"
              maxlength="300"
              class="w-full rounded-lg border border-hairline-strong bg-canvas px-4 py-2.5 text-body-sm text-ink focus:border-primary"
            ></textarea>
          </div>
        </app-settings-card>

        <div class="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            class="rounded-lg bg-primary px-5 py-2.5 text-button font-semibold text-on-primary transition-transform hover:scale-[1.02] hover:bg-primary-soft active:scale-[0.98]"
          >
            {{ 'common.save' | translate }}
          </button>
          @if (saved()) {
            <p role="status" class="text-body-sm text-success">{{ 'common.saved' | translate }}</p>
          }
        </div>
      </form>
    </app-settings-section>
  `,
})
export class ServerOverviewPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly initial = MOCK_SERVER.name.charAt(0).toUpperCase();
  protected readonly saved = signal(false);

  protected readonly form = this.formBuilder.group({
    name: [MOCK_SERVER.name, [Validators.required, Validators.maxLength(64)]],
    description: [MOCK_SERVER.description, [Validators.maxLength(300)]],
  });

  constructor() {
    // Gỡ báo "đã lưu" ngay khi người dùng sửa tiếp, kẻo dòng đó nói về lần lưu cũ.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.saved.set(false));
  }

  protected onSubmit(): void {
    // Bản mẫu: không gửi đi đâu cả, chỉ báo cho biết nút có phản hồi.
    this.saved.set(true);
  }
}
