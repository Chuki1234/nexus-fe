import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

export type FriendsTab = 'online' | 'all';

const TABS: { id: FriendsTab; label: string }[] = [
  { id: 'online', label: 'Trực tuyến' },
  { id: 'all', label: 'Tất cả' },
];

/**
 * Thanh trên cùng trang Bạn bè: tiêu đề, bộ lọc, nút thêm bạn.
 *
 * Bộ lọc dùng nút + `aria-pressed` chứ không phải `MatTabs`: đây là lọc trên
 * cùng một danh sách, không phải chuyển giữa nhiều panel nội dung. Dùng tablist
 * sẽ báo sai ngữ nghĩa cho trình đọc màn hình.
 */
@Component({
  selector: 'app-friends-toolbar',
  imports: [MatButtonModule, MatIconModule, MatToolbarModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  styleUrl: './friends-toolbar.css',
  templateUrl: './friends-toolbar.html',
})
export class FriendsToolbar {
  readonly tab = model.required<FriendsTab>();
  readonly canAddFriend = input<boolean>(false);

  protected readonly tabs = TABS;
}
