import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ShellData } from '../../../../core/api/shell-data';
import { SearchField } from '../../../../shared/ui/search-field/search-field';
import { UserPanel } from '../user-panel/user-panel';
import { ChannelList } from './components/channel-list';
import { ConversationList } from './components/conversation-list';

/**
 * Cột 2 — cái vỏ: tiêu đề trên, khối người dùng dưới, ở giữa là một trong hai
 * danh sách.
 *
 * Hai chế độ tách thành hai component riêng vì chúng không chia sẻ gì ngoài cái
 * vỏ này: khác nguồn dữ liệu, khác cấu trúc hàng, khác route. Nhét chung một
 * template rồi `@if` sẽ phình ra rất nhanh khi mỗi bên có thêm chi tiết.
 */
@Component({
  selector: 'app-channel-sidebar',
  imports: [ChannelList, ConversationList, SearchField, UserPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full w-60 shrink-0 flex-col bg-surface' },
  styleUrl: './channel-sidebar.css',
  templateUrl: './channel-sidebar.html',
})
export class ChannelSidebar {
  private readonly shell = inject(ShellData);

  /** Rỗng = khu tin nhắn trực tiếp. */
  readonly serverId = input<string | null>(null);

  protected readonly title = computed(() => {
    const id = this.serverId();
    if (!id) {
      return 'Tin nhắn trực tiếp';
    }
    return this.shell.serverOf(id)?.name ?? 'Máy chủ';
  });
}
