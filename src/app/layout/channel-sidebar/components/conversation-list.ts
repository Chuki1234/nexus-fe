import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ShellData } from '../../../core/api/shell-data';
import { Avatar } from '../../../ui/avatar/avatar';
import { SectionLabel } from '../../../ui/section-label/section-label';

/**
 * Danh sách tin nhắn riêng — nội dung cột 2 khi ở khu `/channels/@me`.
 *
 * Không có "Nitro / Cửa hàng / Nhiệm Vụ" như Discord: đó là tính năng thương mại,
 * Nexus không có gói trả phí lẫn cửa hàng.
 */
@Component({
  selector: 'app-conversation-list',
  imports: [
    Avatar,
    MatIconModule,
    MatListModule,
    MatTooltipModule,
    RouterLink,
    RouterLinkActive,
    SectionLabel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './conversation-list.html',
  styleUrl: './conversation-list.css',
})
export class ConversationList {
  private readonly shell = inject(ShellData);

  protected readonly conversations = this.shell.conversations;
}
