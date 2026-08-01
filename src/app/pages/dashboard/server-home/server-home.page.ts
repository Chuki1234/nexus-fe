import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../../ui/empty-state/empty-state';

/**
 * `/channels/:serverId` — đã chọn server nhưng chưa chọn kênh.
 *
 * Xảy ra khi người dùng gõ thẳng URL, hoặc khi server không có kênh nào. Cột 2
 * vẫn hiện danh sách kênh bình thường, chỉ khu nội dung là rỗng.
 */
@Component({
  selector: 'app-server-home-page',
  imports: [EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
  templateUrl: './server-home.page.html',
  styleUrl: './server-home.page.css',
})
export class ServerHomePage {}
