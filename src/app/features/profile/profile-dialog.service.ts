import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import type { PublicProfile } from '../../../shared';
import { ProfileModal, type ProfileModalData } from './components/profile-modal/profile-modal';

/**
 * Mở hồ sơ ai đó ở giữa màn hình.
 *
 * Gói cấu hình dialog vào một chỗ để mọi nơi bấm avatar đều ra đúng một kiểu
 * cửa sổ — nếu để từng nơi tự gọi `dialog.open` thì chỉ vài tuần là mỗi chỗ một
 * kích thước, một kiểu bo góc.
 */
@Injectable({ providedIn: 'root' })
export class ProfileDialogService {
  private readonly dialog = inject(MatDialog);

  /**
   * `profile` là tuỳ chọn: nơi nào đã tải sẵn hồ sơ thì truyền vào để cửa sổ mở
   * ra có nội dung ngay, không phải chờ thêm một vòng gọi API cho cùng một người.
   */
  open(username: string, profile?: PublicProfile): void {
    this.dialog.open<ProfileModal, ProfileModalData>(ProfileModal, {
      data: { username, profile },
      ariaLabel: `Hồ sơ của ${profile?.displayName ?? username}`,
      autoFocus: 'dialog',
      maxHeight: 'calc(100vh - 2rem)',
      maxWidth: '36rem',
      panelClass: 'nexus-profile-dialog',
      restoreFocus: true,
      width: 'calc(100vw - 2rem)',
    });
  }
}
