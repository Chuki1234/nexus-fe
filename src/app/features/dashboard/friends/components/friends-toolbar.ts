import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { ThemeMode } from '../../../../core/theme/theme.service';

export type FriendsTab = 'online' | 'all' | 'pending' | 'blocked' | 'add';
export type { ThemeMode } from '../../../../core/theme/theme.service';

const TABS: { id: FriendsTab; label: string }[] = [
  { id: 'online', label: 'Trực tuyến' },
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ duyệt' },
  { id: 'blocked', label: 'Đã chặn' },
  { id: 'add', label: 'Thêm bạn' },
];

/**
 * Thanh trên cùng trang Bạn bè: tiêu đề, bộ lọc, nút thêm bạn.
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
  readonly pendingCount = input<number>(0);
  readonly canAddFriend = input<boolean>(false);
  readonly activityOpen = input<boolean>(false);
  readonly showActivityToggle = input<boolean>(false);

  readonly toggleActivity = output<void>();

  protected readonly tabs = TABS;

  protected toggleTheme(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }
}
