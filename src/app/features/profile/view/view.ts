import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { ProfilesApiService } from '../../../core/api/profiles-api.service';
import { formatApiError } from '../../../core/api/servers-api.service';
import type { PublicProfile } from '../../../../shared';
import { ProfileCard } from '../components/profile-card/profile-card';
import { ProfileSearch } from '../components/profile-search/profile-search';
import { ProfileWidgets } from '../components/profile-widgets/profile-widgets';
import { ProfileDialogService } from '../profile-dialog.service';
import { ProfileStore } from '../profile-store';

/**
 * Trang hồ sơ công khai tại `/u/:username`.
 *
 * Tới được bằng link chia sẻ hoặc ô tìm kiếm. Khác cửa sổ hồ sơ nổi ở chỗ có
 * địa chỉ riêng để gửi cho người khác — nội dung bên trong thì dùng chung đúng
 * một `ProfileCard` để hai chỗ không trôi khỏi nhau.
 */
@Component({
  selector: 'app-profile-view',
  imports: [ProfileCard, ProfileSearch, ProfileWidgets, MatIconModule, MatTooltipModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './view.html',
  styleUrl: './view.css',
})
export class ProfileViewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ProfilesApiService);
  private readonly profileDialog = inject(ProfileDialogService);
  private readonly store = inject(ProfileStore);

  /** Kết quả tải theo `username` trên URL — xem `profile` bên dưới để biết vì sao không đọc thẳng cái này. */
  private readonly fetchedProfile = signal<PublicProfile | null>(null);

  /**
   * Khi đang xem hồ sơ CHÍNH MÌNH, ưu tiên đọc từ `ProfileStore` thay vì giữ
   * mãi kết quả tải một lần lúc vào trang.
   *
   * Không có dòng này thì mở `/u/<username của mình>`, rồi sửa hồ sơ trong Cài
   * đặt (đổi ảnh, thêm trò chơi...) — trang này vẫn đứng yên với dữ liệu cũ vì
   * không có gì báo nó tải lại. `ProfileStore` thì luôn đúng ngay khi Cài đặt
   * lưu xong, nên "nối" vào đó là cách rẻ nhất để trang luôn khớp thực tế.
   */
  protected readonly profile = computed<PublicProfile | null>(() => {
    const fetched = this.fetchedProfile();
    const own = this.store.profile();
    return fetched?.isSelf && own ? own : fetched;
  });

  /**
   * Lọc sẵn trò chơi theo từng widget.
   *
   * Lọc ở đây chứ không trong template: `@for` gọi hàm lọc là chạy lại mỗi vòng
   * kiểm tra thay đổi, còn `computed` chỉ tính lại khi hồ sơ thật sự đổi.
   */
  private readonly games = computed(() => this.profile()?.games ?? []);
  protected readonly rotatingGames = computed(() =>
    this.games().filter((game) => game.kind === 'rotation'),
  );
  protected readonly favoriteGame = computed(
    () => this.games().find((game) => game.kind === 'favorite') ?? null,
  );
  protected readonly likedGames = computed(() =>
    this.games().filter((game) => game.kind === 'like'),
  );
  protected readonly wishlistGames = computed(() =>
    this.games().filter((game) => game.kind === 'wishlist'),
  );
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly copied = signal(false);

  constructor() {
    // Chưa chắc `isSelf` cho tới khi tải xong ở `load()`, nên nạp song song —
    // hồ sơ này CÓ THỂ là của người khác, lúc đó `profile` ở trên bỏ qua kết
    // quả tải này (xem điều kiện `fetched?.isSelf`).
    void this.store.ensureLoaded();

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
      this.fetchedProfile.set(await this.api.getByUsername(username));
    } catch (error) {
      this.fetchedProfile.set(null);
      this.errorMessage.set(formatApiError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
