import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { ProfilesApiService } from '../../../core/api/profiles-api.service';
import { formatApiError } from '../../../core/api/servers-api.service';
import type { PublicProfile } from '../../../../shared';
import { ProfileCard } from '../components/profile-card/profile-card';
import { ProfileDialogService } from '../profile-dialog.service';

/**
 * Trang hồ sơ công khai tại `/u/:username`.
 *
 * Tới được bằng link chia sẻ hoặc ô tìm kiếm. Khác cửa sổ hồ sơ nổi ở chỗ có
 * địa chỉ riêng để gửi cho người khác — nội dung bên trong thì dùng chung đúng
 * một `ProfileCard` để hai chỗ không trôi khỏi nhau.
 */
@Component({
  selector: 'app-profile-view',
  imports: [ProfileCard, MatIconModule, MatTooltipModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './view.html',
  styleUrl: './view.css',
})
export class ProfileViewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ProfilesApiService);
  private readonly profileDialog = inject(ProfileDialogService);

  protected readonly profile = signal<PublicProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly copied = signal(false);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('username') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((username) => void this.load(username));
  }

  /**
   * Xem thử hồ sơ của mình đúng như người khác nhìn thấy nó — cùng cửa sổ mà
   * mọi avatar trong ứng dụng mở ra.
   */
  protected openAsDialog(): void {
    const person = this.profile();
    if (person) {
      this.profileDialog.open(person.username, person);
    }
  }

  protected async copyLink(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  private async load(username: string): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      this.profile.set(await this.api.getByUsername(username));
    } catch (error) {
      this.profile.set(null);
      this.errorMessage.set(formatApiError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
