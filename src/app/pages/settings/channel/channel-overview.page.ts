import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { resolveChannel } from '../mock/settings-mock';
import { SettingsCardComponent } from '../ui/settings-card.component';
import { SettingsSectionComponent } from '../ui/settings-section.component';

/** Các mốc chế độ chậm, tính bằng giây. 0 là tắt. */
const SLOW_MODE_STEPS = [0, 5, 10, 30, 60, 300, 900];

/** BẢN MẪU: sửa hồ sơ kênh (tên, chủ đề, kiểu, chế độ chậm). */
@Component({
  selector: 'app-settings-channel-overview',
  imports: [SettingsSectionComponent, SettingsCardComponent, ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-settings-section
      [heading]="'settings.channel.overviewTitle' | translate"
      [subheading]="'settings.channel.overviewSubtitle' | translate"
      [mocked]="true"
      [mockedLabel]="'common.comingSoon' | translate"
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="space-y-4">
        <app-settings-card [heading]="'settings.channel.identity' | translate" [divided]="false">
          <div>
            <label for="channel-name" class="mb-2 block text-body-sm-strong text-ink">
              {{ 'settings.channel.name' | translate }}
            </label>
            <!-- Dấu # nằm ngoài ô nhập: nó là cách hiển thị của kênh văn bản chứ
                 không phải một phần tên, gõ vào sẽ thành "##chung". -->
            <div
              class="flex items-center rounded-lg border border-hairline-strong bg-canvas focus-within:border-primary"
            >
              <span aria-hidden="true" class="pl-4 text-body-sm text-mute">#</span>
              <input
                id="channel-name"
                type="text"
                formControlName="name"
                maxlength="64"
                class="w-full bg-transparent px-2 py-3 text-body-sm text-ink focus:outline-none"
              />
            </div>
          </div>

          <div class="mt-4">
            <label for="channel-topic" class="mb-2 block text-body-sm-strong text-ink">
              {{ 'settings.channel.topic' | translate }}
            </label>
            <textarea
              id="channel-topic"
              rows="2"
              formControlName="topic"
              maxlength="300"
              aria-describedby="channel-topic-hint"
              class="w-full rounded-lg border border-hairline-strong bg-canvas px-4 py-2.5 text-body-sm text-ink focus:border-primary"
            ></textarea>
            <p id="channel-topic-hint" class="mt-2 text-caption text-mute">
              {{ 'settings.channel.topicHint' | translate }}
            </p>
          </div>

        </app-settings-card>

        <app-settings-card [heading]="'settings.channel.behaviour' | translate" [divided]="false">
          <fieldset>
            <legend class="mb-2 text-body-sm-strong text-ink">
              {{ 'settings.channel.type' | translate }}
            </legend>
            <div class="flex flex-wrap gap-3">
              @for (option of typeOptions; track option.value) {
                <label class="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="channelType"
                    [value]="option.value"
                    [checked]="type() === option.value"
                    (change)="type.set(option.value)"
                    class="size-4 accent-primary"
                  />
                  <span class="text-body-sm text-ink">{{ option.labelKey | translate }}</span>
                </label>
              }
            </div>
          </fieldset>

          <div class="mt-4">
            <label for="slow-mode" class="mb-2 block text-body-sm-strong text-ink">
              {{ 'settings.channel.slowMode' | translate }}
            </label>
            <select
              id="slow-mode"
              [value]="slowMode()"
              (change)="slowMode.set(+$any($event.target).value)"
              aria-describedby="slow-mode-hint"
              class="w-full rounded-lg border border-hairline-strong bg-canvas px-4 py-2.5 text-body-sm text-ink focus:border-primary sm:w-56"
            >
              @for (seconds of slowModeSteps; track seconds) {
                <option [value]="seconds">
                  {{
                    seconds === 0 ? ('settings.channel.slowModeOff' | translate) : label(seconds)
                  }}
                </option>
              }
            </select>
            <p id="slow-mode-hint" class="mt-2 text-caption text-mute">
              {{ 'settings.channel.slowModeHint' | translate }}
            </p>
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
export class ChannelOverviewPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);

  /** `:channelId` khai báo ở route cha nên phải đọc qua `parent`. */
  private readonly channel = resolveChannel(this.route.parent?.snapshot.paramMap.get('channelId'));

  protected readonly slowModeSteps = SLOW_MODE_STEPS;
  protected readonly typeOptions = [
    { value: 'text' as const, labelKey: 'settings.channel.typeText' },
    { value: 'voice' as const, labelKey: 'settings.channel.typeVoice' },
  ];

  protected readonly type = signal<'text' | 'voice'>(this.channel.type);
  protected readonly slowMode = signal(this.channel.slowModeSeconds);
  protected readonly saved = signal(false);

  protected readonly form = this.formBuilder.group({
    name: [this.channel.name, [Validators.required, Validators.maxLength(64)]],
    topic: [this.channel.topic, [Validators.maxLength(300)]],
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.saved.set(false));
  }

  protected label(seconds: number): string {
    return seconds < 60 ? `${seconds}s` : `${seconds / 60}m`;
  }

  protected onSubmit(): void {
    this.saved.set(true);
  }
}
