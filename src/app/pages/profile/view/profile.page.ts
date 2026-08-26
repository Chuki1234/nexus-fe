import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { distinctUntilChanged, map } from 'rxjs';
import {
  ProfileApiService,
  toProfileErrorMessage,
} from '../../../core/profile/profile-api.service';
import { ProfileLookupService } from '../../../core/profile/profile-lookup.service';
import { Profile, profileDisplayName } from '../../../core/profile/profile.models';
import { profileAsMember } from '../../channels/mock/chat-mock';
import { AvatarComponent } from '../../../shared/ui/avatar.component';
import { PresenceDotComponent } from '../../../shared/ui/presence-dot.component';
import { ProfileSearchComponent } from '../../../shared/ui/profile-search.component';
import { bannerFallback } from '../../../shared/ui/profile-card/banner-color';
import { EmptyFieldComponent } from '../../../shared/ui/profile-card/empty-field.component';
import { detectLinkIcon, LINK_ICONS } from '../../../shared/ui/profile-card/link-icon';
import { ProfileCardService } from '../../../shared/ui/profile-card/profile-card.service';
import { ProfileModalComponent } from '../../../shared/ui/profile-card/profile-modal.component';

/**
 * Trang hồ sơ tại `/u/:username`.
 *
 * Cố tình dựng CÙNG một hình dạng với `ProfileModalComponent` (banner làm nền,
 * avatar đè lên góc dưới trái, hai cột danh tính/nội dung) — khung ngoài khác
 * nhau (trang có thanh điều hướng riêng, cửa sổ có lớp phủ + nút đóng) nhưng
 * ruột phải giống hệt. Trang này giờ chỉ còn tới được qua đường tìm kiếm hoặc
 * link chia sẻ trực tiếp — cửa sổ hồ sơ không còn nút dẫn sang đây nữa vì bản
 * thân nó đã đủ nội dung (bio, liên kết, ngày tham gia).
 */
@Component({
  selector: 'app-profile-page',
  imports: [
    RouterLink,
    AvatarComponent,
    PresenceDotComponent,
    ProfileSearchComponent,
    ProfileModalComponent,
    EmptyFieldComponent,
    TranslatePipe,
  ],
  templateUrl: './profile.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ProfileApiService);
  private readonly cards = inject(ProfileCardService);
  private readonly lookup = inject(ProfileLookupService);

  protected readonly profile = signal<Profile | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly copied = signal(false);

  protected readonly name = computed(() => {
    const profile = this.profile();
    return profile ? profileDisplayName(profile) : '';
  });

  protected readonly bannerColor = computed(() => {
    const person = this.profile();
    return person ? bannerFallback(person.username, person.accentColor) : '#1a1a1a';
  });

  /** Cho aria-expanded của nút avatar. */
  protected readonly cardOpen = computed(() => {
    const username = this.profile()?.username;
    return !!username && this.cards.request()?.member.username === username;
  });

  /** "Tháng 8, 2026" — đúng định dạng ProfileModalComponent dùng cho "Thành viên từ". */
  protected readonly joined = computed(() => {
    const createdAt = this.profile()?.createdAt;
    if (!createdAt) {
      return '—';
    }
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime())
      ? '—'
      : `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('username') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((username) => void this.load(username));
  }

  protected prettyUrl(url: string): string {
    return url.replace(/^https:\/\//, '').replace(/\/$/, '');
  }

  protected linkIconPath(url: string): string {
    return LINK_ICONS[detectLinkIcon(url)];
  }

  protected copyLink(): void {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    void navigator.clipboard.writeText(url);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  /**
   * Bấm avatar mở cửa sổ hồ sơ ở giữa màn hình — đúng cửa sổ mà avatar ở thanh
   * dưới đáy và trong khung chat mở ra, để bấm avatar ở đâu cũng ra một thứ.
   */
  protected openCard(event: Event): void {
    const person = this.profile();
    if (!person) {
      return;
    }
    this.cards.openModal(
      profileAsMember(person.username, this.name()),
      event.currentTarget as HTMLElement,
    );
  }

  private async load(username: string): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const person = await this.api.getByUsername(username);
      this.profile.set(person);
      // Cửa sổ hồ sơ tra lại theo username; đưa sẵn kết quả vào để lúc bấm
      // avatar nó mở ra có nội dung ngay, không gọi API lần hai cho cùng người.
      this.lookup.prime(person);
    } catch (error) {
      this.profile.set(null);
      this.errorMessage.set(toProfileErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}

