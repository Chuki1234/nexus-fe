import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { ThemeMode } from '../../../../core/theme/theme.service';

export type FriendsTab = 'online' | 'all' | 'pending' | 'add';
export type { ThemeMode } from '../../../../core/theme/theme.service';

const TABS: { id: FriendsTab; label: string }[] = [
  { id: 'online', label: 'Trực tuyến' },
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ duyệt' },
  { id: 'add', label: 'Thêm bạn' },
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
  readonly theme = model.required<ThemeMode>();
  readonly canAddFriend = input<boolean>(false);
  readonly activityOpen = input<boolean>(false);
  readonly atmosphereOpen = input<boolean>(false);
  readonly demoEnabled = input<boolean>(false);

  readonly toggleActivity = output<void>();
  readonly toggleAtmosphere = output<void>();
  readonly toggleDemo = output<void>();

  protected readonly tabs = TABS;

  protected toggleTheme(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }
}
