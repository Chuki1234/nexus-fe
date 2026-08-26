import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ToggleSwitchComponent } from '../../../shared/ui/toggle-switch.component';
import { MOCK_SERVER } from '../mock/settings-mock';
import { SettingsCardComponent } from '../ui/settings-card.component';
import { SettingsRowComponent } from '../ui/settings-row.component';
import { SettingsSectionComponent } from '../ui/settings-section.component';

/**
 * BẢN MẪU: ai vào được máy chủ.
 *
 * Đây là tầng "cửa vào", khác với Phân quyền (vào rồi thì làm được gì). Tách hai
 * mục vì trả lời hai câu hỏi khác nhau và thường do hai người khác nhau chỉnh.
 */
@Component({
  selector: 'app-settings-server-access',
  imports: [
    SettingsSectionComponent,
    SettingsCardComponent,
    SettingsRowComponent,
    ToggleSwitchComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-settings-section
      [heading]="'settings.server.accessTitle' | translate"
      [subheading]="'settings.server.accessSubtitle' | translate"
      [mocked]="true"
      [mockedLabel]="'common.comingSoon' | translate"
    >
      <div class="space-y-4">
        <!-- Radio giữ nguyên trong fieldset/legend chứ không nhét vào một hàng
             thiết lập: đây là MỘT lựa chọn loại trừ nhau, cần được nhóm lại để
             trình đọc màn hình đọc "chế độ hiển thị, 1 trong 2". -->
        <app-settings-card [heading]="'settings.server.visibility' | translate">
          <fieldset class="py-3.5">
            <legend class="sr-only">{{ 'settings.server.visibility' | translate }}</legend>

            <div class="flex flex-col gap-3">
              @for (option of visibilityOptions; track option.value) {
                <label class="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="visibility"
                    [value]="option.value"
                    [checked]="visibility() === option.value"
                    (change)="visibility.set(option.value)"
                    class="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <span class="text-body-sm text-ink">{{ option.labelKey | translate }}</span>
                </label>
              }
            </div>
          </fieldset>
        </app-settings-card>

        <app-settings-card [heading]="'settings.server.joinRules' | translate">
          <app-settings-row
            [label]="'settings.server.approval' | translate"
            [hint]="'settings.server.approvalHint' | translate"
            labelId="approval-label"
            hintId="approval-hint"
          >
            <app-toggle-switch
              [(checked)]="requireApproval"
              labelId="approval-label"
              describedBy="approval-hint"
            />
          </app-settings-row>

          <app-settings-row
            [label]="'settings.server.verifiedEmail' | translate"
            [hint]="'settings.server.verifiedEmailHint' | translate"
            labelId="verified-label"
            hintId="verified-hint"
          >
            <app-toggle-switch
              [(checked)]="requireVerifiedEmail"
              labelId="verified-label"
              describedBy="verified-hint"
            />
          </app-settings-row>
        </app-settings-card>
      </div>
    </app-settings-section>
  `,
})
export class ServerAccessPage {
  protected readonly visibilityOptions = [
    { value: 'private' as const, labelKey: 'settings.server.visibilityPrivate' },
    { value: 'public' as const, labelKey: 'settings.server.visibilityPublic' },
  ];

  protected readonly visibility = signal<'private' | 'public'>(MOCK_SERVER.visibility);
  protected readonly requireApproval = signal(MOCK_SERVER.requireApproval);
  protected readonly requireVerifiedEmail = signal(MOCK_SERVER.requireVerifiedEmail);
}
