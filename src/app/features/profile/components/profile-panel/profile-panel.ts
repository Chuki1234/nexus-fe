import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { bannerColorFor, profileDisplayName } from '../../../../../shared';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { ProfileLookup } from '../../profile-lookup';
import { ProfileDialogService } from '../../profile-dialog.service';
import { linkIconFor } from '../link-icon';

/**
 * Hồ sơ hiển thị cố định ở cột phải khi đang nhắn tin với ai đó.
 *
 * Khác `ProfilePopover` (nổi đè lên, mở ra rồi đóng) ở chỗ nó ở LẠI trong suốt
 * cuộc trò chuyện — nên bố cục xếp dọc trong cột hẹp thay vì thẻ vuông, và
 * không có nút hành động chiếm chỗ.
 *
 * Lấy hồ sơ qua `ProfileLookup` (có nhớ) chứ không tự gọi API: avatar trong
 * khung chat cũng tra đúng người này, dùng chung một bản để hai chỗ không lệch
 * nhau và không gọi mạng hai lần.
 */
@Component({
  selector: 'app-profile-panel',
  imports: [Avatar, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './profile-panel.html',
  styleUrl: './profile-panel.css',
})
export class ProfilePanel {
  /** Username hồ sơ thật. `null` với nhân vật demo hoặc bot — không có gì để tra. */
  readonly username = input.required<string | null>();

  /**
   * Tên và trạng thái lấy từ chính cuộc trò chuyện.
   *
   * Có sẵn ngay từ lúc mở, nên panel vẽ được liền thay vì đợi mạng; và khi người
   * bên kia không có hồ sơ công khai thì đây là tất cả những gì hiển thị được —
   * vẫn hơn một cột trống.
   */
  readonly fallbackName = input('');
  readonly fallbackStatus = input<string | null>(null);

  private readonly lookup = inject(ProfileLookup);
  private readonly profileDialog = inject(ProfileDialogService);

  protected readonly profile = computed(() => {
    const key = this.username();
    return key ? this.lookup.profileFor(key)() : null;
  });

  /** Mở hồ sơ đầy đủ dạng cửa sổ nổi thay vì điều hướng sang trang `/u/:username`. */
  protected openFull(): void {
    const person = this.profile();
    if (person) this.profileDialog.open(person.username, person);
  }

  /** Chỉ chờ khi thật sự có gì để chờ. */
  protected readonly loading = computed(() => {
    const key = this.username();
    return key ? this.lookup.statusFor(key)() === 'loading' : false;
  });

  protected readonly name = computed(() => {
    const person = this.profile();
    return person ? profileDisplayName(person) : this.fallbackName();
  });

  protected readonly status = computed(
    () => this.profile()?.statusMessage ?? this.fallbackStatus(),
  );

  protected readonly bannerColor = computed(() => {
    const person = this.profile();
    return person
      ? bannerColorFor(person.username, person.accentColor)
      : bannerColorFor(this.fallbackName(), null);
  });

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

  protected iconFor(url: string): string {
    return linkIconFor(url);
  }
}
