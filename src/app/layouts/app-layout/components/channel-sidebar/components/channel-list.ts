import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ShellData } from '../../../../../core/api/shell-data';
import { SectionLabel } from '../../../../../shared/ui/section-label/section-label';
import { UnreadBadge } from '../../../../../shared/ui/unread-badge/unread-badge';

/** Nhãn nhóm theo loại kênh. Thứ tự trong mảng là thứ tự hiển thị. */
const GROUPS = [
  { type: 'text' as const, label: 'Kênh chữ', icon: 'tag' },
  { type: 'forum' as const, label: 'Kênh bài đăng', icon: 'forum' },
  { type: 'voice' as const, label: 'Kênh thoại', icon: 'volume_up' },
];

/** Danh sách kênh của một server — nội dung cột 2 khi đang mở server. */
@Component({
  selector: 'app-channel-list',
  imports: [MatIconModule, MatListModule, RouterLink, RouterLinkActive, SectionLabel, UnreadBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './channel-list.html',
  styleUrl: './channel-list.css',
})
export class ChannelList {
  private readonly shell = inject(ShellData);

  readonly serverId = input.required<string>();

  /** Bỏ nhóm rỗng để không hiện tiêu đề "Kênh thoại" trên một danh sách trống. */
  protected readonly groups = computed(() => {
    const channels = this.shell.channelsOf(this.serverId());
    return GROUPS.map((group) => ({
      ...group,
      channels: channels.filter((channel) => channel.type === group.type),
    })).filter((group) => group.channels.length > 0);
  });
}
