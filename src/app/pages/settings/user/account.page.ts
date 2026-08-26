import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ProfileApiService } from '../../../core/profile/profile-api.service';
import { ProfileLookupService } from '../../../core/profile/profile-lookup.service';
import { OwnProfile, profileDisplayName } from '../../../core/profile/profile.models';
import { ProfileService } from '../../../core/profile/profile.service';
import { AvatarComponent } from '../../../shared/ui/avatar.component';
import { bannerFallback } from '../../../shared/ui/profile-card/banner-color';
import { SettingsCardComponent } from '../ui/settings-card.component';
import { SettingsRowComponent } from '../ui/settings-row.component';
import { SettingsSectionComponent } from '../ui/settings-section.component';

/**
 * Hiển thị thông tin cá nhân. Dữ liệu THẬT, lấy từ GET /api/profiles/me.
 *
 * Chỉ đọc: chỗ sửa nằm ở mục Hồ sơ, để một thông tin không có hai nơi chỉnh.
 */
@Component({
  selector: 'app-settings-account',
  imports: [
    SettingsSectionComponent,
    SettingsCardComponent,
    SettingsRowComponent,
    AvatarComponent,
    RouterLink,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account.page.html',
})
export class AccountPage {
  private readonly api = inject(ProfileApiService);
  private readonly auth = inject(AuthService);
  private readonly profileState = inject(ProfileService);
  private readonly lookup = inject(ProfileLookupService);
  private readonly router = inject(Router);

  protected readonly profile = signal<OwnProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly signingOut = signal(false);

  protected readonly email = computed(() => this.auth.user()?.email ?? null);

  /** Cùng dải màu mà thẻ hồ sơ và cửa sổ hồ sơ dùng, để một người luôn một màu. */
  protected readonly bannerColor = computed(() => {
    const person = this.profile();
    return person ? bannerFallback(person.username, person.accentColor) : '#1a1a1a';
  });
  protected readonly name = computed(() => {
    const profile = this.profile();
    return profile ? profileDisplayName(profile) : '';
  });

  /** `YYYY-MM-DD` → `DD/MM/YYYY`, không kéo theo cả bộ locale chỉ vì một dòng. */
  protected readonly birthdate = computed(() => {
    const raw = this.profile()?.birthdate;
    if (!raw) {
      return '';
    }
    const [year, month, day] = raw.split('-');
    return `${day}/${month}/${year}`;
  });

  protected readonly memberSince = computed(() => {
    const raw = this.profile()?.createdAt;
    if (!raw) {
      return '';
    }
    const date = new Date(raw);
    return Number.isNaN(date.getTime())
      ? ''
      : `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  });

  constructor() {
    void this.load();
  }

  protected async onSignOut(): Promise<void> {
    this.signingOut.set(true);
    try {
      await this.auth.signOut();
      this.profileState.reset();
      // Xem ghi chú ở SettingsShellPage.onSignOut: hồ sơ đã tra mang theo cờ
      // `isSelf`, đúng theo người đang xem chứ không theo người được xem.
      this.lookup.reset();
      await this.router.navigateByUrl('/login');
    } finally {
      this.signingOut.set(false);
    }
  }

  private async load(): Promise<void> {
    try {
      this.profile.set(await this.api.getOwn());
    } catch {
      this.errorMessage.set('Không đọc được hồ sơ.');
    } finally {
      this.loading.set(false);
    }
  }
}
