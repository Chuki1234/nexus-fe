import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ToggleSwitchComponent } from '../../../shared/ui/toggle-switch.component';
import { SettingsSectionComponent } from '../ui/settings-section.component';

interface NotificationRow {
  id: string;
  labelKey: string;
  hintKey: string;
  value: ReturnType<typeof signal<boolean>>;
}

/**
 * BẢN MẪU. Chưa có bảng lưu tuỳ chọn thông báo, nên công tắc chỉ sống trong bộ
 * nhớ của trang: rời đi rồi quay lại là về mặc định.
 */
@Component({
  selector: 'app-settings-notifications',
  imports: [SettingsSectionComponent, ToggleSwitchComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-settings-section
      [heading]="'settings.notifications.title' | translate"
      [subheading]="'settings.notifications.subtitle' | translate"
      [mocked]="true"
      [mockedLabel]="'common.comingSoon' | translate"
    >
      <ul class="divide-y divide-hairline rounded-md border border-hairline">
        @for (row of rows; track row.id) {
          <li class="flex items-start gap-4 p-4">
            <span class="min-w-0 flex-1">
              <!-- id ở đây là thứ toggle trỏ tới qua aria-labelledby. -->
              <span [id]="row.id + '-label'" class="block text-body-sm-strong text-ink">
                {{ row.labelKey | translate }}
              </span>
              <span [id]="row.id + '-hint'" class="mt-1 block text-caption text-mute">
                {{ row.hintKey | translate }}
              </span>
            </span>

            <app-toggle-switch
              [(checked)]="row.value"
              [labelId]="row.id + '-label'"
              [describedBy]="row.id + '-hint'"
            />
          </li>
        }
      </ul>
    </app-settings-section>
  `,
})
export class NotificationsPage {
  protected readonly rows: NotificationRow[] = [
    {
      id: 'notif-dm',
      labelKey: 'settings.notifications.directMessages',
      hintKey: 'settings.notifications.directMessagesHint',
      value: signal(true),
    },
    {
      id: 'notif-mentions',
      labelKey: 'settings.notifications.mentions',
      hintKey: 'settings.notifications.mentionsHint',
      value: signal(true),
    },
    {
      id: 'notif-server',
      labelKey: 'settings.notifications.serverActivity',
      hintKey: 'settings.notifications.serverActivityHint',
      value: signal(false),
    },
    {
      id: 'notif-friends',
      labelKey: 'settings.notifications.friendRequests',
      hintKey: 'settings.notifications.friendRequestsHint',
      value: signal(true),
    },
    {
      id: 'notif-email',
      labelKey: 'settings.notifications.email',
      hintKey: 'settings.notifications.emailHint',
      value: signal(false),
    },
    {
      id: 'notif-sounds',
      labelKey: 'settings.notifications.sounds',
      hintKey: 'settings.notifications.soundsHint',
      value: signal(true),
    },
  ];
}
