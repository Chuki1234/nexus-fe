import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { PresenceStatus } from '../../../../../shared';
import { Avatar } from '../../../../shared/ui/avatar/avatar';
import { ProfileLookup } from '../../profile-lookup';
import { ProfileTrigger } from '../../profile-trigger';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Avatar của một người, TỰ tra ảnh thật theo username.
 *
 * Trước đây mỗi nơi tự dựng `<app-avatar [name]="…">` mà không có `src`, nên
 * chat và danh sách chỉ hiện chữ cái trong khi cột hồ sơ bên phải lại hiện ảnh
 * thật — cùng một người, hai bộ mặt trên cùng màn hình.
 *
 * `Avatar` ở `shared/ui/` cố ý không biết Nexus là gì (nó chỉ nhận `src`), nên
 * phần "tra ảnh theo username" thuộc về feature Profile chứ không nhét vào đó.
 */
@Component({
  selector: 'app-profile-avatar',
  imports: [Avatar, ProfileTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  templateUrl: './profile-avatar.html',
  styleUrl: './profile-avatar.css',
})
export class ProfileAvatar {
  readonly username = input.required<string>();
  /** Tên hiển thị dùng cho chữ cái dự phòng và nhãn trợ năng. */
  readonly name = input.required<string>();
  readonly size = input<AvatarSize>('md');
  readonly presence = input<PresenceStatus | null>(null);
  readonly ring = input<'canvas' | 'surface'>('surface');
  /** Tắt ở những chỗ avatar chỉ để trang trí, ví dụ ảnh mở đầu cuộc trò chuyện. */
  readonly clickable = input(true);

  private readonly lookup = inject(ProfileLookup);

  private readonly profile = computed(() => this.lookup.profileFor(this.username())());

  protected readonly avatarUrl = computed(() => this.profile()?.avatarUrl ?? null);
}
