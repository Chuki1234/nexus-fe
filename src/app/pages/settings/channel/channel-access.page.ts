import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ToggleSwitchComponent } from '../../../shared/ui/toggle-switch.component';
import { MOCK_ROLES, resolveChannel } from '../mock/settings-mock';
import { SettingsCardComponent } from '../ui/settings-card.component';
import { SettingsRowComponent } from '../ui/settings-row.component';
import { SettingsSectionComponent } from '../ui/settings-section.component';

/**
 * BẢN MẪU: kênh riêng và danh sách vai trò thấy được kênh.
 *
 * Danh sách vai trò chỉ hiện khi kênh ở chế độ riêng — kênh công khai thì ai
 * cũng thấy, bày ra một danh sách không có tác dụng chỉ gây hiểu nhầm.
 */
@Component({
  selector: 'app-settings-channel-access',
  imports: [SettingsSectionComponent, SettingsCardComponent, SettingsRowComponent, ToggleSwitchComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-settings-section
      [heading]="'settings.channel.accessTitle' | translate"
      [subheading]="'settings.channel.accessSubtitle' | translate"
      [mocked]="true"
      [mockedLabel]="'common.comingSoon' | translate"
    >
      <div class="space-y-4">
        <app-settings-card [heading]="'settings.channel.accessTitle' | translate">
          <app-settings-row
            [label]="'settings.channel.private' | translate"
            [hint]="'settings.channel.privateHint' | translate"
            labelId="private-label"
            hintId="private-hint"
          >
            <app-toggle-switch
              [(checked)]="isPrivate"
              labelId="private-label"
              describedBy="private-hint"
            />
          </app-settings-row>

          <app-settings-row
            [label]="'settings.channel.syncParent' | translate"
            [hint]="'settings.channel.syncParentHint' | translate"
            labelId="sync-label"
            hintId="sync-hint"
          >
            <app-toggle-switch [(checked)]="sync" labelId="sync-label" describedBy="sync-hint" />
          </app-settings-row>
        </app-settings-card>

      @if (isPrivate()) {
        <app-settings-card [heading]="'settings.roles.title' | translate" [divided]="false">
          <fieldset>
            <legend class="sr-only">{{ 'settings.roles.title' | translate }}</legend>

          <ul class="flex flex-col gap-3">
            @for (role of roles; track role.id) {
              <li class="flex items-center gap-3">
                <input
                  type="checkbox"
                  [id]="'role-' + role.id"
                  [checked]="allowed().has(role.id)"
                  (change)="toggle(role.id)"
                  class="size-4 shrink-0 accent-primary"
                />
                <span
                  aria-hidden="true"
                  class="size-3 shrink-0 rounded-full"
                  [style.background-color]="role.color"
                ></span>
                <label [for]="'role-' + role.id" class="min-w-0 flex-1 cursor-pointer">
                  <span class="block truncate text-body-sm text-ink">{{ role.name }}</span>
                  <span class="block text-caption text-mute">
                    {{ role.memberCount }} {{ 'settings.roles.members' | translate }}
                  </span>
                </label>
              </li>
            }
          </ul>
          </fieldset>
        </app-settings-card>
      }
      </div>
    </app-settings-section>
  `,
})
export class ChannelAccessPage {
  private readonly route = inject(ActivatedRoute);

  /**
   * `:channelId` nằm ở route CHA (`channel/:channelId`), nên phải leo lên
   * `parent` — snapshot của route con không thấy param của cha.
   */
  private readonly channel = resolveChannel(this.route.parent?.snapshot.paramMap.get('channelId'));

  protected readonly roles = MOCK_ROLES;
  protected readonly isPrivate = signal(this.channel.isPrivate);
  protected readonly sync = signal(this.channel.syncWithCategory);

  private readonly allowedIds = signal<string[]>([...this.channel.allowedRoleIds]);
  protected readonly allowed = computed(() => new Set(this.allowedIds()));

  protected toggle(roleId: string): void {
    this.allowedIds.update((current) =>
      current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId],
    );
  }
}
