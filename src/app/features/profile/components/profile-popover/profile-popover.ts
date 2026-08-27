import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { bannerColorFor, profileDisplayName, type PublicProfile } from '../../../../../shared';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { OpenDm } from '../../open-dm';
import { ProfileDialogService } from '../../profile-dialog.service';
import { linkIconFor } from '../link-icon';

/**
 * Thẻ hồ sơ NHỎ, nổi đè lên giao diện — bản rút gọn của trang hồ sơ đầy đủ.
 *
 * Khác `ProfileCard` ở câu hỏi mà nó trả lời: thẻ nhỏ này trả lời "người này là
 * ai?" ngay giữa lúc đang đọc chat, nên phải gọn và neo sát avatar vừa bấm.
 * Thẻ đầy đủ trả lời "hồ sơ trông ra sao?" — người dùng dừng hẳn lại để xem nên
 * nó chiếm chỗ và bày được nhiều thứ hơn.
 *
 * Quan trọng: nổi ĐÈ LÊN chứ không điều hướng đi. Điều hướng sang trang riêng
 * thì khung chat phía sau biến mất, mà chính cái nền phía sau mới làm cho hồ sơ
 * trông như đang nổi lên trên cuộc trò chuyện.
 */
@Component({
  selector: 'app-profile-popover',
  imports: [Avatar, MatIconModule],
  providers: [OpenDm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-80 overflow-hidden rounded-lg border border-hairline bg-surface shadow-modal' },
  templateUrl: './profile-popover.html',
  styleUrl: './profile-popover.css',
})
export class ProfilePopover {
  readonly profile = input.required<PublicProfile>();

  /**
   * Báo cho nơi mở thẻ này biết cần đóng nó lại.
   *
   * Thẻ nổi được gắn bằng CDK overlay ở `ProfileTrigger`, không tự đóng được;
   * khi bấm "Xem hồ sơ đầy đủ" mở cửa sổ hồ sơ, phải phát tín hiệu để overlay
   * đóng — không thì thẻ nhỏ còn kẹt lại sau lớp phủ của dialog.
   */
  readonly close = output<void>();

  private readonly profileDialog = inject(ProfileDialogService);

  protected readonly name = computed(() => profileDisplayName(this.profile()));

  /** Mở hồ sơ đầy đủ dạng cửa sổ nổi (không điều hướng sang trang riêng). */
  protected openFull(): void {
    const person = this.profile();
    this.profileDialog.open(person.username, person);
    this.close.emit();
  }

  protected readonly bannerColor = computed(() => {
    const person = this.profile();
    return bannerColorFor(person.username, person.accentColor);
  });

  protected readonly joined = computed(() => {
    const date = new Date(this.profile().createdAt);
    return Number.isNaN(date.getTime())
      ? '—'
      : `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  });

  protected iconFor(url: string): string {
    return linkIconFor(url);
  }

  private readonly dm = inject(OpenDm);
  protected readonly openingDm = this.dm.opening;
  protected readonly dmError = this.dm.errorMessage;

  protected openDm(): void {
    void this.dm.open(this.profile().id);
  }
}
