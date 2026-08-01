import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ShellData } from '../../../core/api/shell-data';
import { EmptyState } from '../../../ui/empty-state/empty-state';
import { SearchField } from '../../../ui/search-field/search-field';
import { SectionLabel } from '../../../ui/section-label/section-label';
import { FriendRow } from './components/friend-row';
import { FriendsToolbar, type FriendsTab } from './components/friends-toolbar';

/**
 * Trang đích của khu tin nhắn trực tiếp — `/channels/@me`.
 *
 * Chỉ lắp ráp và giữ trạng thái lọc; phần hiển thị nằm ở `components/`.
 */
@Component({
  selector: 'app-friends-page',
  imports: [EmptyState, FriendRow, FriendsToolbar, SearchField, SectionLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
  templateUrl: './friends.page.html',
  styleUrl: './friends.page.css',
})
export class FriendsPage {
  private readonly shell = inject(ShellData);

  protected readonly tab = signal<FriendsTab>('all');
  protected readonly query = signal('');

  protected readonly visible = computed(() => {
    const needle = this.query().trim().toLowerCase();
    return this.shell
      .conversations()
      .filter((person) => this.tab() === 'all' || person.presence !== 'offline')
      .filter((person) => !needle || person.name.toLowerCase().includes(needle));
  });

  protected readonly sectionLabel = computed(
    () => `${this.tab() === 'online' ? 'Trực tuyến' : 'Tất cả bạn bè'} — ${this.visible().length}`,
  );
}
