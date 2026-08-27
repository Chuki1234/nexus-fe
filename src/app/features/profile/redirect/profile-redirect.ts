import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileDialogService } from '../profile-dialog.service';

/**
 * Điểm đến cho link `/u/:username` (chia sẻ / sao chép) sau khi TRANG hồ sơ riêng
 * bị bỏ hẳn: đưa người dùng về dashboard rồi mở hồ sơ dạng DIALOG.
 *
 * Phải điều hướng về dashboard TRƯỚC rồi mới mở dialog — `MatDialog` mặc định
 * `closeOnNavigation = true`, nên mở dialog trước rồi điều hướng sẽ bị đóng ngay.
 */
@Component({
  selector: 'app-profile-redirect',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-redirect.html',
  styleUrl: './profile-redirect.css',
})
export class ProfileRedirect implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly profileDialog = inject(ProfileDialogService);

  async ngOnInit(): Promise<void> {
    const username = this.route.snapshot.paramMap.get('username');
    await this.router.navigateByUrl('/channels/@me');
    if (username) {
      this.profileDialog.open(username);
    }
  }
}
