import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { ProfilesApiService } from '../../../../core/api/profiles-api.service';
import { ProfileDialogService } from '../../profile-dialog.service';
import type { ProfileSummary } from '../../../../../shared';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { SearchField } from '../../../../shared/ui/search-field/search-field';

/** Dưới 2 ký tự thì mọi người đều khớp — kết quả vô nghĩa mà vẫn tốn một request. */
const MIN_QUERY_LENGTH = 2;

/**
 * Tìm người theo tên đăng nhập hoặc tên hiển thị, bấm để sang hồ sơ của họ.
 *
 * Có `debounce`: gõ "maitran" mà không chờ là bắn bảy request, sáu cái đầu vừa
 * về đã lỗi thời. Chờ 250ms sau nhịp gõ cuối rồi mới hỏi.
 */
@Component({
  selector: 'app-profile-search',
  imports: [Avatar, SearchField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block' },
  templateUrl: './profile-search.html',
  styleUrl: './profile-search.css',
})
export class ProfileSearch {
  private readonly api = inject(ProfilesApiService);
  private readonly profileDialog = inject(ProfileDialogService);

  protected readonly query = signal('');
  protected readonly results = signal<ProfileSummary[]>([]);
  protected readonly searching = signal(false);
  /** Đã tìm xong ít nhất một lần — dùng để phân biệt "chưa gõ" với "không ai khớp". */
  protected readonly searched = signal(false);

  private readonly debounced = toSignal(
    toObservable(this.query).pipe(
      map((value) => value.trim()),
      debounceTime(250),
      distinctUntilChanged(),
      takeUntilDestroyed(),
    ),
    { initialValue: '' },
  );

  constructor() {
    effect(() => {
      const term = this.debounced();
      if (term.length < MIN_QUERY_LENGTH) {
        this.results.set([]);
        this.searched.set(false);
        return;
      }
      void this.run(term);
    });
  }

  protected open(username: string): void {
    this.query.set('');
    this.results.set([]);
    this.searched.set(false);
    this.profileDialog.open(username);
  }

  protected nameOf(person: ProfileSummary): string {
    return person.displayName?.trim() || person.username;
  }

  private async run(term: string): Promise<void> {
    this.searching.set(true);
    try {
      const found = await this.api.search(term);
      // Bỏ kết quả cũ nếu người dùng đã gõ tiếp trong lúc chờ mạng — nếu không,
      // request chậm về sau sẽ ghi đè kết quả của từ khoá mới hơn.
      if (this.debounced() === term) {
        this.results.set(found);
        this.searched.set(true);
      }
    } catch {
      this.results.set([]);
      this.searched.set(true);
    } finally {
      this.searching.set(false);
    }
  }
}
