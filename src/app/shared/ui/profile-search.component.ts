import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { ProfileApiService } from '../../core/profile/profile-api.service';
import { profileDisplayName, ProfileSummary } from '../../core/profile/profile.models';
import { AvatarComponent } from './avatar.component';

/** Dưới ngưỡng này thì chưa gọi API — khớp `SEARCH_MIN_LENGTH` bên backend. */
const MIN_QUERY_LENGTH = 2;

/**
 * Ô tìm người dùng để mở trang hồ sơ của họ.
 *
 * Cố tình không dựng combobox/listbox ARIA: kết quả ở đây là các liên kết điều
 * hướng chứ không phải lựa chọn điền ngược vào ô, nên một danh sách link thường
 * vừa đúng ngữ nghĩa vừa ít chỗ sai hơn hẳn combobox tự chế.
 */
@Component({
  selector: 'app-profile-search',
  imports: [ReactiveFormsModule, RouterLink, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'dismiss()' },
  template: `
    <div class="relative">
      <label for="profile-search" class="sr-only">Tìm người dùng</label>
      <input
        id="profile-search"
        type="search"
        [formControl]="query"
        placeholder="Tìm theo tên đăng nhập…"
        autocomplete="off"
        class="w-full rounded-sm border border-hairline-strong bg-canvas-soft px-4 py-2 text-body-sm text-ink placeholder:text-mute focus:border-primary"
      />

      @if (open()) {
        <div
          class="absolute z-10 mt-2 w-full overflow-hidden rounded-md border border-hairline bg-canvas shadow-modal"
        >
          @if (searching()) {
            <p class="px-4 py-3 text-body-sm text-mute">Đang tìm…</p>
          } @else if (results().length === 0) {
            <p class="px-4 py-3 text-body-sm text-mute">Không có ai khớp từ khoá này.</p>
          } @else {
            <ul>
              @for (person of results(); track person.id) {
                <li class="border-b border-hairline last:border-b-0">
                  <a
                    [routerLink]="['/u', person.username]"
                    (click)="dismiss()"
                    class="flex items-center gap-3 px-4 py-3 hover:bg-canvas-soft"
                  >
                    <app-avatar [src]="person.avatarUrl" [name]="nameOf(person)" size="sm" />
                    <span class="min-w-0">
                      <span class="block truncate text-body-sm-strong text-ink">
                        {{ nameOf(person) }}
                      </span>
                      <span class="block truncate text-caption text-mute">
                        &commat;{{ person.username }}
                      </span>
                    </span>
                  </a>
                </li>
              }
            </ul>
          }
        </div>
      }

      <p aria-live="polite" class="sr-only">{{ statusText() }}</p>
    </div>
  `,
})
export class ProfileSearchComponent {
  private readonly api = inject(ProfileApiService);

  protected readonly query = new FormControl('', { nonNullable: true });
  protected readonly results = signal<ProfileSummary[]>([]);
  protected readonly searching = signal(false);
  protected readonly open = signal(false);

  protected readonly statusText = computed(() => {
    if (!this.open()) {
      return '';
    }
    if (this.searching()) {
      return 'Đang tìm người dùng.';
    }
    const count = this.results().length;
    return count === 0 ? 'Không có kết quả.' : `${count} kết quả.`;
  });

  /** Từ khoá của lần gọi API mới nhất — dùng để bỏ qua phản hồi đã lỗi thời. */
  private lastQuery = '';

  constructor() {
    this.query.valueChanges
      .pipe(
        map((value) => value.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((value) => void this.run(value));
  }

  protected nameOf(person: ProfileSummary): string {
    return profileDisplayName(person);
  }

  /** Đóng bảng kết quả: sau khi chọn ai đó, hoặc khi bấm Esc. */
  protected dismiss(): void {
    this.open.set(false);
    this.results.set([]);
    this.lastQuery = '';
    this.query.setValue('', { emitEvent: false });
  }

  private async run(value: string): Promise<void> {
    if (value.length < MIN_QUERY_LENGTH) {
      this.open.set(false);
      this.results.set([]);
      return;
    }

    this.lastQuery = value;
    this.open.set(true);
    this.searching.set(true);
    try {
      const found = await this.api.search(value);
      // Người dùng gõ tiếp trong lúc chờ: phản hồi này đã cũ, bỏ đi.
      if (this.lastQuery !== value) {
        return;
      }
      this.results.set(found);
    } catch {
      // Tìm kiếm hỏng không đáng dựng một khối lỗi giữa giao diện — coi như
      // không có kết quả, người dùng gõ lại là xong.
      if (this.lastQuery === value) {
        this.results.set([]);
      }
    } finally {
      if (this.lastQuery === value) {
        this.searching.set(false);
      }
    }
  }
}
