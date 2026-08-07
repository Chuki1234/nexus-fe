import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UnreadBadge } from '../../ui/unread-badge/unread-badge';
import { ShellData } from '../../core/api/shell-data';

/**
 * Cột 1 — dải icon server dọc mép trái.
 *
 * Chỉ báo "đang mở" là thanh xanh dán vào mép trái, đúng `ex-app-shell-row` trong
 * design system (`activeIndicator: {colors.primary}`). Cùng với chấm presence,
 * đây là chỗ duy nhất ngoài CTA được dùng màu xanh — chỉ báo trạng thái.
 *
 * Trạng thái active đọc từ `routerLinkActive` chứ không tự tách URL: rail nằm
 * ngoài router-outlet nên không có route params, mà tự parse chuỗi thì sẽ lệch
 * ngay khi cấu trúc route đổi.
 */
@Component({
  selector: 'app-server-rail',
  imports: [MatIconModule, MatTooltipModule, RouterLink, RouterLinkActive, UnreadBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full w-18 shrink-0 flex-col items-center gap-2 bg-canvas py-3' },
  templateUrl: './server-rail.html',
  styleUrl: './server-rail.css',
})
export class ServerRail {
  private readonly shell = inject(ShellData);

  protected readonly servers = this.shell.servers;

  /** Chữ cái đầu làm icon server khi chưa có ảnh. */
  protected initialsOf(name: string): string {
    const trimmed = name.trim();
    return trimmed ? trimmed[0].toUpperCase() : '?';
  }

  /**
   * Mở thẳng kênh đầu tiên thay vì dừng ở trang server rỗng — bấm vào server mà
   * phải bấm thêm một lần nữa mới đọc được gì là thừa một bước.
   */
  protected linkFor(serverId: string): unknown[] {
    const first = this.shell.channelsOf(serverId)[0];
    return first ? ['/channels', serverId, first.id] : ['/channels', serverId];
  }
}
